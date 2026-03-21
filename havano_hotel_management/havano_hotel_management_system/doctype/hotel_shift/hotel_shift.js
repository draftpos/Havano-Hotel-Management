// Copyright (c) 2026, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Hotel Shift", {
	refresh: function (frm) {
		if (!frm.doc.__islocal) {
			frm.add_custom_button(__("Refresh Shift Data"), function () {
				frappe.call({
					method: "refresh_shift_data",
					doc: frm.doc,
					freeze: true,
					callback: function () {
						frm.reload_doc();
					},
				});
			});
		}

		// On new doc, set shift supervisor and receptionist to current user
		if (frm.doc.__islocal && !frm.doc.shift_supervisor) {
			frm.set_value("shift_supervisor", frappe.session.user);
			frm.set_value("receptionist", frappe.session.user);
			frm.set_value("shift_start", frappe.datetime.now_datetime());
			frm.set_value("status", "Open");
		}
	},
});
