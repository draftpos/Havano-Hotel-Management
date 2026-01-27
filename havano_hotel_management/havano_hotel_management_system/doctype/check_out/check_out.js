// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Check Out", {
    // setup: function(frm) {
    //     frm.set_query("payment_entry", function() {
    //         return {
    //             "filters": {
    //                 "docstatus": 1
    //             }
    //         };
    //     });
    // },

	refresh(frm) {
        $('.dropdown-menu > li:last-child').hide();
        if(frm.is_new()) get_balance_from_general_ledger(frm);
        // if(!frm.is_new() && frm.doc.docstatus != 1 && !frm.doc.payment_entry){
        //     frm.add_custom_button(__('Make Payment'), function() {
        //         create_payment_for_sales_invoice(frm.doc.sales_invoice_number)
        //     }).css({
        //         'background-color': 'red',
        //         'color': 'white'
        //     });
        // }
        // if(frm.doc.total_charges) {
        //     frm.set_value("balance_due", frm.doc.total_charges - frm.doc.payment_collected);
        // }
        
	},
    // payment_entry: function(frm) {
    //     if(frm.doc.payment_entry) {
    //         frappe.call({
    //             method: "frappe.client.get",
    //             args: {
    //                 doctype: "Payment Entry",
    //                 name: frm.doc.payment_entry
    //             },
    //             callback: function(r) {
    //                 if(r.message) {
    //                     // Set payment method from mode_of_payment
    //                     frm.set_value("payment_method", r.message.mode_of_payment);
                        
    //                     // Set payment_collected from paid_amount
    //                     frm.set_value("payment_collected", r.message.paid_amount);
                        
    //                     // Calculate balance due (payment_collected - amount)
    //                     if(frm.doc.total_charges) {
    //                         frm.set_value("balance_due", frm.doc.total_charges - frm.doc.payment_collected);
    //                     }
    //                 }
    //             }
    //         });
    //     } else {
    //         // Clear fields if payment_entry is removed
    //         frm.set_value("payment_method", "");
    //         frm.set_value("payment_collected", 0);
    //         frm.set_value("balance_due", frm.doc.total_charges);
    //     }
    // },

    // before_submit(frm) {
    //     // First check hotel settings to see if we can permit checkout with due
    //     return new Promise(resolve => {
    //         frappe.db.get_single_value('Hotel Settings', 'permit_checkout_with_due')
    //             .then(permit_checkout_with_due => {
    //                 // If permit_checkout_with_due is enabled, allow submission regardless of payment status
    //                 if (permit_checkout_with_due) {
    //                     resolve(true);
    //                 } else {
    //                     // If not permitted, enforce payment entry and full payment
    //                     if (!frm.doc.payment_entry) {
    //                         frappe.throw(__("Payment Entry is required before submission. Please create payment for this checkout."));
    //                         resolve(false);
    //                     } else if (frm.doc.balance_due < frm.doc.total_charges) {
    //                         frappe.throw(__("Cannot checkout with balance due. Please collect full payment."));
    //                         resolve(false);
    //                     } else {
    //                         resolve(true);
    //                     }
    //                 }
    //             });
    //     });
    // },
    
    on_submit(frm){
        // NOTE: Room and Check In updates are handled in create_and_submit_checkout() API
        // This prevents duplicate updates when checkout is created programmatically
        // Only show success message if checkout was submitted manually (not via API)
        
        // Check if this was created via API by checking if actual_checkout_date is already set on Check In
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Check In",
                name: frm.doc.check_in,
                fieldname: ["actual_checkout_date"]
            },
            callback: function(r) {
                // If actual_checkout_date is not set, this might be a manual submission
                // But we still don't update Room here to avoid conflicts
                // The Room should be updated via the API or manually by user
                if (r.message && !r.message.actual_checkout_date) {
                    // Only update Check In if it wasn't updated by API
                    frappe.call({
                        method: "frappe.client.set_value",
                        args: {
                            doctype: "Check In",
                            name: frm.doc.check_in,
                            fieldname: {
                                "actual_checkout_date": frm.doc.actual_check_out_time,
                                "checkout_status": "Out"
                            }
                        }
                    });
                }
            }
        });
        
        frappe.show_alert({
            message: __("Guest checked out successfully"),
            indicator: 'green'
        });
    }
});

function get_balance_from_general_ledger(frm) {
    // Use default company if not specified in the form
    let company = frm.doc.company || frappe.defaults.get_default("company") || "Havano";
    
    if (!frm.doc.guest) {
        frappe.throw(__("Please select a Guest first"));
        return;
    }
    
    // Get check-in date from the check_in document
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Check In",
            name: frm.doc.check_in
        },
        callback: function(r) {
            if (r.message) {
                let check_in_doc = r.message;
                let from_date = check_in_doc.check_in_date;
                let to_date = check_in_doc.check_out_date;
                
                // Query General Ledger for balance
                frappe.call({
                    method: "frappe.desk.query_report.run",
                    args: {
                        report_name: "General Ledger",
                        filters: {
                            company: company,
                            from_date: frappe.datetime.obj_to_str(frappe.datetime.str_to_obj(from_date)),
                            to_date: frappe.datetime.obj_to_str(frappe.datetime.str_to_obj(to_date ||frappe.datetime.get_today())),
                            party_type: "Customer",
                            party: [frm.doc.guest], // Ensure proper JSON formatting
                            // group_by: "Group by Voucher (Consolidated)"
                        }
                    },
                    callback: function(r) {
                        if (r.message && r.message.result && r.message.result.length > 0) {
                            let result = r.message.result;
                            
                            // Get the last row with a balance (which should be the final balance)
                            let lastRowWithBalance = null;
                            
                            // Loop through the results in reverse to find the last row with a balance
                            for (let i = result.length - 1; i >= 0; i--) {
                                if (result[i].balance !== undefined) {
                                    lastRowWithBalance = result[i];
                                    break;
                                }
                            }
                            
                            if (lastRowWithBalance) {                                
                                // Use the balance from the last row
                                let final_balance = Math.abs(flt(lastRowWithBalance.balance));
                                
                                // Set the balance_due field
                                frm.set_value("balance_due", final_balance);
                                frm.refresh_field("balance_due");
                                frappe.show_alert({
                                    message: __("Balance updated from General Ledger"),
                                    indicator: 'green'
                                });
                            } else {
                                frappe.show_alert({
                                    message: __("No balance found in General Ledger entries"),
                                    indicator: 'orange'
                                });
                                frm.set_value("balance_due", 0);
                            }
                        } else {
                            frappe.show_alert({
                                message: __("No General Ledger entries found for this guest"),
                                indicator: 'orange'
                            });
                            frm.set_value("balance_due", 0);
                        }
                    }
                });
            }
        }
    });
}

function create_payment_for_sales_invoice(sales_invoice_number) {
    // Use the get_payment_entry function which handles all the logic for creating a payment entry
    // from a sales invoice including fetching the correct accounts and amounts
    frappe.call({
        method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
        args: {
            dt: "Sales Invoice",
            dn: sales_invoice_number,
            bank_account: "", // Optional: specify a bank account
            bank_amount: 0    // Optional: specify a custom amount, otherwise full amount will be used
        },
        callback: function(r) {
            if(r.message) {
                var doc = frappe.model.sync(r.message)[0];
                frappe.set_route("Form", doc.doctype, doc.name);
                
                // You can add additional customizations to the payment entry here if needed
                // For example:
                // cur_frm.set_value("reference_no", "Your reference");
                // cur_frm.set_value("reference_date", frappe.datetime.nowdate());
            }
        }
    });
}

