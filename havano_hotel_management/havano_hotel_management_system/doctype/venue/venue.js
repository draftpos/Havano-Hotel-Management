// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Venue", {
	refresh(frm) {
        frm.set_df_property("price", "read_only", 0);
        
        if (frm.doc.status === "Occupied" && frm.doc.checkout_date) {
            const checkout_date = frappe.datetime.str_to_obj(frm.doc.checkout_date);
            const today = frappe.datetime.get_today();
            const today_obj = frappe.datetime.str_to_obj(today);
            
            if (checkout_date < today_obj) {
                // Set checkout status to overdue
                frm.set_value("checkout_status", "Overdue");
                frm.save();
            }
        }
        if (frm.doc.status === "Reserved") {
            frm.set_df_property("status", "read_only", 0);
        }
        if (frm.doc.status == "Available"){
            frm.add_custom_button(__('Book'), function() {
                checkin(frm)
            }).css({
                'background-color': 'rgb(37, 114, 208)', 
                'color': 'white'
            });
        }if (frm.doc.status == "Occupied"){

            frm.add_custom_button(__('Checkout'), function() {
                checkout(frm)
            }).css({
                'background-color': 'red', 
                'color': 'white'
            });
        }
	},
    
    price_list: function(frm) {
        // When price list is selected, fetch the item price
        if (frm.doc.price_list && frm.doc.venue_item) {
            fetch_item_price(frm);
        }
    },
    
    venue_item: function(frm) {
        // When item code is selected, fetch the item price if price list is already selected
        if (frm.doc.price_list && frm.doc.venue_item) {
            fetch_item_price(frm);
        }
    },
    status: function(frm) {
        if (frm.doc.status === "Reserved") {
            frm.set_df_property("status", "read_only", 0);
        }else{
            frm.set_df_property("status", "read_only", 1);
        }
    },
    validate: function(frm){
        if(frm.doc.title != `${frm.doc.venue_name} - ${frm.doc.status}`){
            frm.set_value("title", `${frm.doc.venue_name} - ${frm.doc.status}`);
            frm.save()
        }
    }
});

function fetch_item_price(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Item Price",
            filters: {
                price_list: frm.doc.price_list,
                item_code: frm.doc.venue_item,
                selling: 1  // Assuming we're using selling price lists
            },
            fields: ["price_list_rate", "currency"]
        },
        callback: function(response) {
            if (response.message && response.message.length > 0) {
                // Set the price field with the fetched price list rate
                frm.set_value("price", response.message[0].price_list_rate);
                
                // Optionally set currency if your venue doctype has a currency field
                if (frm.fields_dict.currency) {
                    frm.set_value("currency", response.message[0].currency);
                }
            } else {
                // If no price is found, clear the price field and show a message
                frm.set_value("price", 0);
                frappe.msgprint(__("No price found for the selected item in the price list. Please set up an Item Price."));
            }
        }
    });
}

function checkin(frm) {
    let checkin_doc = frappe.model.get_new_doc("Check In");
    checkin_doc.venue = frm.doc.name;
    frappe.set_route("Form", "Check In", checkin_doc.name);
}
function checkout(frm) {
    if (frm.doc.current_checkin) {
        frappe.set_route("Form", "Check In", frm.doc.current_checkin);
    } else {
        frappe.msgprint(__("No active check-in found for this venue."));
    }
}
