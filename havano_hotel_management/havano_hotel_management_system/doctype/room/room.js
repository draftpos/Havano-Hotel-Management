// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Room", {
	refresh(frm) {
        if(!frm.is_new()){
            if(frm.doc.status == "Available"){
                frm.set_value("current_checkin", "")
                frm.save()
            }
            if(frm.doc.title != `${frm.doc.room_name} - ${frm.doc.status}`){
                frm.set_value("title", `${frm.doc.room_name} - ${frm.doc.status}`);
                frm.save()
            }
        }
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
            frm.add_custom_button(__('Check In'), function() {
                checkin(frm)
            }).css({
                'background-color': 'rgb(37, 114, 208)', 
                'color': 'white'
            });
            frm.add_custom_button(__('Cancel Reservation'), function() {
                cancel_reservation(frm)
            }).css({
                'background-color': 'red', 
                'color': 'white'
            });
        }
        if (!frm.is_new() && frm.doc.status == "Available"){
            frm.add_custom_button(__('Check In'), function() {
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
        if(frm.doc.room_name){
            load_room_history(frm)
        }
        
	},
    
    price_list: function(frm) {
        // When price list is selected, fetch the item price
        if (frm.doc.price_list && frm.doc.room_item) {
            fetch_item_price(frm);
        }
    },
    
    room_item: function(frm) {
        // When item code is selected, fetch the item price if price list is already selected
        if (frm.doc.price_list && frm.doc.room_item) {
            fetch_item_price(frm);
        }
    },
    status: function(frm) {
        if (frm.doc.status === "Reserved") {
            frm.set_df_property("status", "read_only", 0);
        }else{
            frm.set_df_property("status", "read_only", 1);
        }
        

        if(frm.doc.status == "Available"){
            frm.set_value("current_checkin", "")
        }
        if(frm.doc.title != `${frm.doc.room_name} - ${frm.doc.status}`){
            frm.set_value("title", `${frm.doc.room_name} - ${frm.doc.status}`);
            frm.save()
        }
    },
    validate: function(frm){
        if(frm.doc.status == "Available"){
            frm.set_value("current_checkin", "")
        }
         if(frm.doc.title != `${frm.doc.room_name} - ${frm.doc.status}`){
            frm.set_value("title", `${frm.doc.room_name} - ${frm.doc.status}`);
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
                item_code: frm.doc.room_item,
                selling: 1  // Assuming we're using selling price lists
            },
            fields: ["price_list_rate", "currency"]
        },
        callback: function(response) {
            if (response.message && response.message.length > 0) {
                // Set the price field with the fetched price list rate
                frm.set_value("price", response.message[0].price_list_rate);
                
                // Optionally set currency if your Room doctype has a currency field
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
    checkin_doc.room = frm.doc.name;
    frappe.set_route("Form", "Check In", checkin_doc.name);
}
function checkout(frm) {
    if (frm.doc.current_checkin) {
        frappe.set_route("Form", "Check In", frm.doc.current_checkin);
    } else {
        frappe.msgprint(__("No active check-in found for this room."));
    }
}
function cancel_reservation(frm){
    frm.set_value("status", "Available");
    var other_doctype = "Reservation"; // e.g., "Sales Invoice"
    var other_docname = frm.doc.reservation; // Replace with your field that stores the reference
    
    // Confirm before cancelling
    frappe.confirm(
        `Are you sure you want to cancel ${other_doctype} ${other_docname}?`,
        function() {
            // On 'Yes' - cancel the document
            frappe.model.set_value(other_doctype, other_docname, 'docstatus', 2)
                .then(() => {
                    frm.set_value("reservation", "");
                    frm.save()
                    frappe.msgprint(`${other_doctype} ${other_docname} has been cancelled`);
                    
                    
                    // frm.reload_doc();
                })
                .catch((err) => {
                    // This approach won't work directly - see note below
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('Cannot cancel document: ') + err.message
                    });
                });
        }
    );
    
    // frappe.msgprint("Reservation Cancelled")

}


function load_room_history(frm) {
    // Function to load external resources
    function loadResource(source, type) {
        return new Promise((resolve, reject) => {
            let element;
            
            if (type === 'js') {
                element = document.createElement('script');
                element.src = source;
                element.onload = () => resolve(element);
                element.onerror = () => reject(new Error(`Failed to load script: ${source}`));
            } else if (type === 'css') {
                element = document.createElement('link');
                element.rel = 'stylesheet';
                element.href = source;
                element.onload = () => resolve(element);
                element.onerror = () => reject(new Error(`Failed to load stylesheet: ${source}`));
            }
            
            document.head.appendChild(element);
        });
    }

    Promise.all([
        loadResource('https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css', 'css'),
        loadResource('https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js', 'js')
    ]).then(() => {
        // After resources are loaded, proceed with the API call
        frappe.call({
            method: "havano_hotel_management.havano_hotel_management_system.doctype.room.room.get_room_history",
            args: {
                room_name: frm.doc.name
            },
            callback: function (response) {
                if (response.message) {
                    const data = response.message;
                    
                    // Calculate total amount
                    let totalAmount = 0;
                    let totalNights = 0;
                    
                    data.forEach(row => {
                        // Parse amount and nights, handling both string and numeric formats
                        const amount = typeof row.amount === 'string' ? 
                            parseFloat(row.amount.replace(/[^0-9.-]+/g, '')) : 
                            parseFloat(row.amount || 0);
                        
                        const nights = typeof row.nights === 'string' ? 
                            parseFloat(row.nights.replace(/[^0-9.-]+/g, '')) : 
                            parseFloat(row.nights || 0);
                        
                        totalAmount += isNaN(amount) ? 0 : amount;
                        totalNights += isNaN(nights) ? 0 : nights;
                    });
                    
                    // Create a datatable for room history with print button
                    const html = `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h4>${__("Room History")}</h4>
                            <button class="btn btn-sm btn-primary print-room-history-btn">${__("Print")}</button>
                        </div>
                        <table id="room-history-table" class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>${__("Guest Name")}</th>
                                    <th>${__("Check-In Date")}</th>
                                    <th>${__("Check-Out Date")}</th>
                                    <th>${__("Nights")}</th>
                                    <th>${__("Amount")}</th>
                                    <th>${__("Source")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(row => `
                                    <tr>
                                        <td>${row.guest_name || ""}</td>
                                        <td>${row.checkin_date || ""}</td>
                                        <td>${row.checkout_date || ""}</td>
                                        <td>${row.nights || ""}</td>
                                        <td>${row.amount || ""}</td>
                                        <td>${row.source || ""}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="font-weight-bold">
                                    <td colspan="3" class="text-right">${__("Total")}</td>
                                    <td>${totalNights}</td>
                                    <td>${format_currency(totalAmount, frappe.defaults.get_default("currency"))}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    `;
                    
                    frm.set_df_property("room_folio", "options", html);
                    frm.refresh_field("room_folio");
                    
                    // Initialize DataTables immediately after rendering
                    $('#room-history-table').DataTable({
                        paging: true,
                        searching: true,
                        pageLength: 10,
                        lengthChange: false,
                        info: false,
                        language: {
                            search: __("Search:"),
                            paginate: {
                                next: __("Next"),
                                previous: __("Previous")
                            }
                        }
                    });
                    
                    // Add print functionality
                    $('.print-room-history-btn').on('click', function() {
                        printRoomHistory('room-history-table', __('Room History') + ' - ' + frm.doc.name, totalNights, totalAmount);
                    });
                }
            }
        });
    }).catch(error => {
        console.error("Failed to load DataTables resources:", error);
        frappe.throw(__("Failed to load DataTables resources. Please check your internet connection."));
    });

    // Function to print room history
    function printRoomHistory(tableId, title, totalNights, totalAmount) {
        // First get company info
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                filters: { name: frappe.defaults.get_default("company") },
                fieldname: ["name", "company_name", "email", "phone_no", "website"]
            },
            callback: function(r) {
                if (r.message) {
                    const company = r.message;
                    const logoUrl = '/files/havano%20logoo%20(1)%20(1).png';
                    generatePrintWindow(tableId, title, company, logoUrl, totalNights, totalAmount);
                } else {
                    // If company info can't be fetched, still print without it
                    generatePrintWindow(tableId, title, null, null, totalNights, totalAmount);
                }
            }
        });
    }

    function generatePrintWindow(tableId, title, company, logoUrl, totalNights, totalAmount) {
        const printWindow = window.open('', '_blank');
        const table = document.getElementById(tableId);
        
        // Clone the table to modify it for printing
        const tableClone = table.cloneNode(true);
        
        // Remove the footer from the cloned table
        const tfoot = tableClone.querySelector('tfoot');
        if (tfoot) {
            tableClone.removeChild(tfoot);
        }
        
        const roomName = frm.doc.name;
        const today = frappe.datetime.get_today();
        
        // Company header HTML
        let companyHtml = '';
        if (company) {
            companyHtml = `
                <div class="company-header">
                    <div class="company-logo-container">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${company.company_name}" class="company-logo">` : ''}
                    </div>
                    <div class="company-info">
                        <h2>${company.company_name}</h2>
                        <p>
                            ${company.phone_no ? `Phone: ${company.phone_no}` : ''}
                            ${company.email ? `${company.phone_no ? ' | ' : ''}Email: ${company.email}` : ''}
                        </p>
                        ${company.website ? `<p>Website: ${company.website}</p>` : ''}
                    </div>
                </div>
                <hr>
            `;
        }
        
        // Create a separate summary table for totals
        const summaryTable = `
            <div class="summary-table-container">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2">${__("Summary")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>${__("Total Nights")}</strong></td>
                            <td>${totalNights}</td>
                        </tr>
                        <tr>
                            <td><strong>${__("Total Amount")}</strong></td>
                            <td>${format_currency(totalAmount, frappe.defaults.get_default("currency"))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                        }
                        .company-header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 20px;
                        }
                        .company-logo-container {
                            margin-right: 20px;
                            width: 100px;
                            text-align: left;
                        }
                        .company-logo {
                            max-width: 100%;
                            max-height: 80px;
                        }
                        .company-info {
                            flex: 1;
                            text-align: right;
                        }
                        .company-info h2 {
                            margin: 0 0 10px 0;
                        }
                        .company-info p {
                            margin: 5px 0;
                        }
                        .report-title {
                            text-align: center;
                            margin: 20px 0;
                        }
                        .report-info {
                            margin-bottom: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                        hr {
                            border: 0;
                            border-top: 1px solid #ddd;
                            margin: 20px 0;
                        }
                        .print-footer {
                            margin-top: 30px;
                            text-align: center;
                            font-size: 12px;
                            color: #777;
                        }
                        /* Summary table styles */
                        .summary-table-container {
                            page-break-before: avoid;
                            margin-top: 20px;
                        }
                        .summary-table {
                            width: 50%;
                            margin-left: auto;
                            border-collapse: collapse;
                        }
                        .summary-table th {
                            background-color: #f2f2f2;
                            text-align: center;
                        }
                        .summary-table td:first-child {
                            width: 60%;
                        }
                        .summary-table td:last-child {
                            text-align: right;
                        }
                        @media print {
                            @page { size: landscape; }
                            thead {
                                display: table-header-group;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${companyHtml}
                    
                    <div class="report-title">
                        <h2>${title}</h2>
                    </div>
                    
                    <div class="report-info">
                        <p><strong>Room:</strong> ${roomName}</p>
                        <p><strong>Date:</strong> ${today}</p>
                    </div>
                    
                    <table class="main-table">
                        <thead>
                            ${tableClone.querySelector('thead').innerHTML}
                        </thead>
                        <tbody>
                            ${tableClone.querySelector('tbody').innerHTML}
                        </tbody>
                    </table>
                    
                    ${summaryTable}
                    
                    <div class="print-footer">
                        <p>Printed on ${today} from ${frappe.defaults.get_default("company")} system</p>
                    </div>
                    
                    <script>
                        // Automatically print when the page loads
                        window.onload = function() {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
    }

}
