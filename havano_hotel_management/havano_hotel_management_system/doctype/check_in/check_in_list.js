// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.listview_settings['Check In'] = {
    get_indicator: function(doc) {
        if (doc.checkout_status === "Out") {
            return [__("Out"), "blue", "checkout_status,=,Out"];
        } else if (doc.checkout_status === "In") {
            return [__("In"), "orange", "checkout_status,=,In"];
        }
    },
    formatters: {
        checkout_status: function(value, field, doc) {
            if (value === "Out") {
                return `<span style="background-color: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">Out</span>`;
            } else if (value === "In") {
                return `<span style="background-color: #ff9800; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">In</span>`;
            }
            return value || "";
        }
    },
    refresh: function(listview) {
        // Apply custom styling to checkout_status cells
        listview.$result.find('.list-row').each(function() {
            const $row = $(this);
            const checkoutStatus = $row.attr('data-checkout-status') || 
                $row.find('[data-fieldname="checkout_status"]').text().trim();
            
            const $statusCell = $row.find('[data-fieldname="checkout_status"]');
            if ($statusCell.length) {
                if (checkoutStatus === "Out") {
                    $statusCell.css({
                        'background-color': '#007bff',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                } else if (checkoutStatus === "In") {
                    $statusCell.css({
                        'background-color': '#ff9800',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                }
            }
        });
    }
};
