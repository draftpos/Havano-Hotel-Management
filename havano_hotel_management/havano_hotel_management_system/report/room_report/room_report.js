// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.query_reports["Room Report"] = {
	"filters": [
		{
            "fieldname": "room_type",
            "label": __("Room Type"),
            "fieldtype": "Link",
            "options": "Room Type",
        },
        {
            "fieldname": "date_range",
            "label": __("Date Range"),
            "fieldtype": "DateRange",
            "default": [frappe.datetime.month_start(), frappe.datetime.month_end()]
        }

	]
};
