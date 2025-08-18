# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    columns = [
        {"label": "Document Type", "fieldname": "doctype", "fieldtype": "Data", "width": 120},
        {"label": "Document Name", "fieldname": "docname", "fieldtype": "Link", "options": "DocType", "width": 180},
        {"label": "Guest Name", "fieldname": "guest_name", "fieldtype": "Data", "width": 180},
        {"label": "Room", "fieldname": "room", "fieldtype": "Data", "width": 100},
        {"label": "Check In Date", "fieldname": "check_in_date", "fieldtype": "Date", "width": 120},
        {"label": "Check Out Date", "fieldname": "check_out_date", "fieldtype": "Date", "width": 120},
        {"label": "Cost Center", "fieldname": "cost_center", "fieldtype": "Link", "options": "Cost Center", "width": 180},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
    ]

    data = []

    cost_center = filters.get("cost_center") if filters else None

    # Reservation
    reservation_filters = {}
    if cost_center:
        reservation_filters["cost_center"] = cost_center

    reservations = frappe.get_all(
        "Reservation",
        filters=reservation_filters,
        fields=["name", "guest", "room", "check_in_date", "check_out_date", "cost_center"]
    )

    for r in reservations:
        data.append({
            "doctype": "Reservation",
            "docname": r.name,
            "guest_name": r.guest,
            "room": r.room,
            "check_in_date": r.check_in_date,
            "check_out_date": r.check_out_date,
            "cost_center": r.cost_center,
            "status": "",
        })

    # Check In
    checkin_filters = {}
    if cost_center:
        checkin_filters["cost_center"] = cost_center

    checkins = frappe.get_all(
        "Check In",
        filters=checkin_filters,
        fields=["name", "guest_name", "room", "check_in_date", "check_out_date", "cost_center", "sales_invoice_status"]
    )

    for c in checkins:
        data.append({
            "doctype": "Check In",
            "docname": c.name,
            "guest_name": c.guest_name,
            "room": c.room,
            "check_in_date": c.check_in_date,
            "check_out_date": c.check_out_date,
            "cost_center": c.cost_center,
            "status": c.sales_invoice_status,
        })

    return columns, data
