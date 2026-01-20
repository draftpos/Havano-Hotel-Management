// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Check In", {
    setup: function(frm) {
        frm.set_query("room", function(doc) {
            if (doc.reservation) {
                return {
                    "filters": {
                        "status": ["!=", "Occupied"]
                    }
                };
            }else{
                return {
                    "filters": {
                        "status": "Available"
                    }
                };
            }     
        });

        frm.set_query("reservation", function() {
            let today = frappe.datetime.get_today();
            return {
                "filters": {
                    "check_in_date": today,
                    "reservation_type": "Room"

                }
            };
        });

    },
    
    nights: function(frm) {
        if(frm.doc.check_in_date && frm.doc.nights) {
            let check_in_date = moment(frm.doc.check_in_date);
            let check_out_date = check_in_date.clone().startOf('day').add(frm.doc.nights, 'days');
            frm.set_value("check_out_date", check_out_date.format('YYYY-MM-DD'));
        }
    },    

    reservation: function(frm) {
        if(frm.doc.reservation) {
            // Get the room value from the reservation
            frappe.db.get_value("Reservation", frm.doc.reservation, "room", function(data) {
                if(data && data.room) {
                    frm.set_value("room", data.room);
                }
            });
        }
    },
    payment_entry: function(frm){
        if(frm.doc.payment_entry){
            frm.set_value("balance_due", frm.doc.total_charge - frm.doc.amount_paid);
        }
    },
    price_list: function(frm) {
        if(frm.doc.price_list && frm.doc.room) {
            // Get the item code from the room
            frappe.db.get_value("Room", frm.doc.room, ["room_item", "price"], function(room_data) {
                if(room_data && room_data.room_item) {
                    // Fetch the price list rate for the room's item
                    frappe.call({
                        method: "frappe.client.get_value",
                        args: {
                            doctype: "Item Price",
                            filters: {
                                item_code: room_data.room_item,
                                price_list: frm.doc.price_list,
                                selling: 1
                            },
                            fieldname: "price_list_rate"
                        },
                        callback: function(r) {
                            if(r.message && r.message.price_list_rate) {
                                // Set the price list rate
                                frm.set_value("price_list_rate", r.message.price_list_rate);
                                
                                // Calculate total charge based on nights and price list rate
                                if(frm.doc.nights) {
                                    let total = r.message.price_list_rate * frm.doc.nights;
                                    frm.set_value("total_charge", total);
                                                                    }
                            } else {
                                // Fallback: use Room.price instead of clearing the rate
                                if (room_data && room_data.price) {
                                    frm.set_value("price_list_rate", room_data.price);
                                    if(frm.doc.nights) {
                                        let total = room_data.price * frm.doc.nights;
                                        frm.set_value("total_charge", total);
                                    }
                                } else {
                                    frappe.msgprint(__("No price found for this room in the selected price list, and no default room price is set. Please select a different price list or update the Room item price."));
                                    frm.set_value("price_list_rate", 0);
                                }
                            }
                        }
                    });
                } else {
                    // If no item is linked, fallback to Room.price
                    if (room_data && room_data.price) {
                        frm.set_value("price_list_rate", room_data.price);
                        if(frm.doc.nights) {
                            let total = room_data.price * frm.doc.nights;
                            frm.set_value("total_charge", total);
                        }
                    } else {
                        frappe.msgprint(__("No item is linked to this room, and no default room price is set. Please link an item to the room or set a default room price."));
                    }
                }
            });
        }
    },
    validate: function(frm) {
        // We need to use a Promise to handle the asynchronous DB call
        if(frm.doc.room && frm.doc.nights) {
            return new Promise(resolve => {
                frappe.db.get_value("Room", frm.doc.room, "price", function(data) {
                    if(data && frm.doc.price_list_rate) {
                        let total = frm.doc.price_list_rate * frm.doc.nights;
                        frm.set_value("total_charge", total);
                        
                        // Now update the balance_due after total_charge is set
                        resolve();
                    }
                    else if(data && data.price) {
                        let total = data.price * frm.doc.nights;
                        frm.set_value("total_charge", total);
                        
                        // Now update the balance_due after total_charge is set
                        resolve();
                    } else {
                        resolve();
                    }
                });
            });
        } 
    },
	refresh(frm) {
        general_ledger(frm);
        
        // Auto-save functionality - set up on refresh
        if (!frm.auto_save_setup) {
            frm.auto_save_setup = true;
            let auto_save_timeout = null;
            let is_auto_saving = false;
            let last_dirty_state = frm.is_dirty();

            // Function to auto-save the document
            function trigger_auto_save() {
                // Clear existing timeout
                if (auto_save_timeout) {
                    clearTimeout(auto_save_timeout);
                }

                // Only auto-save if:
                // 1. Document is not new (has been saved at least once)
                // 2. Document has unsaved changes
                // 3. Not already saving
                if (frm.is_new() || !frm.is_dirty() || is_auto_saving) {
                    return;
                }

                // Debounce: wait 2 seconds after last change before saving
                auto_save_timeout = setTimeout(function() {
                    if (frm.is_dirty() && !frm.is_new() && !is_auto_saving) {
                        is_auto_saving = true;
                        
                        // Show auto-save indicator
                        frappe.show_alert({
                            message: __('Auto-saving...'),
                            indicator: 'blue'
                        }, 2);

                        // Use "Update" for submitted documents, regular save for drafts
                        let save_action = frm.doc.docstatus === 1 ? "Update" : null;
                        
                        // Save the document (works for both draft and submitted documents)
                        frm.save(save_action, function() {
                            is_auto_saving = false;
                            last_dirty_state = frm.is_dirty();
                            frappe.show_alert({
                                message: __('Auto-saved'),
                                indicator: 'green'
                            }, 2);
                        }).catch(function(error) {
                            is_auto_saving = false;
                            // Don't show error alert for auto-save failures to avoid interrupting user
                            console.error('Auto-save failed:', error);
                        });
                    }
                }, 2000); // 2 second delay
            }

            // Monitor form dirty state changes
            let check_dirty_state = setInterval(function() {
                if (frm.is_dirty() !== last_dirty_state) {
                    last_dirty_state = frm.is_dirty();
                    if (last_dirty_state) {
                        trigger_auto_save();
                    }
                }
            }, 500); // Check every 500ms

            // Also listen to field changes by attaching to all input fields
            frm.$wrapper.on('change', 'input, select, textarea', function() {
                trigger_auto_save();
            });

            // Listen to child table changes
            frm.$wrapper.on('grid-row-added grid-row-removed', function() {
                trigger_auto_save();
            });

            // Clean up when form is unloaded
            $(document).on('form-unload', function(e, unload_frm) {
                if (unload_frm && unload_frm.docname === frm.docname && unload_frm.doctype === frm.doctype) {
                    if (auto_save_timeout) {
                        clearTimeout(auto_save_timeout);
                    }
                    if (check_dirty_state) {
                        clearInterval(check_dirty_state);
                    }
                }
            });
        }
        
        // Update checkout status based on actual_checkout_date
        if (frm.doc.actual_checkout_date) {
            frm.set_value("checkout_status", "Out");
        } else if (frm.doc.check_out_date) {
            // Check if overdue
            let today = frappe.datetime.get_today();
            if (frappe.datetime.str_to_obj(frm.doc.check_out_date) < frappe.datetime.str_to_obj(today)) {
                frm.set_value("checkout_status", "Overdue");
            } else {
                frm.set_value("checkout_status", "In");
            }
        } else {
            frm.set_value("checkout_status", "In");
        }
        
        // Recalculate amount_paid and balance_due if document is submitted
        if (frm.doc.docstatus === 1 && frm.doc.name) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Payment Entry",
                    filters: {
                        "check_in_reference": frm.doc.name,
                        "docstatus": 1
                    },
                    fields: ["paid_amount"]
                },
                callback: function(r) {
                    if (r.message) {
                        let total_amount_paid = 0;
                        r.message.forEach(function(pe) {
                            total_amount_paid += parseFloat(pe.paid_amount || 0);
                        });
                        
                        let balance_due = parseFloat(frm.doc.total_charge || 0) - total_amount_paid;
                        
                        if (frm.doc.amount_paid != total_amount_paid || frm.doc.balance_due != balance_due) {
                            frm.set_value("amount_paid", total_amount_paid);
                            frm.set_value("balance_due", balance_due);
                        }
                    }
                }
            });
        }
        
        if(frm.doc.docstatus === 1) {
            frm.set_df_property("nights", "read_only", 1);
            frm.set_df_property("check_out_date", "read_only", true);
            frm.set_df_property("room", "read_only", true);

           
        }
        if(frm.is_new()){
            frm.set_value("check_in_date", frappe.datetime.now_datetime());
            frm.set_value("check_in_by", frappe.session.user_fullname)
        }
        if(frm.doc.docstatus === 1 && !frm.doc.actual_checkout_date) {
            // Show checkout button only if the document is submitted
            frm.add_custom_button(__('Move to Another Room'), function() {
                move_to_another_room(frm)
            }, __("Actions"))

            frm.add_custom_button(__('Check out'), function() {
                checkout(frm)
            }, __("Actions"))

            frm.add_custom_button(__('Extend Stay'), function() {
                extend_checkout_date(frm)
            }, __("Actions"))
        }
        // Show Make Payment button only if status is Unpaid and document is submitted
        if(frm.doc.docstatus == 1 && frm.doc.sales_invoice_status == "UnPaid" && frm.doc.sales_invoice_number) {
            frm.add_custom_button(__('Make Payment'), function() {
                // create_payment_for_sales_invoice(frm)
                make_payment(frm)
                // create_payment_for_sales_invoice(frm, frm.doc.sales_invoice_number)
            }, __("Actions"))
        }
        
        if(frm.doc.docstatus === 1 && frm.doc.sales_invoice_number) {
            update_sales_invoice_payment_status(frm);
            frm.add_custom_button(__('Extra Charges'), function() {
                extra_charges(frm)      
            }, __("Actions"))
            frm.add_custom_button(__('Laundry Services'), function() {
                extra_charges(frm)      
            }, __("Actions"))
        }
        

          
	},
    guest_name: function(frm) {
        if(frm.doc.guest_name) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Check In",
                    filters: [
                        ["guest_name", "=", frm.doc.guest_name],
                        ["docstatus", "=", 1], // Submitted documents
                        ["check_out_date", "=", ""] // No check-out date means not checked out yet
                    ],
                    fields: ["name", "room"]
                },
                callback: function(r) {
                    if(r.message && r.message.length > 0) {
                        // Guest has an existing active check-in
                        let existing = r.message[0];
                        frm.set_value("guest_name", ""); // Clear the guest name field
                        frappe.msgprint(__(`Guest already has an active check-in (${existing.name}) in room ${existing.room}. Please check out the guest first before creating a new check-in.`));
                    }
                }
            });
        }
    },
    room: function(frm) {
        if(frm.doc.room) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Room",
                    filters: { name: frm.doc.room },
                    // include price for fallback rate calculation
                    fieldname: ["status", "room_item", "price"]
                },
                callback: function(r) {
                    if(r.message && r.message.status !== "Available") {
                        frm.set_value("room", "");
                        frappe.msgprint(__("Room {0} is not available. Please select an available room.", [frm.doc.room]));
                    }else {
                        // If price list is selected, fetch price from price list
                        if(frm.doc.price_list && r.message.room_item) {
                            frappe.call({
                                method: "frappe.client.get_value",
                                args: {
                                    doctype: "Item Price",
                                    filters: {
                                        item_code: r.message.room_item,
                                        price_list: frm.doc.price_list,
                                        selling: 1
                                    },
                                    fieldname: "price_list_rate"
                                },
                                callback: function(price_data) {
                                    if(price_data.message && price_data.message.price_list_rate) {
                                        frm.set_value("price_list_rate", price_data.message.price_list_rate);
                                        
                                        // Calculate total charge if nights is set
                                        if(frm.doc.nights) {
                                            let total = price_data.message.price_list_rate * frm.doc.nights;
                                            frm.set_value("total_charge", total);
                                            
                                            // Update balance due
                                        }
                                    } else {
                                        // If no price list rate found, use the default room price
                                        if(r.message.price) {
                                            frm.set_value("price_list_rate", r.message.price);
                                            
                                            if(frm.doc.nights) {
                                                let total = r.message.price * frm.doc.nights;
                                                frm.set_value("total_charge", total);
                                                
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            // Use default room price if no price list is selected
                            if(r.message.price) {
                                frm.set_value("price_list_rate", r.message.price);
                                
                                if(frm.doc.nights) {
                                    let total = r.message.price * frm.doc.nights;
                                    frm.set_value("total_charge", total);
                                    
                                }
                            }
                        }
                    }
                
                }
            });
        }
    },
    actual_checkout_date: function(frm) {
        // Update checkout status when actual_checkout_date changes
        if (frm.doc.actual_checkout_date) {
            frm.set_value("checkout_status", "Out");
        } else {
            // Recalculate status if actual_checkout_date is cleared
            if (frm.doc.check_out_date) {
                let today = frappe.datetime.get_today();
                if (frappe.datetime.str_to_obj(frm.doc.check_out_date) < frappe.datetime.str_to_obj(today)) {
                    frm.set_value("checkout_status", "Overdue");
                } else {
                    frm.set_value("checkout_status", "In");
                }
            } else {
                frm.set_value("checkout_status", "In");
            }
        }
    },
    check_out_date: function(frm) {
        console.log('check_out_date triggered:', frm.doc.check_in_date, frm.doc.check_out_date);
        
        // Calculate nights when check_out_date changes
        if(frm.doc.check_in_date && frm.doc.check_out_date) {
            // Extract just the date portion from check_in_date (datetime field)
            // If check_in_date is "2025-01-01 14:30:00", extract "2025-01-01"
            let check_in_date_str = frm.doc.check_in_date.split(' ')[0];
            
            // Parse both as dates for comparison (both should be date strings now)
            let check_in_date = moment(check_in_date_str, 'YYYY-MM-DD');
            let check_out_date = moment(frm.doc.check_out_date, 'YYYY-MM-DD');
            console.log('Parsed dates:', check_in_date.format('YYYY-MM-DD'), check_out_date.format('YYYY-MM-DD'));
            
            // Calculate the difference in days
            let nights = check_out_date.diff(check_in_date, 'days');
            nights = Math.max(1, nights);
            
            console.log('Calculated nights:', nights);
            frm.set_value("nights", nights);
        }
        
        // Update checkout status when check_out_date changes (only if not checked out)
        if (!frm.doc.actual_checkout_date && frm.doc.check_out_date) {
            let today = frappe.datetime.get_today();
            if (frappe.datetime.str_to_obj(frm.doc.check_out_date) < frappe.datetime.str_to_obj(today)) {
                frm.set_value("checkout_status", "Overdue");
            } else {
                frm.set_value("checkout_status", "In");
            }
        }
    },
    on_submit(frm){
        frm.reload_doc()
        frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Room",
                name: frm.doc.room,
                fieldname: {
                    // "status": "Occupied",
                    "current_checkin": frm.doc.name
                }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.show_alert({
                        message: __("Current Checkin Updated in Room"),
                        indicator: 'green'
                    });
                }
            }
        });
    }
});


async function checkout(frm) {
    // Confirm checkout
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Check Out",
            filters: {
                "check_in": frm.doc.name
            },
            fields: ["name"]
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                frappe.msgprint(__("Check out already exists for this check-in."));
                return;
            }else{
                frappe.confirm(
                    __('Are you sure you want to check out this guest?'),
                    async function() {
                        const dtime = await frappe.db.get_single_value('Hotel Settings', 'default_check_out_time')
                        let checkout_date;
                        if(!dtime){
                            checkout_date = frm.doc.check_out_date;
                        }else{
                            checkout_date = moment(frm.doc.check_out_date+ " " + dtime).format("YYYY-MM-DD HH:mm:ss");
                        }
                   
                        // Set checkout date to today
                        
                        // Update the current check-in document with checkout date
                        

                        // Calculate number of days
                        let check_in_date = moment(frm.doc.check_in_date);
                        let check_out_date = moment(checkout_date);
                        let days = Math.max(1, check_out_date.diff(check_in_date, 'days'));
                        
                        // Get room rate
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Room",
                                filters: { name: frm.doc.room },
                                fieldname: ["price", "room_type"]
                            },
                            callback: function(room_data) {
                                if (room_data.message) {
                                    let room_rate = room_data.message.price;
                                    console.log(room_rate)
                                    let room_type = room_data.message.room_type;
                                    let total_charges = room_rate * days;
                                    
                                    // Create Check Out document
                                    frappe.model.with_doctype("Check Out", function() {
                                        let checkout_doc = frappe.model.get_new_doc("Check Out");
                                        checkout_doc.check_in = frm.doc.name;
                                        checkout_doc.guest = frm.doc.guest_name;
                                        checkout_doc.room = frm.doc.room;
                                        checkout_doc.actual_check_out_time = checkout_date;
                                        checkout_doc.days_stayed = frm.doc.nights;
                                        // checkout_doc.sales_invoice_number = frm.doc.sales_invoice_number;
                                        // checkout_doc.total_charges = total_charges;
                                        // checkout_doc.payment_entry = frm.doc.payment_entry
                                        
                                        frappe.set_route("Form", "Check Out", checkout_doc.name);
                                    });
                                    
                                    // Update room status to Available
                                    
                                }
                            }
                        });
                    }
                );
            }
        }
    })
    
}
function extra_charges(frm) {
    // Create a new Sales Invoice with the guest as customer
    frappe.model.with_doctype("Sales Invoice", function() {
        let sales_invoice = frappe.model.get_new_doc("Sales Invoice");
        
        // Set the customer to the guest name
        sales_invoice.customer = frm.doc.guest_name;
        
        // Set other relevant fields
        sales_invoice.custom_check_in_reference = frm.doc.name;
        sales_invoice.due_date = frappe.datetime.get_today();
        
        // Add a custom field to identify this as an extra charge for the check-in
        sales_invoice.is_extra_charge = 1;
        
        // Set the room information in the remarks
        sales_invoice.remarks = `Extra charges for guest staying in Room: ${frm.doc.room}`;
        
        // Navigate to the Sales Invoice form
        frappe.set_route("Form", "Sales Invoice", sales_invoice.name);
    });
}


function create_payment_for_sales_invoice(frm, sales_invoice_number, amount) {
    // Create payment entry from a sales invoice with check_in_reference pre-filled
    frappe.call({
        method: "havano_hotel_management.api.get_payment_entry_for_check_in",
        args: {
            sales_invoice: sales_invoice_number || frm.doc.sales_invoice_number,
            check_in: frm.doc.name
        },
        callback: function(r) {
            if(r.message) {
                var doc = frappe.model.sync(r.message)[0];
                // Navigate to the Payment Entry form
                frappe.set_route("Form", doc.doctype, doc.name);
            }
        }
    });
}

function update_sales_invoice_payment_status(frm) {
    
    frappe.call({
        method: "havano_hotel_management.api.check_sales_invoices_payment_status",
        args: {
            invoice_name: frm.doc.sales_invoice_number,
            check_in: frm.doc.name
        },
        callback: function(r) {
            if (r.message && r.message.updated) {
                frappe.show_alert({
                    message: __('Sales invoice payment status updated'),
                    indicator: 'green'
                });
                frm.reload_doc();
            }
        }
    });
}

function make_payment(frm){
    let d = new frappe.ui.Dialog({
        title: __('Make Payment'),
        fields: [
            {
                label: __('Sales Invoice'),
                fieldname: 'sales_invoice',
                fieldtype: 'Link',
                options: 'Sales Invoice',
                default: frm.doc.sales_invoice_number,
                reqd: 1,
                read_only: 1
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
                default: frm.doc.total_charge,
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
                fieldtype: 'Small Text'
            }
        ],
        primary_action_label: __('Create Payment'),
        primary_action: function(values) {
            frappe.call({
                method: 'havano_hotel_management.api.make_payment_entry',
                args: {
                    check_in: frm.doc.name,
                    sales_invoice: values.sales_invoice,
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
                        // Reload to get updated amount_paid and balance_due from backend
                        frm.reload_doc();
                    }
                }
            });
            d.hide();
        }
    });
    
    // When sales invoice is selected, set the amount
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

function general_ledger(frm) {
    let $container = frm.get_field('general_ledger').$wrapper;
    $container.empty();
    
    // Check if guest_name exists
    if (!frm.doc.guest_name) {
        $container.html(`
            <div class="text-center text-muted" style="padding: 40px 20px;">
                <i class="fa fa-user-o fa-2x"></i>
                <p style="margin-top: 15px;">No guest selected for this Check In</p>
            </div>
        `);
        return;
    }
    
    // Create a container with proper styling
    let $report_container = $(`
        <div class="general-ledger-container" style="width: 100%; margin-top: 15px; border-radius: 5px; overflow: hidden;">
            <div class="panel panel-default" style="margin-bottom: 0;">
                <div class="panel-heading" style="background-color: #f8f8f8; padding: 10px 15px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                    <h4 class="panel-title" style="margin: 0; font-weight: bold;">Room Folio - General Ledger</h4>
                    <div>
                        <button class="btn btn-xs btn-default refresh-ledger" style="margin-right: 5px;">
                            <i class="fa fa-refresh"></i> Refresh
                        </button>
                        <button class="btn btn-xs btn-default open-in-new-tab">
                            <i class="fa fa-external-link"></i> Open in New Tab
                        </button>
                    </div>
                </div>
                <div class="panel-body" style="padding: 0; height: 600px;">
                    <div class="iframe-container" style="height: 100%; width: 100%; position: relative;"></div>
                </div>
            </div>
        </div>
    `);
    
    $container.append($report_container);
    let $iframe_container = $report_container.find('.iframe-container');
    
    // Function to load the iframe with general ledger data
    function load_general_ledger() {
        // Clear existing iframe
        $iframe_container.empty();
        
        // Get relevant filters for the General Ledger report
        // Only include the essential filters
        let filters = {
            company: frm.doc.company || frappe.defaults.get_default("company"),
            from_date: frappe.datetime.obj_to_str(frappe.datetime.str_to_obj(frm.doc.check_in_date)),
            to_date: frappe.datetime.obj_to_str(frappe.datetime.str_to_obj(frm.doc.check_out_date || frappe.datetime.get_today())),
            party_type: "Customer",
            party: frm.doc.guest_name,
            // Add a parameter to indicate we want to hide the navbar and filters
            hide_navbar: 1,
            // Add run parameter to execute the report immediately
            run: 1,
            // Hide unnecessary filters
            show_cancelled_entries: 0,
            include_dimensions: 0,
            // Add timestamp to prevent caching
            _t: new Date().getTime()
        };
        
        // Construct the URL with filters
        let url = '/app/query-report/General%20Ledger?' + $.param(filters);
        
        // Add a loading indicator
        let $loading = $(`
            <div class="text-center" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
                <p class="text-muted" style="margin-top: 15px;">Loading General Ledger...</p>
            </div>
        `);
        $iframe_container.append($loading);
        
        // Create an iframe to load the report
        let $iframe = $(`<iframe src="${url}" width="100%" height="100%" frameborder="0" id="gl-iframe"></iframe>`);
        $iframe_container.append($iframe);
        
        // When iframe loads, inject CSS to hide the navbar and adjust the layout
        $iframe.on('load', function() {
            $loading.remove();
            
            try {
                // Get the iframe document
                let iframeDoc = this.contentDocument || this.contentWindow.document;
                
                // Create a style element
                let style = iframeDoc.createElement('style');
                style.textContent = `
                    /* Hide the navbar */
                    .navbar, .page-head, .page-breadcrumbs, .datavalue-nav {
                        display: none !important;
                    }
                    
                    /* Adjust the page container to fill the available space */
                    .page-container {
                        margin-top: 0 !important;
                        padding-top: 0 !important;
                    }
                    
                    /* Make the report fill the available space */
                    .layout-main-section {
                        padding-top: 0 !important;
                    }
                    
                    /* Hide any other unnecessary elements */
                    .page-form {
                        display: none !important;
                    }
                    
                    /* Hide filter section */
                    .filter-section {
                        display: none !important;
                    }
                    
                    /* Hide report header */
                    .report-action-buttons {
                        display: none !important;
                    }
                    
                    .container {
                        padding-right: 0px !important;
                        padding-left: 0px !important;
                        width: 100% !important;
                    }
                    
                    /* Ensure the report takes full height */
                    body, html, .page-container, .container {
                        height: 100% !important;
                    }
                    
                    /* Make sure the report content is visible */
                    .report-wrapper {
                        margin-top: 0 !important;
                    }
                    
                    /* Show only the data table */
                    .datatable {
                        margin-top: 0 !important;
                    }
                `;
                
                // Append the style to the iframe document head
                iframeDoc.head.appendChild(style);
                
                // Trigger the run button if the report hasn't loaded automatically
                setTimeout(() => {
                    try {
                        const runButton = iframeDoc.querySelector('.primary-action');
                        if (runButton && !iframeDoc.querySelector('.dt-scrollable')) {
                            runButton.click();
                        }
                    } catch (e) {
                        console.error("Error triggering report run:", e);
                    }
                }, 500);
                
            } catch (e) {
                console.error("Error modifying iframe content:", e);
                // If we can't modify the iframe due to same-origin policy, show a message
                if (e.name === "SecurityError") {
                    $iframe_container.append(`
                        <div class="text-center text-warning" style="position: absolute; bottom: 10px; left: 0; right: 0;">
                            <p><i class="fa fa-exclamation-triangle"></i> Could not remove navbar due to browser security restrictions.</p>
                        </div>
                    `);
                }
            }
        });
    }
    
    // Initial load
    load_general_ledger();
    
    // Set up auto-refresh every 30 seconds
    let refresh_interval = setInterval(function() {
        if (!frm.doc || frm.is_dirty()) {
            // Don't refresh if the form is dirty (has unsaved changes)
            return;
        }
        load_general_ledger();
    }, 50000); // 30 seconds
    
    // Clear interval when the form is unloaded
    $(document).on('form-unload', function(e, unload_frm) {
        if (unload_frm.docname === frm.docname && unload_frm.doctype === frm.doctype) {
            clearInterval(refresh_interval);
        }
    });
    
    // Handle the "Open in New Tab" button
    $report_container.find('.open-in-new-tab').on('click', function() {
        let url = '/app/query-report/General%20Ledger?' + $.param({
            company: frm.doc.company || frappe.defaults.get_default("company"),
            from_date: frappe.datetime.obj_to_str(frappe.datetime.str_to_obj(frm.doc.check_in_date)),
            to_date: frappe.datetime.obj_to_str(frappe.datetime.str_to_obj(frm.doc.check_out_date || frappe.datetime.get_today())),
            party_type: "Customer",
            party: frm.doc.guest_name,
            run: 1
        });
        window.open(url, '_blank');
    });
    
    // Handle the "Refresh" button
    $report_container.find('.refresh-ledger').on('click', function() {
        load_general_ledger();
        frappe.show_alert({
            message: __('Refreshing General Ledger...'),
            indicator: 'blue'
        }, 3);
    });
}

function extend_checkout_date(frm) {
    let d = new frappe.ui.Dialog({
        title: __('Extend Checkout Date'),
        fields: [
            {
                label: __('Additional Nights'),
                fieldname: 'additional_nights',
                fieldtype: 'Int',
                reqd: 1,
                default: 1,
                min: 1,
                description: __('Number of nights to extend the stay')
            },
            {
                fieldtype: 'Column Break',
                fieldname: 'col_break_1'
            },
            {
                label: __('Current Checkout Date'),
                fieldname: 'current_checkout_date',
                fieldtype: 'Date',
                default: frm.doc.check_out_date,
                read_only: 1
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'section_break_1'
            },
            {
                label: __('New Checkout Date'),
                fieldname: 'new_checkout_date',
                fieldtype: 'Date',
                read_only: 1
            },
            {
                label: __('Total Additional Charge'),
                fieldname: 'additional_charge',
                fieldtype: 'Currency',
                read_only: 1
            }
        ],
        primary_action_label: __('Extend Stay'),
        primary_action: function(values) {
            // Update the checkout date in the form
            frm.set_value('check_out_date', values.new_checkout_date);
            frm.set_value('nights', frm.doc.nights + parseInt(values.additional_nights));
            
            frappe.call({
                method: "havano_hotel_management.api.create_additional_sales_invoice_with_items",
                args: {
                    doc: {
                        name: frm.doc.name,
                        check_in: frm.doc.name,
                        check_in_date: frm.doc.check_in_date,
                        check_out_date: frm.doc.check_out_date,
                        guest_name: frm.doc.guest_name,
                        room: frm.doc.room,
                        additional_nights: parseInt(values.additional_nights),
                        price_list_rate: frm.doc.price_list_rate
                    },
                    charge: parseFloat(values.additional_charge)
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.show_alert({
                            message: __('Sales Invoice {0} created successfully', 
                                ['<a href="/app/sales-invoice/' + r.message.sales_invoice + '">' + r.message.sales_invoice + '</a>']),
                            indicator: 'green'
                        });
                        
                        // Save the document to update the checkout date
                        frm.save('Update').then(() => {
                            frappe.show_alert({
                                message: __("Checkout date extended successfully"),
                                indicator: 'green'
                            });
                        });
                    }
                }
            });
            
            d.hide();
        }
    });
    
    // Calculate new checkout date and additional charge when additional nights changes
    d.fields_dict.additional_nights.df.onchange = function() {
        const additional_nights = d.get_value('additional_nights');
        if (additional_nights) {
            // Calculate new checkout date
            let current_checkout = moment(frm.doc.check_out_date);
            let new_checkout = current_checkout.clone().add(additional_nights, 'days');
            d.set_value('new_checkout_date', new_checkout.format('YYYY-MM-DD'));
            
            // Calculate additional charge
            const price_list_rate = frm.doc.price_list_rate || 0;
            const additional_charge = price_list_rate * additional_nights;
            d.set_value('additional_charge', additional_charge);
        }
    };
    
    // Trigger the calculation initially
    d.fields_dict.additional_nights.df.onchange();
    
    d.show();
}

function move_to_another_room(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Room",
            filters: {
                status: "Available"
            },
            fields: ["name", "room_number", "room_type"]
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                let rooms = r.message.map(room => ({
                    label: `${room.room_number || room.name} (${room.room_type || ""})`,
                    value: room.name
                }));

                let d = new frappe.ui.Dialog({
                    title: __("Move to Another Room"),
                    fields: [
                        {
                            label: __("Select New Room"),
                            fieldname: "new_room",
                            fieldtype: "Select",
                            options: rooms,
                            reqd: 1
                        }
                    ],
                    primary_action_label: __("Move"),
                    primary_action(values) {
                        let old_room = frm.doc.room;
                        let new_room = values.new_room;

                        frappe.call({
                            method: "frappe.client.set_value",
                            args: {
                                doctype: "Room",
                                name: old_room,
                                fieldname: { status: "Available", current_checkin: "" }
                            },
                            callback: function() {
                                frappe.call({
                                    method: "frappe.client.set_value",
                                    args: {
                                        doctype: "Room",
                                        name: new_room,
                                        fieldname: { status: "Occupied", current_checkin: frm.doc.name }
                                    },
                                    callback: function() {
                                        frm.set_value("room", new_room);
                                        frm.save("Update").then(() => {
                                            frappe.show_alert({
                                                message: __("Room changed successfully."),
                                                indicator: "green"
                                            });
                                            frm.reload_doc();
                                        });
                                    }
                                });
                            }
                        });
                        d.hide();
                    }
                });
                d.show();
            } else {
                frappe.msgprint(__("No available rooms found."));
            }
        }
    });
}

frappe.ui.form.on("Reservation Guest", {
    
    guest_add: function (frm, cdt, cdn) {
        console.log("hello")
        // Set nights to match parent Check In's nights when a row is added
        let row = locals[cdt][cdn];
        row.nights = frm.doc.nights;
        frm.refresh_field("other_guests");
    }
});

