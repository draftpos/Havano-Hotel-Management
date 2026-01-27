// Custom script for Sales Invoice to handle extra charges from hotel dashboard
frappe.ui.form.on('Sales Invoice', {
	refresh: function(frm) {
		// Check if this is a new document and if we have extra charge data in sessionStorage
		if (frm.is_new() && !frm.doc.customer) {
			const customer = sessionStorage.getItem('extra_charge_customer');
			const check_in = sessionStorage.getItem('extra_charge_check_in');
			const remarks = sessionStorage.getItem('extra_charge_remarks');
			const due_date = sessionStorage.getItem('extra_charge_due_date');
			// const is_extra_charge = sessionStorage.getItem('extra_charge_is_extra_charge');
			
			if (customer) {
				// Set the values
				frm.set_value('customer', customer);
				
				if (check_in) {
					frm.set_value('custom_check_in_reference', check_in);
				}
				
				if (remarks) {
					frm.set_value('remarks', remarks);
				}
				
				if (due_date) {
					frm.set_value('due_date', due_date);
				}
				
				// if (is_extra_charge) {
				// 	frm.set_value('is_extra_charge', 1);
				// }
				
				// Clear sessionStorage after using the values
				sessionStorage.removeItem('extra_charge_customer');
				sessionStorage.removeItem('extra_charge_check_in');
				sessionStorage.removeItem('extra_charge_remarks');
				sessionStorage.removeItem('extra_charge_due_date');
			}
		}
	}
});
