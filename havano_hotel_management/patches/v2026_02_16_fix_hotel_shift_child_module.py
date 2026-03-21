# Copyright (c) 2026, Alphazen Technologies
# Fix Hotel Shift child table doctypes that may have wrong module (Core instead of Havano Hotel Management System)

import frappe


def execute():
	"""Fix module for Hotel Shift child table doctypes if they have wrong module."""
	correct_module = "Havano Hotel Management System"
	doctypes_to_fix = ["Hotel Shift Revenue by Center", "Hotel Shift User"]

	for doctype in doctypes_to_fix:
		current_module = frappe.db.get_value("DocType", doctype, "module")
		if current_module and current_module != correct_module:
			frappe.db.set_value("DocType", doctype, "module", correct_module)
			frappe.db.commit()
			frappe.clear_cache(doctype=doctype)
