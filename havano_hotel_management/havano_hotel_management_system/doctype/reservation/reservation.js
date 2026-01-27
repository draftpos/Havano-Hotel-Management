// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Reservation", {
    setup: function(frm) {
        frm.set_query("room", () => {
            return {
                filters: {
                    "status": ["not in", ["Occupied", "Reserved"]]
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

function create_payment(frm) {
    // Check if reservation has a sales invoice
    let sales_invoice = frm.doc.sales_invoice_number || null;
    
    let d = new frappe.ui.Dialog({
        title: __('Make Payment'),
        fields: [
            {
                label: __('Sales Invoice'),
                fieldname: 'sales_invoice',
                fieldtype: 'Link',
                options: 'Sales Invoice',
                default: sales_invoice,
                reqd: 0,
                description: __('Optional: Select a sales invoice if payment is against an invoice')
            },
            {
                label: __('Payment Method'),
                fieldname: 'payment_method',
                fieldtype: 'Select',
                options: 'Cash\nCredit Card\nDebit Card\nBank Transfer\nMobile Payment',
                default: "Cash",
                reqd: 1
            },
            {
                label: __('Payment Amount'),
                fieldname: 'amount',
                fieldtype: 'Currency',
                reqd: 1
            },
            {
                label: __('Payment Date'),
                fieldname: 'payment_date',
                fieldtype: 'Date',
                default: frappe.datetime.get_today(),
                reqd: 1
            },
            {
                label: __('Reference Number'),
                fieldname: 'reference_no',
                fieldtype: 'Data',
                default: frm.doc.name
            },
            {
                label: __('Reference Date'),
                fieldname: 'reference_date',
                fieldtype: 'Date',
                default: frappe.datetime.get_today()
            },
            {
                label: __('Remarks'),
                fieldname: 'remarks',
                fieldtype: 'Small Text',
                default: `Payment for Reservation ${frm.doc.name}`
            }
        ],
        primary_action_label: __('Create Payment'),
        primary_action: function(values) {
            frappe.call({
                method: 'havano_hotel_management.api.make_payment_entry_for_reservation',
                args: {
                    reservation: frm.doc.name,
                    sales_invoice: values.sales_invoice,
                    guest: frm.doc.guest,
                    payment_method: values.payment_method,
                    amount: values.amount,
                    payment_date: values.payment_date,
                    reference_no: values.reference_no,
                    reference_date: values.reference_date,
                    remarks: values.remarks
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.show_alert({
                            message: __('Payment Entry {0} created successfully', 
                                ['<a href="/app/payment-entry/' + r.message + '">' + r.message + '</a>']),
                            indicator: 'green'
                        });
                        // Reload to get updated payment information
                        frm.reload_doc();
                    }
                }
            });
            d.hide();
        }
    });
    
    // When sales invoice is selected, set the amount from outstanding amount
    d.fields_dict.sales_invoice.df.onchange = function() {
        const invoice = d.get_value('sales_invoice');
        if (invoice) {
            frappe.db.get_value('Sales Invoice', invoice, 'outstanding_amount', (r) => {
                if (r && r.outstanding_amount) {
                    d.set_value('amount', r.outstanding_amount);
                }
            });
        }
    };
    
    d.show();
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

