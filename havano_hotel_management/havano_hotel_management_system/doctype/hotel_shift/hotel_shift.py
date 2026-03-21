# Copyright (c) 2026, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, get_datetime, now_datetime


class HotelShift(Document):
	def validate(self):
		if not self.company:
			self.company = frappe.defaults.get_user_default("Company")

	@frappe.whitelist()
	def refresh_shift_data(self):
		"""Refresh room counts, financial totals, and revenue by centers"""
		self._refresh_room_counts()
		self._refresh_financial_totals()
		self._refresh_revenue_by_centers()
		self.save()
		return True

	def _refresh_room_counts(self):
		"""Refresh room status counts based on current Room and Check In data.
		Uses same logic as get_hotel_dashboard_stats - counts all rooms (no company filter)
		so shift numbers match the dashboard display."""
		from frappe.utils import today

		today_date = getdate(today())

		# Get all rooms - no company filter to match dashboard stats
		rooms = frappe.get_all(
			"Room",
			fields=["name", "status", "housekeeping_status", "current_checkin"]
		)

		# Get check-in data for overdue calculation (keyed by check_in name)
		check_ins_query = """
			SELECT name, room, check_out_date
			FROM `tabCheck In`
			WHERE docstatus = 1
			AND actual_checkout_date IS NULL
			AND room IS NOT NULL
		"""
		check_ins = {c.name: c for c in frappe.db.sql(check_ins_query, as_dict=True)}

		available = 0
		occupied = 0
		vacancy = 0
		dirty = 0
		out_of_order = 0
		overdue_out = 0
		reserved = 0

		for room in rooms:
			# Status counts
			if room.status == "Available":
				available += 1
				vacancy += 1
			elif room.status == "Occupied":
				occupied += 1
			elif room.status == "Reserved":
				reserved += 1

			# Housekeeping counts
			if room.housekeeping_status == "Dirty":
				dirty += 1
			elif room.housekeeping_status == "Out of Order":
				out_of_order += 1

			# Overdue out: occupied room with check_out_date < today
			if room.status == "Occupied" and room.current_checkin:
				ci = check_ins.get(room.current_checkin)
				if ci and ci.get("check_out_date"):
					if getdate(ci.check_out_date) < today_date:
						overdue_out += 1

		self.available_rooms = available
		self.rooms_checked_in = occupied
		self.vacancy_rooms = vacancy
		self.dirty_rooms = dirty
		self.out_of_order = out_of_order
		self.overdue_out = overdue_out
		self.reserved = reserved

	def _refresh_financial_totals(self):
		"""Refresh total cash paid, cash outstanding, and total revenue for shift period"""
		if not self.shift_start or not self.shift_end:
			return

		start_dt = get_datetime(self.shift_start)
		end_dt = get_datetime(self.shift_end)
		company = self.company or frappe.defaults.get_user_default("Company")

		# Total Cash Paid: Payment Entry with mode_of_payment = Cash during shift
		cash_modes = frappe.get_all(
			"Mode of Payment",
			filters={"type": "Cash"},
			pluck="name"
		)
		if not cash_modes:
			# Fallback: try by name
			for name in ["Cash", "CASH", "cash"]:
				if frappe.db.exists("Mode of Payment", name):
					cash_modes = [name]
					break

		cash_paid = 0
		if cash_modes:
			placeholders = ", ".join(["%s"] * len(cash_modes))
			company_val = company or ""
			params = list(cash_modes) + [start_dt.date(), end_dt.date(), company_val, company_val, company_val]
			cash_paid_result = frappe.db.sql(f"""
				SELECT COALESCE(SUM(pe.paid_amount), 0)
				FROM `tabPayment Entry` pe
				WHERE pe.docstatus = 1
				AND pe.mode_of_payment IN ({placeholders})
				AND pe.posting_date >= %s
				AND pe.posting_date <= %s
				AND (pe.company = %s OR %s IS NULL OR %s = '')
			""", params)
			cash_paid = flt(cash_paid_result[0][0]) if cash_paid_result else 0

		# Total Revenue: Sales Invoice grand_total during shift
		revenue_result = frappe.db.sql("""
			SELECT COALESCE(SUM(si.grand_total), 0)
			FROM `tabSales Invoice` si
			WHERE si.docstatus = 1
			AND si.posting_date >= %(start)s
			AND si.posting_date <= %(end)s
			AND (si.company = %(company)s OR %(company)s IS NULL OR %(company)s = '')
		""", {
			"start": start_dt.date(),
			"end": end_dt.date(),
			"company": company or ""
		})
		total_revenue = flt(revenue_result[0][0]) if revenue_result else 0

		# Total Cash Outstanding: Sales Invoice outstanding_amount for invoices created during shift
		outstanding_result = frappe.db.sql("""
			SELECT COALESCE(SUM(si.outstanding_amount), 0)
			FROM `tabSales Invoice` si
			WHERE si.docstatus = 1
			AND si.posting_date >= %(start)s
			AND si.posting_date <= %(end)s
			AND si.outstanding_amount > 0
			AND (si.company = %(company)s OR %(company)s IS NULL OR %(company)s = '')
		""", {
			"start": start_dt.date(),
			"end": end_dt.date(),
			"company": company or ""
		})
		total_outstanding = flt(outstanding_result[0][0]) if outstanding_result else 0

		self.total_cash_paid = cash_paid
		self.total_cash_outstanding = total_outstanding
		self.total_revenue = total_revenue

	def _refresh_revenue_by_centers(self):
		"""Refresh revenue by cost center and item group for shift period"""
		if not self.shift_start or not self.shift_end:
			return

		start_dt = get_datetime(self.shift_start)
		end_dt = get_datetime(self.shift_end)
		company = self.company or frappe.defaults.get_user_default("Company")

		# Get revenue by cost center from Sales Invoice Item
		cc_revenue = frappe.db.sql("""
			SELECT
				COALESCE(sii.cost_center, '') as cost_center,
				COALESCE(i.item_group, '') as item_group,
				SUM(sii.amount) as revenue
			FROM `tabSales Invoice Item` sii
			JOIN `tabSales Invoice` si ON si.name = sii.parent
			LEFT JOIN `tabItem` i ON i.name = sii.item_code
			WHERE si.docstatus = 1
			AND si.posting_date >= %(start)s
			AND si.posting_date <= %(end)s
			AND (si.company = %(company)s OR %(company)s IS NULL OR %(company)s = '')
			GROUP BY sii.cost_center, i.item_group
			HAVING revenue > 0
			ORDER BY cost_center, item_group
		""", {
			"start": start_dt.date(),
			"end": end_dt.date(),
			"company": company or ""
		}, as_dict=True)

		self.revenue_by_centers = []
		for row in cc_revenue:
			self.append("revenue_by_centers", {
				"cost_center": row.cost_center or None,
				"item_group": row.item_group or None,
				"revenue_amount": row.revenue
			})
