// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Booking", {
    setup: function(frm) {
        // frm.set_query("venue", function(doc) {
        //     if (doc.reservation) {
        //         return {
        //             "filters": {
        //                 "status": ["!=", "Occupied"]
        //             }
        //         };
        //     }else{
        //         return {
        //             "filters": {
        //                 "status": "Available"
        //             }
        //         };
        //     }     
        // });
        frm.set_query("reservation", function() {
            let today = frappe.datetime.get_today();
            return {
                "filters": {
                    "check_in_date": [">=",today],
                    "reservation_type": "Venue"
                }
            };
        });
    },
    refresh(frm) {
        if (frm.is_new() && frm.doc.hours && frm.doc.check_in_time && frm.doc.check_in_date) {
            // Combine check_in_date and check_in_time to create a datetime
            let checkInDateTime = frappe.datetime.str_to_obj(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
            // Add hours to check_in_date and check_in_time
            let checkOutTime = new Date(checkInDateTime.getTime() + frm.doc.hours * 60 * 60 * 1000);
            frm.set_value('check_out_time', frappe.datetime.get_datetime_as_string(checkOutTime));
        }

        // general_ledger(frm);
        if(frm.doc.docstatus === 1) {
            general_ledger(frm);
            frm.set_df_property("hours", "read_only", 1);
            frm.set_df_property("check_out_time", "read_only", true);  
            frm.set_df_property("status", "read_only", true);
        }
        if(frm.is_new()){
            frm.set_value("check_in_by", frappe.session.user)
        }
        if(frm.doc.docstatus === 1 && frm.doc.actual_checkout_date) {
            // Show checkout button only if the document is submitted
            frm.add_custom_button(__('Check out'), function() {
                checkout(frm)
            }, __("Actions"))
            frm.add_custom_button(__('Extend Stay'), function() {
                extend_checkout_date(frm)
            }, __("Actions"))
        }
        if(frm.doc.docstatus === 1 && !frm.doc.sales_invoice_status && frm.doc.sales_invoice_number) {

            frm.add_custom_button(__('Make Payment'), function() {
                // make_payment(frm)
                create_payment_for_sales_invoice(frm)
            }, __("Actions"))
            
        }
        
        if(frm.doc.docstatus === 1 && frm.doc.sales_invoice_number) {
            update_sales_invoice_payment_status(frm);
            frm.add_custom_button(__('Extra Charges'), function() {
                extra_charges(frm)      
            }, __("Actions"))
        }
    },
    check_in_time: function(frm) {
        if (frm.doc.hours && frm.doc.check_in_time && frm.doc.check_in_date) {
            // Combine check_in_date and check_in_time to create a datetime
            let checkInDateTime = frappe.datetime.str_to_obj(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
            
            // Add hours to check_in_date and check_in_time
            let checkOutTime = new Date(checkInDateTime.getTime() + frm.doc.hours * 60 * 60 * 1000);
            frm.set_value('check_out_time', frappe.datetime.get_datetime_as_string(checkOutTime));
        } else if (frm.doc.check_in_time && frm.doc.check_out_time && frm.doc.check_in_date) {
            let checkInDateTime = frappe.datetime.str_to_obj(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
            let checkOutTime = frappe.datetime.str_to_obj(frm.doc.check_out_time);
            let hours = frappe.datetime.get_hour_diff(checkOutTime, checkInDateTime);
            frm.set_value('hours', hours);
        }
    },
    check_out_time: function(frm) {
        if (frm.doc.check_out_time && frm.doc.check_in_time && frm.doc.check_in_date) {
            let checkInDateTime = frappe.datetime.get_datetime_as_string(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
            let checkOutTime = frappe.datetime.get_datetime_as_string(frm.doc.check_out_time);
            if (checkOutTime <= checkInDateTime) {
                frappe.msgprint(__('Check-out time must be after check-in time.'));
                frm.set_value('check_out_time', null);
            } else {
                let hours = frappe.datetime.get_hour_diff(checkOutTime, checkInDateTime);
                frm.set_value('hours', hours);
            }
        }
    },
    hours: function(frm) {
        if (frm.doc.hours && frm.doc.check_in_time && frm.doc.check_in_date) {
            // Combine check_in_date and check_in_time to create a datetime
            let checkInDateTime = frappe.datetime.str_to_obj(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
            // Add hours to check_in_date and check_in_time
            let checkOutTime = new Date(checkInDateTime.getTime() + frm.doc.hours * 60 * 60 * 1000);

            frm.set_value('check_out_time', frappe.datetime.get_datetime_as_string(checkOutTime));
        }
    },
    price_list: function(frm) {
        if(frm.doc.price_list && frm.doc.venue) {
            // Get the item code from the venue
            frappe.db.get_value("Venue", frm.doc.venue, "venue_item", function(venue_data) {
                if(venue_data && venue_data.venue_item) { // Updated from venue_item to venue_item
                    // Fetch the price list rate for the venue's item
                    frappe.call({
                        method: "frappe.client.get_value",
                        args: {
                            doctype: "Item Price",
                            filters: {
                                item_code: venue_data.venue_item,
                                price_list: frm.doc.price_list,
                                selling: 1
                            },
                            fieldname: "price_list_rate"
                        },
                        callback: function(r) {
                            if(r.message && r.message.price_list_rate) {
                                console.log(r.message.price_list_rate);
                                // Set the price list rate
                                frm.set_value("price_list_rate", r.message.price_list_rate);
                                
                                // Calculate total charge based on hours and price list rate
                                if(frm.doc.hours) {
                                    let total = r.message.price_list_rate * frm.doc.number_of_people;
                                    frm.set_value("total_charge", total);
                                }
                            } else {
                                frappe.msgprint(__("No price found for this venue in the selected price list. Please select a different price list or update the Venue item price."));
                                frm.set_value("price_list_rate", 0);
                            }
                        }
                    });
                } else {
                    frappe.msgprint(__("No item is linked to this venue. Please link an item to the venue first."));
                }
            });
        }
    },
    validate: function(frm) {
        // console.log("I am here")
         frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Booking",
                    filters: [
                        ["venue", "=", frm.doc.venue],
                        ["docstatus", "=", 1], // Submitted bookings
                        ["status", "=", "Booked"], // Active bookings
                        ["check_in_date", "=", frm.doc.check_in_date] // Same date
                    ],
                    fields: ["name", "check_out_time"]
                },
                callback: function(r) {
                    // console.log(r)
                    if (r.message && r.message.length > 0) {
                        let conflictingBooking = r.message.find(booking => {
                            // console.log(Fbooking)
                            let existingCheckOutTime = frappe.datetime.str_to_obj(booking.check_out_time);
                            let newCheckInTime = frappe.datetime.str_to_obj(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
                            return existingCheckOutTime > newCheckInTime; // Conflict if checkout time is after new check-in time
                        });

                        if (conflictingBooking) {
                            frm.set_value("venue", ""); // Clear the venue field
                            frappe.throw(__("Venue {0} is already booked for the selected date and time (Booking: {1}). Please select a different venue or time.", 
                                [frm.doc.venue, conflictingBooking.name]));
                        }
                    }
                }
            });
        // We need to use a Promise to handle the asynchronous DB call
        if(frm.doc.venue && frm.doc.hours) {
            return new Promise(resolve => {
                frappe.db.get_value("Venue", frm.doc.venue, "price", function(data) {
                    if(data && frm.doc.price_list_rate) {
                        let total = frm.doc.price_list_rate * frm.doc.number_of_people;
                        frm.set_value("total_charge", total);
                        
                        // Now update the balance_due after total_charge is set
                        resolve();
                    }
                    else if(data && data.price) {
                        let total = data.price * frm.doc.hours;
                        frm.set_value("total_charge", total);
                        
                        // Now update the balance_due after total_charge is set
                        resolve();
                    } else {
                        resolve();
                    }
                });
            });
        } 
        // if (!frm.doc.status) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Booking",
                    filters: [
                        ["venue", "=", frm.doc.venue],
                        // ["docstatus", "=", 1], // Submitted bookings
                        // ["status", "=", "Booked"], // Active bookings
                        // ["check_in_date", "=", frm.doc.check_in_date] // Same date
                    ],
                    fields: ["name", "check_out_time"]
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        let conflictingBooking = r.message.find(booking => {
                            console.log(booking)
                            let existingCheckOutTime = frappe.datetime.str_to_obj(booking.check_out_time);
                            let newCheckInTime = frappe.datetime.str_to_obj(`${frm.doc.check_in_date} ${frm.doc.check_in_time}`);
                            return existingCheckOutTime > newCheckInTime; // Conflict if checkout time is after new check-in time
                        });

                        if (conflictingBooking) {
                            frm.set_value("venue", ""); // Clear the venue field
                            frappe.throw(__("Venue {0} is already booked for the selected date and time (Booking: {1}). Please select a different venue or time.", 
                                [frm.doc.venue, conflictingBooking.name]));
                        }
                    }
                }
            });
        // }
    },
    guest_name: function(frm) {
        if(frm.doc.guest_name) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Booking",
                    filters: [
                        ["guest_name", "=", frm.doc.guest_name],
                        ["docstatus", "=", 1], // Submitted documents
                        ["status", "=", "Booked"] // No check-out date means not checked out yet
                    ],
                    fields: ["name", "venue"]
                },
                callback: function(r) {
                    // if(r.message && r.message.length > 0) {
                    //     // Guest has an existing active check-in
                    //     let existing = r.message[0];
                    //     frm.set_value("guest_name", ""); // Clear the guest name field
                    //     frappe.msgprint(__(`Guest already has a venue booked (${existing.name}) in venue ${existing.venue}. Please check out the guest first before creating a new booking.`));
                    // }
                }
            });
        }
    },
    venue: function(frm) {
        if(frm.doc.venue) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Venue",
                    filters: { name: frm.doc.venue },
                    fieldname: ["status", "venue_item"]
                },
                callback: function(r) {
                    // if(r.message && r.message.status !== "Available") {
                    //     frm.set_value("venue", "");
                    //     frappe.msgprint(__("Venue {0} is not available. Please select an available venue.", [frm.doc.venue]));
                    // }else {
                        // If price list is selected, fetch price from price list
                        if(frm.doc.price_list && r.message.venue_item) {
                            frappe.call({
                                method: "frappe.client.get_value",
                                args: {
                                    doctype: "Item Price",
                                    filters: {
                                        item_code: r.message.venue_item,
                                        price_list: frm.doc.price_list,
                                        selling: 1
                                    },
                                    fieldname: "price_list_rate"
                                },
                                callback: function(price_data) {
                                    if(price_data.message && price_data.message.price_list_rate) {
                                        frm.set_value("price_list_rate", price_data.message.price_list_rate);
                                        
                                        // Calculate total charge if hours is set
                                        if(frm.doc.hours) {
                                            let total = price_data.message.price_list_rate * frm.doc.number_of_people;
                                            frm.set_value("total_charge", total);
                                            
                                            // Update balance due
                                        }
                                    } else {
                                        // If no price list rate found, use the default venue price
                                        if(r.message.price) {
                                            frm.set_value("price_list_rate", r.message.price);
                                            
                                            if(frm.doc.hours) {
                                                let total = r.message.price * frm.doc.number_of_people;
                                                frm.set_value("total_charge", total);
                                                
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            // Use default venue price if no price list is selected
                            if(r.message.price) {
                                frm.set_value("price_list_rate", r.message.price);
                                
                                if(frm.doc.hours) {
                                    let total = r.message.price * frm.doc.number_of_people;
                                    frm.set_value("total_charge", total);
                                    
                                }
                            }
                        }
                    // }
                
                }
            });
        }
    },
    on_submit(frm){
        frm.reload_doc()
        frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Venue",
                name: frm.doc.venue,
                fieldname: {
                    // "status": "Occupied",
                    "current_booking": frm.doc.name
                }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.show_alert({
                        message: __("Current Booking Updated in Venue"),
                        indicator: 'green'
                    });
                }
            }
        });
    }
});

function update_sales_invoice_payment_status(frm) {
    
    frappe.call({
        method: "havano_hotel_management.api.check_sales_invoices_payment_status_for_booking",
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

function checkout(frm) {
    frappe.confirm(
        __('Are you sure you want to check out?'),
        function() {
            // If user confirms, set status and actual_checkout_date
            frm.set_value('status', 'Checked Out');
            frm.set_value('actual_checkout_date', frappe.datetime.now_datetime());

            // frappe.model.set_value("Venue", frm.doc.venue, 'status', "Available")
            frappe.call({
                method: "havano_hotel_management.havano_hotel_management_system.doctype.booking.booking.checkout",
                args: {
                    "venue": frm.doc.venue
                }
            })
            
            // Save the form after setting the values
            frm.save('Update').then(() => {
                frappe.show_alert({
                    message: __('Guest has been successfully checked out.'),
                    indicator: 'green'
                });
                frm.reload_doc();
            });
        },
        function() {
            // If user cancels, do nothing
            frappe.show_alert({
                message: __('Check-out cancelled.'),
                indicator: 'orange'
            });
        }
    );
}

function extra_charges(frm) {
    // Create a new Sales Invoice with the guest as customer
    frappe.model.with_doctype("Sales Invoice", async function() {
        let sales_invoice = frappe.model.get_new_doc("Sales Invoice");
        
        // Set the customer to the guest name
        sales_invoice.customer = frm.doc.guest_name;
        
        // Set other relevant fields
        sales_invoice.custom_booking_reference = frm.doc.name;
        sales_invoice.due_date = frappe.datetime.get_today();
        
        // Add a custom field to identify this as an extra charge for the check-in
        sales_invoice.is_extra_charge = 1;
        let item  = await frappe.db.get_value("Venue", frm.doc.venue, "venue_item");
        // Set the venue information in the remarks
        sales_invoice.remarks = `Extra charges for guest staying in Venue: ${frm.doc.venue}`;
        // sales_invoice.items = [];
        // sales_invoice.items.push({ 
        //     item: item.message.venue_item,
        //     qty: frm.doc.hours,
        //     rate: frm.doc.price_list_rate,
        // });

        // console.log(item.message.venue_item)
        

        // sales_invoice.grand_total = frm.doc.total_charge || 0;
        
        // Navigate to the Sales Invoice form
        frappe.set_route("Form", "Sales Invoice", sales_invoice.name);
    });
}

function create_payment_for_sales_invoice(frm, sales_invoice_number, amount) {
    // from a sales invoice including fetching the correct accounts and amounts
    frappe.call({
        method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
        args: {
            dt: "Sales Invoice",
            dn: frm.doc.sales_invoice_number,
            bank_account: "", // Optional: specify a bank account
            bank_amount: amount || 0,   // Optional: specify a custom amount, otherwise full amount will be used
            custom_booking_reference: frm.doc.name
        },
        callback: function(r) {
            if(r.message) {
                var doc = frappe.model.sync(r.message)[0];
                frappe.set_route("Form", doc.doctype, doc.name);
              }
        }
    });
}

function extend_checkout_date(frm) {
    let d = new frappe.ui.Dialog({
        title: __('Extend Checkout Date'),
        fields: [
            {
                label: __('Additional Hours'),
                fieldname: 'additional_hours',
                fieldtype: 'Int',
                reqd: 1,
                default: 1,
                min: 1,
                description: __('Number of hours to extend the stay')
            },
            {
                fieldtype: 'Column Break',
                fieldname: 'col_break_1'
            },
            {
                label: __('Current Checkout Time'),
                fieldname: 'current_checkout_time',
                fieldtype: 'Datetime',
                default: frm.doc.check_out_time,
                read_only: 1
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'section_break_1'
            },
            {
                label: __('New Checkout Time'),
                fieldname: 'new_checkout_time',
                fieldtype: 'Datetime',
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
            frm.set_value('check_out_time', values.new_checkout_time);
            frm.set_value('hours', frm.doc.hours + parseInt(values.additional_hours));
            
            frappe.call({
                method: "havano_hotel_management.api.create_additional_sales_invoice_with_booking",
                args: {
                    doc: {
                        name: frm.doc.name,
                        check_in: frm.doc.name,
                        check_in_date: frm.doc.check_in_date,
                        check_out_date: frm.doc.check_out_time,
                        guest_name: frm.doc.guest_name,
                        venue: frm.doc.venue,
                        additional_hours: parseInt(values.additional_hours),
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
    d.fields_dict.additional_hours.df.onchange = function() {
        const additional_hours = d.get_value('additional_hours');
        if (additional_hours) {
            // Calculate new checkout date
            let current_checkout = frappe.datetime.str_to_obj(frm.doc.check_out_time);
            let new_checkout = new Date(current_checkout.getTime() + additional_hours * 60 * 60 * 1000);
            d.set_value('new_checkout_time', frappe.datetime.get_datetime_as_string(new_checkout));
            
            // Calculate additional charge
            const price_list_rate = frm.doc.price_list_rate || 0;
            const additional_charge = price_list_rate * additional_hours;
            d.set_value('additional_charge', additional_charge);
        }
    };
    
    // Trigger the calculation initially
    d.fields_dict.additional_hours.df.onchange();
    
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
                    <h4 class="panel-title" style="margin: 0; font-weight: bold;">Venue Folio - General Ledger</h4>
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
