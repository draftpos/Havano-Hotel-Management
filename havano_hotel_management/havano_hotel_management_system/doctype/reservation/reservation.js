// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Reservation", {
    setup: function(frm) {
        frm.set_query("room", () => {
            return {
                filters: {
                    "status": ["not in", ["Occupied"]]
                }
            }
        })
    },
    refresh(frm){
        // calculate_nights(frm);
        if(frm.doc.docstatus == 1){
            frm.add_custom_button(__('Make Payment'), function() {
                create_payment(frm)
            }, __("Actions"))

            frm.add_custom_button(__('Check In'), function() {
                checkin(frm)
            }, __("Actions"))
        }
        
    },
    check_in_date: function(frm) {
        calculate_nights(frm);
    },
    check_out_date: function(frm) {
        calculate_nights(frm);
    },
    nights: function(frm) {
        set_check_out_date(frm)
    }
});

// Function to calculate nights
function calculate_nights(frm) {
     if(frm.doc.check_in_date && frm.doc.check_out_date) {
            // Parse check_in_date as datetime
            let check_in_date = moment(frm.doc.check_in_date);
            let check_out_date = moment(frm.doc.check_out_date);
            
            let nights = check_out_date.startOf('day').diff(check_in_date.startOf('day'), 'days');
            nights = Math.max(1, nights);
            
            frm.set_value("nights", nights);
        }
}

function set_check_out_date(frm) {
    if(frm.doc.check_in_date && frm.doc.nights) {
            let check_in_date = moment(frm.doc.check_in_date);
            let check_out_date = check_in_date.clone().startOf('day').add(frm.doc.nights, 'days');
            frm.set_value("check_out_date", check_out_date.format('YYYY-MM-DD'));
        }
}

function create_payment(frm, amount) {
    // from a sales invoice including fetching the correct accounts and amounts
    // frappe.call({
    //     method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
    //     args: {
    //         dt: "Sales Invoice",
    //         dn: frm.doc.sales_invoice_number,
    //         bank_account: "", // Optional: specify a bank account
    //         bank_amount: amount || 0,   // Optional: specify a custom amount, otherwise full amount will be used
    //         custom_check_in_reference: frm.doc.name
    //     },
    //     callback: function(r) {
    //         if(r.message) {
    //             var doc = frappe.model.sync(r.message)[0];
    //             frappe.set_route("Form", doc.doctype, doc.name);
    //           }
    //     }
    // });
    // Navigate to new Payment Entry form and set party
    frappe.set_route("Form", "Payment Entry", "new").then(() => {
    // Wait for the form to load
    setTimeout(() => {
        // Set party type (Customer, Supplier, Employee, etc.)
        cur_frm.set_value("party_type", "Customer"); // Change to appropriate party type
        
        // Set the party
        cur_frm.set_value("party", frm.doc.guest); // Replace with actual party ID
        
        // Optionally trigger the party field change to update dependent fields
        cur_frm.script_manager.trigger("party");
    }, 1000); // Give some time for the form to load
    });


    // frappe.set_route("Form", "Payment Entry", "new");
}


function checkin(frm){
    frappe.set_route("Form", "Check In", "new").then(() => {
    // Wait for the form to load
    setTimeout(() => {
        // Set party type (Customer, Supplier, Employee, etc.)
        // cur_frm.set_value("re", "Customer"); // Change to appropriate party type
        
        // Set the party
        cur_frm.set_value("reservation", frm.doc.name); // Replace with actual party ID
        
        // Optionally trigger the party field change to update dependent fields
        cur_frm.script_manager.trigger("reservation");
    }, 1000); // Give some time for the form to load
    });
}

