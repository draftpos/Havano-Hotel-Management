# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _

def execute(filters=None):
    # Define columns for the report
    columns = [
        {"fieldname": "guest_name", "label": "Guest Name", "fieldtype": "Link", "options": "Customer"},
        {"fieldname": "mobile_no", "label": "Contact Number", "fieldtype": "Data"},
        {"fieldname": "email_id", "label": "Email", "fieldtype": "Data"},
        {"fieldname": "nationality", "label": "Nationality", "fieldtype": "Link", "options": "Country"},
        {"fieldname": "guest_type", "label": "Guest Type", "fieldtype": "Select"},
        {"fieldname": "last_stay_date", "label": "Last Stay Date", "fieldtype": "Date"}
    ]

    # Fetch data from the database
    data = frappe.db.sql("""
        SELECT 
            c.name AS guest_name,
            c.mobile_no,
            c.email_id,
            c.nationality,
            c.guest_type,
            MAX(r.check_out_date) AS last_stay_date
        FROM `tabCustomer` c
        LEFT JOIN `tabReservation` r ON c.name = r.guest
        WHERE c.customer_group = 'Guest'
        AND (c.name LIKE %(guest_name)s OR %(guest_name)s = '')
        AND (c.nationality = %(nationality)s OR %(nationality)s = '')
        GROUP BY c.name
    """, filters, as_dict=True)

    # Return columns and data to display in the report
    return columns, data
