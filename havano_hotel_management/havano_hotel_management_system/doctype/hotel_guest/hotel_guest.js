// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Hotel Guest", {
    first_name: function (frm) {
        try {
            frm.set_value('full_name', `${frm.doc.first_name || ''} ${frm.doc.last_name || ''}`.trim());
        } catch (error) {
            console.error("Error updating full name:", error);
            frappe.msgprint(__('An error occurred while updating the full name.'));
        }
    },
    last_name: function (frm) {
        try {
            frm.set_value('full_name', `${frm.doc.first_name || ''} ${frm.doc.last_name || ''}`.trim());
        } catch (error) {
            console.error("Error updating full name:", error);
            frappe.msgprint(__('An error occurred while updating the full name.'));
        }
    },
    refresh: function (frm){
        if(frm.doc.guest_customer){
            Promise.all([
                loadResource('https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css', 'css'),
                loadResource('https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js', 'js'),
                loadResource('https://cdn.datatables.net/buttons/2.3.6/js/dataTables.buttons.min.js', 'js'),
                loadResource('https://cdn.datatables.net/buttons/2.3.6/js/buttons.print.min.js', 'js'),
                loadResource('https://cdn.datatables.net/buttons/2.3.6/css/buttons.dataTables.min.css', 'css')
            ]).then(() => {
                // After resources are loaded, proceed with the API call
                frappe.call({
                    method: "havano_hotel_management.havano_hotel_management_system.doctype.hotel_guest.hotel_guest.get_guest_ledger",
                    args: {
                        guest: frm.doc.guest_customer
                    },
                    callback: function (response) {
                        if (response.message) {
                            const ledgerData = response.message.ledger || [];
                            const guestHistory = response.message.guest_history || [];
                            
                            // Calculate totals for guest history
                            let totalAmount = 0;
                            guestHistory.forEach(row => {
                                // Make sure we're dealing with a number
                                const amount = typeof row.total_amount === 'string' ? 
                                    parseFloat(row.total_amount.replace(/[^0-9.-]+/g, '')) : 
                                    parseFloat(row.total_amount || 0);
                                totalAmount += isNaN(amount) ? 0 : amount;
                            });
                            
                            // Calculate totals for ledger
                            let totalDebit = 0;
                            let totalCredit = 0;
                            let finalBalance = 0;
                            
                            ledgerData.forEach(row => {
                                // Make sure we're dealing with numbers
                                const debit = typeof row.debit === 'string' ? 
                                    parseFloat(row.debit.replace(/[^0-9.-]+/g, '')) : 
                                    parseFloat(row.debit || 0);
                                const credit = typeof row.credit === 'string' ? 
                                    parseFloat(row.credit.replace(/[^0-9.-]+/g, '')) : 
                                    parseFloat(row.credit || 0);
                                
                                totalDebit += isNaN(debit) ? 0 : debit;
                                totalCredit += isNaN(credit) ? 0 : credit;
                            });
                            
                            if (ledgerData.length > 0) {
                                const lastBalance = ledgerData[ledgerData.length - 1].balance;
                                finalBalance = typeof lastBalance === 'string' ? 
                                    parseFloat(lastBalance.replace(/[^0-9.-]+/g, '')) : 
                                    parseFloat(lastBalance || 0);
                                finalBalance = isNaN(finalBalance) ? 0 : finalBalance;
                            }
                            
                            // Create HTML for both tables
                            const html = `
                                <div class="guest-history-section">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h4>${__("Guest Stay History")}</h4>
                                        <button class="btn btn-sm btn-primary print-history-btn">${__("Print")}</button>
                                    </div>
                                    <table id="guest-history-table" class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>${__("Reservation")}</th>
                                                <th>${__("Room")}</th>
                                                <th>${__("Planned Check-In")}</th>
                                                <th>${__("Planned Check-Out")}</th>
                                                <th>${__("Actual Check-In")}</th>
                                                <th>${__("Actual Check-Out")}</th>
                                                <th>${__("Status")}</th>
                                                <th>${__("Amount")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${guestHistory.map(row => `
                                                <tr>
                                                    <td>
                                                        <a href="/app/reservation/${row.reservation}" target="_blank">
                                                            ${row.reservation || ""}
                                                        </a>
                                                    </td>
                                                    <td>${row.room || ""}</td>
                                                    <td>${row.check_in_date || ""}</td>
                                                    <td>${row.check_out_date || ""}</td>
                                                    <td>${row.actual_check_in || ""}</td>
                                                    <td>${row.actual_check_out || ""}</td>
                                                    <td>${row.status || ""}</td>
                                                    <td>${row.total_amount || ""}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr class="font-weight-bold">
                                                <td colspan="7" class="text-right">${__("Total")}</td>
                                                <td>${format_currency(totalAmount, frappe.defaults.get_default("currency"))}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                
                                <div class="guest-ledger-section mt-4">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h4>${__("Guest Ledger")}</h4>
                                        <button class="btn btn-sm btn-primary print-ledger-btn">${__("Print")}</button>
                                    </div>
                                    <table id="guest-ledger-table" class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th>${__("Posting Date")}</th>
                                                <th>${__("Account")}</th>
                                                <th>${__("Debit")}</th>
                                                <th>${__("Credit")}</th>
                                                <th>${__("Balance")}</th>
                                                <th>${__("Voucher Type")}</th>
                                                <th>${__("Voucher No")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${ledgerData.map(row => `
                                                <tr>
                                                    <td>${row.posting_date || ""}</td>
                                                    <td>${row.account || ""}</td>
                                                    <td>${row.debit || ""}</td>
                                                    <td>${row.credit || ""}</td>
                                                    <td>${row.balance || ""}</td>
                                                    <td>${row.voucher_type || ""}</td>
                                                    <td>
                                                        <a href="/app/${row.voucher_type.toLowerCase().replace(/ /g, "-")}/${row.voucher_no}" target="_blank">
                                                            ${row.voucher_no || ""}
                                                        </a>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr class="font-weight-bold">
                                                <td colspan="2" class="text-right">${__("Total")}</td>
                                                <td>${format_currency(totalDebit, frappe.defaults.get_default("currency"))}</td>
                                                <td>${format_currency(totalCredit, frappe.defaults.get_default("currency"))}</td>
                                                <td>${format_currency(finalBalance, frappe.defaults.get_default("currency"))}</td>
                                                <td colspan="2"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            `;
                            
                            frm.fields_dict.guest_folio.$wrapper.html(html);
                            
                            // Initialize DataTables for both tables
                            const historyTable = $('#guest-history-table').DataTable({
                                paging: true,
                                searching: true,
                                pageLength: 5,
                                lengthChange: false,
                                info: false,
                                order: [[2, 'desc']], // Sort by planned check-in date descending
                                language: {
                                    search: __("Search:"),
                                    paginate: {
                                        next: __("Next"),
                                        previous: __("Previous")
                                    }
                                }
                            });
                            
                            const ledgerTable = $('#guest-ledger-table').DataTable({
                                paging: true,
                                searching: true,
                                pageLength: 10,
                                lengthChange: false,
                                info: false,
                                order: [[0, 'desc']], // Sort by posting date descending
                                language: {
                                    search: __("Search:"),
                                    paginate: {
                                        next: __("Next"),
                                        previous: __("Previous")
                                    }
                                }
                            });
                            
                            // Handle print buttons
                            $('.print-history-btn').on('click', function() {
                                printTable('guest-history-table', __('Guest Stay History') + ' - ' + frm.doc.guest_customer);
                            });
                            
                            $('.print-ledger-btn').on('click', function() {
                                printTable('guest-ledger-table', __('Guest Ledger') + ' - ' + frm.doc.guest_customer);
                            });
                            
                        } else {
                            frappe.msgprint(__('No data found for this guest.'));
                        }
                    },
                    error: function (error) {
                        console.error("Error fetching guest data:", error);
                        frappe.msgprint(__('An error occurred while fetching the guest data.'));
                    }
                });
            }).catch(error => {
                console.error("Failed to load DataTables resources:", error);
                frappe.throw(__("Failed to load DataTables resources. Please check your internet connection."));
            });
            
            // Function to print a specific table
            function printTable(tableId, title) {
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
                            generatePrintWindow(tableId, title, company, logoUrl);
                            
                        } else {
                            // If company info can't be fetched, still print without it
                            generatePrintWindow(tableId, title, null, null);
                        }
                    }
                });
            }
            
            function generatePrintWindow(tableId, title, company, logoUrl) {
                const printWindow = window.open('', '_blank');
                const tableHtml = document.getElementById(tableId).outerHTML;
                const guestName = frm.doc.guest_customer;
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
                                tfoot tr {
                                    font-weight: bold;
                                    background-color: #f9f9f9;
                                }
                                hr {
                                    border: 0;
                                    border-top: 1px solid #ddd;
                                    margin: 20px 0;
                                }
                                @media print {
                                    @page { size: landscape; }
                                }
                                .print-footer {
                                    margin-top: 30px;
                                    text-align: center;
                                    font-size: 12px;
                                    color: #777;
                                }
                            </style>
                        </head>
                        <body>
                            ${companyHtml}
                            
                            <div class="report-title">
                                <h2>${title}</h2>
                            </div>
                            
                            <div class="report-info">
                                <p><strong>Guest:</strong> ${guestName}</p>
                                <p><strong>Date:</strong> ${today}</p>
                            </div>
                            
                            ${tableHtml}
                            
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
                        
    }
});


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
