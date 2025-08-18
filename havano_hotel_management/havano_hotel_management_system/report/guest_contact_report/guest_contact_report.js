// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.query_reports["Guest Contact Report"] = {
	filters: [
		{
			fieldname: "guest_name",
			label: __("Guest Name"),
			fieldtype: "Data",
			wildcard: true
		},
		{
			fieldname: "nationality",
			label: __("Nationality"),
			fieldtype: "Link",
			options: "Country"
		}
	]
};
