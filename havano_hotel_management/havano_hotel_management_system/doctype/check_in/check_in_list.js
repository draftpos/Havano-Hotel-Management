// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.listview_settings['Check In'] = {
    get_indicator: function(doc) {
        if (doc.checkout_status === "Out") {
            return [__("Out"), "blue", "checkout_status,=,Out"];
        } else if (doc.checkout_status === "Overdue") {
            return [__("Overdue"), "red", "checkout_status,=,Overdue"];
        } else if (doc.checkout_status === "In") {
            return [__("In"), "orange", "checkout_status,=,In"];
        }
    },
    formatters: {
        checkout_status: function(value, field, doc) {
            if (value === "Out") {
                return `<span style="background-color: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">Out</span>`;
            } else if (value === "Overdue") {
                return `<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">Overdue</span>`;
            } else if (value === "In") {
                return `<span style="background-color: #ff9800; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">In</span>`;
            }
            return value || "";
        },
        sales_invoice_status: function(value, field, doc) {
            if (value === "Paid") {
                return `<span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">Paid</span>`;
            } else if (value === "UnPaid") {
                return `<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">UnPaid</span>`;
            }
            return value || "";
        },
        total_balance: function(value, field, doc) {
            if (!value && value !== 0) {
                return value || "";
            }
            
            // Parse the value to check if it's negative
            const numValue = parseFloat(value) || 0;
            const isNegative = numValue < 0;
            
            // Format the value (preserve the original format if it's a string)
            const displayValue = value.toString();
            
            if (isNegative) {
                return `<span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">${displayValue}</span>`;
            } else {
                return `<span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 500; display: inline-block;">${displayValue}</span>`;
            }
        }
    },
    refresh: function(listview) {
        // Call endpoint to mark rooms reserved for today
        // frappe.call({
        //     method: 'havano_hotel_management.api.mark_rooms_reserved_for_today',
        //     callback: function(r) {
        //         if (r.message && r.message.success && r.message.updated_count > 0) {
        //             frappe.show_alert({
        //                 message: r.message.message,
        //                 indicator: 'green'
        //             }, 3);
        //         }
        //     },
        //     error: function(r) {
        //         // Silently fail - don't interrupt user
        //         console.error('Error updating room statuses:', r);
        //     }
        // });
        
        // Apply custom styling to checkout_status and sales_invoice_status cells
        listview.$result.find('.list-row').each(function() {
            const $row = $(this);
            
            // Style checkout_status
            const checkoutStatus = $row.attr('data-checkout-status') || 
                $row.find('[data-fieldname="checkout_status"]').text().trim();
            
            const $checkoutStatusCell = $row.find('[data-fieldname="checkout_status"]');
            if ($checkoutStatusCell.length) {
                if (checkoutStatus === "Out") {
                    $checkoutStatusCell.css({
                        'background-color': '#007bff',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                } else if (checkoutStatus === "Overdue") {
                    $checkoutStatusCell.css({
                        'background-color': '#dc3545',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                } else if (checkoutStatus === "In") {
                    $checkoutStatusCell.css({
                        'background-color': '#ff9800',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                }
            }
            
            // Style sales_invoice_status (Status field)
            const invoiceStatus = $row.attr('data-sales-invoice-status') || 
                $row.find('[data-fieldname="sales_invoice_status"]').text().trim();
            
            const $invoiceStatusCell = $row.find('[data-fieldname="sales_invoice_status"]');
            if ($invoiceStatusCell.length) {
                if (invoiceStatus === "Paid") {
                    $invoiceStatusCell.css({
                        'background-color': '#28a745',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                } else if (invoiceStatus === "UnPaid") {
                    $invoiceStatusCell.css({
                        'background-color': '#dc3545',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                }
            }
            
            // Style total_balance
            const $totalBalanceCell = $row.find('[data-fieldname="total_balance"]');
            if ($totalBalanceCell.length) {
                const balanceText = $totalBalanceCell.text().trim();
                const balanceValue = parseFloat(balanceText.replace(/[^\d.-]/g, '')) || 0;
                
                if (balanceValue < 0 || balanceText.startsWith('-')) {
                    // Negative balance - red background
                    $totalBalanceCell.css({
                        'background-color': '#dc3545',
                        'color': 'white',
                        'font-weight': '500',
                        'padding': '2px 8px',
                        'border-radius': '3px'
                    });
                } else if (balanceValue >= 0) {
                    // Positive or zero balance - green background
                    $totalBalanceCell.css({
                        'background-color': '#28a745',
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
