# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

# import frappe


import frappe
from frappe import _

def execute(filters=None):
    # Define columns for the report
    columns = [
        {"fieldname": "department", "label": "Department", "fieldtype": "Data"},
        {"fieldname": "transaction_count", "label": "Number of Transactions", "fieldtype": "Int"},
        {"fieldname": "total_sales", "label": "Total Sales", "fieldtype": "Currency"}
    ]

    # Fetch data from the database
    data = frappe.db.sql("""
        SELECT 
            si.department,
            COUNT(si.name) AS transaction_count,
            SUM(si.grand_total) AS total_sales
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_pos = 1
        AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
        AND (si.department = %(department)s OR %(department)s = '')
        GROUP BY si.department
    """, filters, as_dict=True)

    # Return columns and data to display in the report
    return columns, data