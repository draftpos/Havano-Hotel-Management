# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
import json
from frappe.utils import now_datetime


class Booking(Document):
	pass
	# pass
	# def on_submit(self):
	# 	"""Override the submit method to add custom logic."""
	# 	# super().on_submit()
	# 	create_sales_invoice(doc=self, charge=self.total_charge)

@frappe.whitelist()
def checkout(venue):
    frappe.db.set_value("Venue", venue, "status", "Available")

@frappe.whitelist()
def create_sales_invoice(doc, method=None, charge=0):
    try:
        # If doc is a string (when called via whitelist), convert to JSON
        if isinstance(doc, str):
            doc = frappe.parse_json(doc)
            doc_name = doc.get("name")
        else:
            doc_name = doc.name

        charge = float(charge) if charge else 0
        amount = 0
        if charge > 0:
            amount = charge
        else:
            amount = doc.total_charge
        # Get venue details
        venue = frappe.get_doc("Venue", doc.venue)
        
        # Get income account and cost center
        company = frappe.defaults.get_user_default("company")
        income_account = frappe.get_cached_value("Company", company, "default_income_account")
        cost_center = frappe.get_cached_value("Company", company, "cost_center")
        
        # Get debit account
        debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
        
        # Create sales invoice
        si = frappe.new_doc("Sales Invoice")
        si.customer = doc.guest_name
        si.posting_date = doc.check_in_date
        si.due_date = doc.check_out_time
        si.company = company
        si.debit_to = debit_to
        
        # Add item
        si.append("items", {
            "item_code": venue.venue_item,
            "item_name": venue.venue_item,
            "description": doc.name,
            "qty": 1,
            "rate": amount,
            "amount": amount,
            "income_account": income_account,
            "cost_center": cost_center,
            # "warehouse": frappe.db.get_value("Item Default", 
            #                                 {"parent": "Venue Charge"}, 
            #                                 "default_warehouse")
        })
        
        # Save and submit the invoice
        si.insert(ignore_permissions=True)
        si.submit()
        
        # Update venue status
        frappe.db.set_value("Venue", doc.venue, "status", "Occupied")
        frappe.db.set_value("Venue", doc.venue, "current_booking", doc.name)

        frappe.db.set_value("Venue", doc.venue, "current_guest", doc.guest_name)
        frappe.db.set_value("Venue", doc.venue, "checkout_date", doc.check_out_time)

        frappe.db.set_value("Booking", doc_name, "sales_invoice_number", si.name)
        frappe.db.set_value("Booking", doc_name, "status", "Booked")  # Un-commenting this line to update status
        check_in_doc = frappe.get_doc("Booking", doc_name)

        check_in_doc.save(ignore_permissions=True)

        frappe.db.commit()
        
        frappe.msgprint(_("Sales Invoice {0} created and venue status updated to Occupied").format(
            frappe.bold(si.name)
        ))
        
        return {
            "sales_invoice": si.name,
            "refresh": True
        }   
    except Exception as e:
        frappe.log_error(message=str(e), title="Error Creating Sales Invoice")
        frappe.throw(_("An error occurred while creating the Sales Invoice: {0}").format(str(e)))

@frappe.whitelist()
def check_and_update_bookings():
    """Cron job to check and update bookings with status 'Booked' to 'Checked Out'."""
    try:
        # Get current datetime
        current_time = now_datetime()

        # Fetch all bookings with status 'Booked' and check_out_time less than current time
        bookings = frappe.get_all(
            "Booking",
            filters={
                "status": "Booked",
                "docstatus": 1,  # Only submitted bookings
                "check_out_time": ["<", current_time]
            },
            fields=["name", "venue"]
        )

        for booking in bookings:
            # Update booking status to 'Checked Out'
            frappe.db.set_value("Booking", booking.name, "status", "Checked Out")

            # Update venue status to 'Available'
            frappe.db.set_value("Venue", booking.venue, "status", "Available")
            frappe.db.set_value("Venue", booking.venue, "current_booking", None)
            frappe.db.set_value("Venue", booking.venue, "current_guest", None)
            frappe.db.set_value("Venue", booking.venue, "checkout_date", None)

        # Commit changes to the database
        frappe.db.commit()

        frappe.logger().info(f"{len(bookings)} bookings updated to 'Checked Out' status.")
    except Exception as e:
        frappe.log_error(message=str(e), title="Error in Booking Cron Job")