import frappe 
from frappe import _
import json

def validate_check_in(doc, method):
    if frappe.db.exists("Check In", {"reservation": doc.reservation}):
        frappe.throw(_("Check In already exists for this reservation."))


@frappe.whitelist()
def create_sales_invoice(doc, method=None, charge=0):
    try:
        # If doc is a string (when called via whitelist), convert to JSON
        if isinstance(doc, str):
            doc = frappe.parse_json(doc)
            doc_name = doc.get("name")
        else:
            doc_name = doc.name

        charge = float(charge) if charge else 0
        amount = 0
        if charge > 0:
            amount = charge
        else:
            amount = doc.total_charge
        # Get room details
        room = frappe.get_doc("Room", doc.room)
        
        # Get income account and cost center
        company = frappe.defaults.get_user_default("company")
        income_account = frappe.get_cached_value("Company", company, "default_income_account")
        cost_center = frappe.get_cached_value("Company", company, "cost_center")
        
        # Get debit account
        debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
        
        # Create sales invoice
        si = frappe.new_doc("Sales Invoice")
        si.customer = doc.guest_name
        si.posting_date = doc.check_in_date
        si.due_date = doc.check_out_date
        si.company = company
        si.debit_to = debit_to
        
        # Add item
        si.append("items", {
            "item_code": room.room_item,
            "item_name": room.room_item,
            "description": doc.name,
            "qty": 1,
            "rate": amount,
            "amount": amount,
            "income_account": income_account,
            "cost_center": cost_center,
            "warehouse": frappe.db.get_value("Item Default", 
                                            {"parent": "Room Charge"}, 
                                            "default_warehouse")
        })
        
        # Save and submit the invoice
        si.insert(ignore_permissions=True)
        si.submit()
        
        # Update room status
        frappe.db.set_value("Room", doc.room, "status", "Occupied")
        frappe.db.set_value("Room", doc.room, "current_checkin", doc.name)

        frappe.db.set_value("Room", doc.room, "current_guest", doc.guest_name)
        frappe.db.set_value("Room", doc.room, "checkout_date", doc.check_out_date)

        frappe.db.set_value("Check In", doc_name, "sales_invoice_number", si.name)

        # check_in_doc = frappe.get_doc("Check In", doc_name)
        # check_in_doc.append("sales_invoices", {
        #     "sales_invoice": si.name,
        #     "room": doc.room,
        #     "amount": doc.total_charge,
        #     "status": si.status,
        #     "date": frappe.utils.today()
        # })
        # check_in_doc.save(ignore_permissions=True)

        frappe.db.commit()
        
        frappe.msgprint(_("Sales Invoice {0} created and room status updated to Occupied").format(
            frappe.bold(si.name)
        ))
        
        return {
            "sales_invoice": si.name,
            "refresh": True
        }   
    except Exception as e:
        frappe.log_error(message=str(e), title="Error Creating Sales Invoice")
        frappe.throw(_("An error occurred while creating the Sales Invoice: {0}").format(str(e)))

@frappe.whitelist()
def create_additional_sales_invoice_with_items(doc, method=None, charge=0):
    try:
        # If doc is a string (when called via whitelist), convert to JSON
        if isinstance(doc, str):
            doc = frappe.parse_json(doc)
            doc_name = doc.get("name")
        else:
            doc_name = doc.name

        charge = float(charge) if charge else 0
        amount = 0
        if charge > 0:
            amount = charge
        else:
            amount = doc.total_charge
        # Get room details
        room = frappe.get_doc("Room", doc.room)
        
        # Get income account and cost center
        company = frappe.defaults.get_user_default("company")
        income_account = frappe.get_cached_value("Company", company, "default_income_account")
        cost_center = frappe.get_cached_value("Company", company, "cost_center")
        
        # Get debit account
        debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
        
        # Create sales invoice
        si = frappe.new_doc("Sales Invoice")
        si.customer = doc.guest_name
        si.posting_date = doc.check_in_date
        si.due_date = doc.check_out_date
        si.company = company
        si.debit_to = debit_to
        
        # Add item
        si.append("items", {
            "item_code": room.room_item,
            "item_name": room.room_item,
            "description": doc.name,
            "qty": 1,
            "rate": amount,
            "amount": amount,
            "income_account": income_account,
            "cost_center": cost_center,
            "warehouse": frappe.db.get_value("Item Default", 
                                            {"parent": "Room Charge"}, 
                                            "default_warehouse")
        })
        
        # Save and submit the invoice
        si.insert(ignore_permissions=True)
        si.submit()
        
        # # Update room status
        # frappe.db.set_value("Room", doc.room, "status", "Occupied")
        # frappe.db.set_value("Room", doc.room, "current_checkin", doc.name)

        # frappe.db.set_value("Room", doc.room, "current_guest", doc.guest_name)
        # frappe.db.set_value("Room", doc.room, "checkout_date", doc.check_out_date)

        # frappe.db.set_value("Check In", doc_name, "sales_invoice_number", si.name)

        # check_in_doc = frappe.get_doc("Check In", doc_name)
        # check_in_doc.append("sales_invoices", {
        #     "sales_invoice": si.name,
        #     "room": doc.room,
        #     "amount": doc.total_charge,
        #     "status": si.status,
        #     "date": frappe.utils.today()
        # })
        # check_in_doc.save(ignore_permissions=True)

        # frappe.db.commit()
        
        # frappe.msgprint(_("Sales Invoice {0} created and room status updated to Occupied").format(
        #     frappe.bold(si.name)
        # ))
        
        return {
            "sales_invoice": si.name,
            "refresh": True
        }   
    except Exception as e:
        frappe.log_error(message=str(e), title="Error Creating Sales Invoice")
        frappe.throw(_("An error occurred while creating the Sales Invoice: {0}").format(str(e)))


@frappe.whitelist()
def create_additional_sales_invoice_with_booking(doc, method=None, charge=0):
    try:
        # If doc is a string (when called via whitelist), convert to JSON
        if isinstance(doc, str):
            doc = frappe.parse_json(doc)
            doc_name = doc.get("name")
        else:
            doc_name = doc.name

        charge = float(charge) if charge else 0
        amount = 0
        if charge > 0:
            amount = charge
        else:
            amount = doc.total_charge
        # Get room details
        venue = frappe.get_doc("Venue", doc.venue)
        
        # Get income account and cost center
        company = frappe.defaults.get_user_default("company")
        income_account = frappe.get_cached_value("Company", company, "default_income_account")
        cost_center = frappe.get_cached_value("Company", company, "cost_center")
        
        # Get debit account
        debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
        
        # Create sales invoice
        si = frappe.new_doc("Sales Invoice")
        si.customer = doc.guest_name
        si.posting_date = doc.check_in_date
        si.due_date = doc.check_out_time
        si.company = company
        si.debit_to = debit_to
        
        # Add item
        si.append("items", {
            "item_code": venue.venue_item,
            "item_name": venue.venue_item,
            "description": doc.name,
            "qty": 1,
            "rate": amount,
            "amount": amount,
            "income_account": income_account,
            "cost_center": cost_center,
            # "warehouse": frappe.db.get_value("Item Default", 
            #                                 {"parent": "Room Charge"}, 
            #                                 "default_warehouse")
        })
        
        # Save and submit the invoice
        si.insert(ignore_permissions=True)
        si.submit()
        
        # # Update room status
        # frappe.db.set_value("Room", doc.room, "status", "Occupied")
        # frappe.db.set_value("Room", doc.room, "current_checkin", doc.name)

        # frappe.db.set_value("Room", doc.room, "current_guest", doc.guest_name)
        # frappe.db.set_value("Room", doc.room, "checkout_date", doc.check_out_date)

        # frappe.db.set_value("Check In", doc_name, "sales_invoice_number", si.name)

        # check_in_doc = frappe.get_doc("Check In", doc_name)
        # check_in_doc.append("sales_invoices", {
        #     "sales_invoice": si.name,
        #     "room": doc.room,
        #     "amount": doc.total_charge,
        #     "status": si.status,
        #     "date": frappe.utils.today()
        # })
        # check_in_doc.save(ignore_permissions=True)

        # frappe.db.commit()
        
        # frappe.msgprint(_("Sales Invoice {0} created and room status updated to Occupied").format(
        #     frappe.bold(si.name)
        # ))
        
        return {
            "sales_invoice": si.name,
            "refresh": True
        }   
    except Exception as e:
        frappe.log_error(message=str(e), title="Error Creating Sales Invoice")
        frappe.throw(_("An error occurred while creating the Sales Invoice: {0}").format(str(e)))



@frappe.whitelist()
def get_payment_entries_for_invoices(invoice_names):
    """
    Get payment entries for a list of sales invoices
    
    Args:
        invoice_names (list): List of sales invoice names
    
    Returns:
        list: List of payment entry details
    """
    if not invoice_names:
        return []
    
    # Convert string to list if needed
    if isinstance(invoice_names, str):
        import json
        invoice_names = json.loads(invoice_names)
    
    result = []
    
    # Get all payment references for these invoices
    payment_refs = frappe.get_all(
        "Payment Entry Reference",
        filters={
            "reference_doctype": "Sales Invoice",
            "reference_name": ["in", invoice_names],
            "docstatus": 1
        },
        fields=["parent", "reference_name", "allocated_amount"]
    )
    
    # Get payment entry details for each reference
    for ref in payment_refs:
        payment_entry = frappe.get_doc("Payment Entry", ref.parent)
        
        result.append({
            "sales_invoice": ref.reference_name,
            "payment_entry": payment_entry.name,
            "payment_date": payment_entry.posting_date,
            "amount": ref.allocated_amount,
            "payment_type": payment_entry.payment_type,
            "mode_of_payment": payment_entry.mode_of_payment
        })
    
    return result

@frappe.whitelist()
def update_check_in_payment_entries(check_in, payment_entries, room_sales, room_payments, room_folio_balance):
    """Update payment entries in Check In document without changing docstatus"""
    if isinstance(payment_entries, str):
        payment_entries = json.loads(payment_entries)
    
    # Get the document
    doc = frappe.get_doc("Check In", check_in)
    # check_in_doc = frappe.get_doc("Check In", check_in)
    doc.room_sales = room_sales
    doc.room_payments = room_payments
    doc.room_folio_balance = room_folio_balance
    
    # Clear existing entries
    doc.sales_invoices_payments = []
    
    # Add new entries
    for payment in payment_entries:
        doc.append("sales_invoices_payments", {
            "sales_invoice": payment.get("sales_invoice"),
            "payment_entry": payment.get("payment_entry"),
            "payment_date": payment.get("payment_date"),
            "amount": payment.get("amount"),
            "payment_type": payment.get("payment_type"),
            "mode_of_payment": payment.get("mode_of_payment")
        })
    
    # Save without validations to avoid docstatus issues
    doc.flags.ignore_validate = True
    doc.flags.ignore_validate_update_after_submit = True
    doc.save(ignore_permissions=True)
    
    return True

@frappe.whitelist()
def check_sales_invoices_payment_status(invoice_name, check_in):
    """Check and update payment status of sales invoices in Check In document"""
    # if isinstance(invoice_names, str):
    #     invoice_names = json.loads(invoice_names)
    
    updated = False
    
    # Get the check-in document
    check_in_doc = frappe.get_doc("Check In", check_in)
    
    # For each invoice in the child table
    # for invoice_row in check_in_doc.sales_invoices:
    if check_in_doc.sales_invoice_number:
        # Get the current status from the Sales Invoice
        current_status = frappe.db.get_value("Sales Invoice", check_in_doc.sales_invoice_number, 
                                            ["status", "outstanding_amount"], as_dict=True)
        
        if current_status:
            # Check if the invoice is paid
            is_paid = current_status.status == "Paid" or current_status.outstanding_amount == 0
            
            # If the status in the child table doesn't match the actual status
            if (is_paid and check_in_doc.sales_invoice_status != "Paid") or (not is_paid and check_in_doc.sales_invoice_status == "Paid"):
                # Update the status in the child table
                check_in_doc.sales_invoice_status = "Paid" if is_paid else "Unpaid"
                updated = True
    
    # If any updates were made, save the document
    if updated:
        check_in_doc.flags.ignore_validate_update_after_submit = True
        check_in_doc.save(ignore_permissions=True)
    
    return {"updated": updated}

@frappe.whitelist()
def check_sales_invoices_payment_status_for_booking(invoice_name, check_in):
    """Check and update payment status of sales invoices in Check In document"""
    # if isinstance(invoice_names, str):
    #     invoice_names = json.loads(invoice_names)
    
    updated = False
    
    # Get the check-in document
    check_in_doc = frappe.get_doc("Booking", check_in)
    
    # For each invoice in the child table
    # for invoice_row in check_in_doc.sales_invoices:
    if check_in_doc.sales_invoice_number:
        # Get the current status from the Sales Invoice
        current_status = frappe.db.get_value("Sales Invoice", check_in_doc.sales_invoice_number, 
                                            ["status", "outstanding_amount"], as_dict=True)
        
        if current_status:
            # Check if the invoice is paid
            is_paid = current_status.status == "Paid" or current_status.outstanding_amount == 0
            
            # If the status in the child table doesn't match the actual status
            if (is_paid and check_in_doc.sales_invoice_status != "Paid") or (not is_paid and check_in_doc.sales_invoice_status == "Paid"):
                # Update the status in the child table
                check_in_doc.sales_invoice_status = "Paid" if is_paid else "Unpaid"
                updated = True
    
    # If any updates were made, save the document
    if updated:
        check_in_doc.flags.ignore_validate_update_after_submit = True
        check_in_doc.save(ignore_permissions=True)
    
    return {"updated": updated}


@frappe.whitelist()
def make_payment_entry(check_in, sales_invoice, payment_method, amount, payment_date, reference_no=None, reference_date=None, remarks=None):
    """
    Create a Payment Entry for a Sales Invoice related to a Check In
    """
    try:
        # Get the sales invoice details
        invoice = frappe.get_doc("Sales Invoice", sales_invoice)
        
        # Get the check in details
        check_in_doc = frappe.get_doc("Check In", check_in)
        
        # Determine payment account based on payment method
        payment_account = get_payment_account(payment_method)
        
        # Create a new Payment Entry
        payment_entry = frappe.new_doc("Payment Entry")
        payment_entry.payment_type = "Receive"
        payment_entry.mode_of_payment = payment_method
        payment_entry.party_type = "Customer"
        payment_entry.party = invoice.customer
        payment_entry.paid_from = invoice.debit_to
        payment_entry.paid_to = payment_account
        payment_entry.paid_amount = float(amount)
        payment_entry.received_amount = float(amount)
        payment_entry.reference_no = reference_no
        payment_entry.reference_date = reference_date
        payment_entry.posting_date = payment_date
        payment_entry.remarks = remarks or f"Payment against Sales Invoice {invoice.name} for Check In {check_in}"
        
        # Add the reference to the sales invoice
        payment_entry.append("references", {
            "reference_doctype": "Sales Invoice",
            "reference_name": invoice.name,
            "total_amount": invoice.grand_total,
            "outstanding_amount": invoice.outstanding_amount,
            "allocated_amount": float(amount)
        })
        
        # Set the check in reference
        payment_entry.check_in_reference = check_in
        
        # Save and submit the payment entry
        payment_entry.setup_party_account_field()
        payment_entry.set_missing_values()
        payment_entry.set_exchange_rate()
        payment_entry.set_amounts()
        payment_entry.save()
        payment_entry.submit()

        frappe.db.set_value("Check In", check_in, "payment_entry", payment_entry.name)
        frappe.db.set_value("Check In", check_in, "balance_due", invoice.outstanding_amount)


        
        # Update the check in document if needed
        update_check_in_payment_status(check_in_doc, invoice)
        
        return payment_entry.name
    
    except Exception as e:
        frappe.log_error(f"Error creating payment entry: {str(e)}", "Payment Entry Creation Error")
        frappe.throw(f"Error creating payment entry: {str(e)}")

def get_payment_account(payment_method):
    """
    Get the appropriate payment account based on the payment method
    """
    # Map payment methods to account names
    payment_accounts = {
        "Cash": "Cash - HHM",  # Replace with actual account code
        "Credit Card": "Debtors - HHM",  # Replace with actual account code
        "Debit Card": "Debtors - HHM",  # Replace with actual account code
        "Bank Transfer": "Bank - HHM",  # Replace with actual account code
        "Mobile Payment": "Cash - HHM"  # Replace with actual account code
    }
    
    # Get the default company
    company = frappe.defaults.get_user_default("Company")
    
    # Get the account based on payment method
    account_name = payment_accounts.get(payment_method, "Cash - HHM")
    
    # Try to get the account
    try:
        account = frappe.get_all(
            "Account",
            filters={"account_name": account_name, "company": company},
            fields=["name"],
            limit=1
        )
        if account:
            return account[0].name
    except Exception:
        pass
    
    # Fallback to getting a default account
    return frappe.get_value("Company", company, "default_cash_account")

def update_check_in_payment_status(check_in_doc, invoice):
    """
    Update the check in document's payment status if needed
    """
    # You can add logic here to update the check in document
    # For example, mark as paid if all invoices are paid
    
    # Check if the invoice is fully paid
    if invoice.outstanding_amount <= 0:
        # Update check in status or add a comment
        check_in_doc.add_comment("Comment", f"Invoice {invoice.name} has been fully paid")
        check_in_doc.save()

from erpnext.accounts.report.general_ledger.general_ledger import execute
from frappe.utils import getdate
@frappe.whitelist()
def get_check_in_gl_entries(check_in):
    """Get General Ledger entries related to this Check In"""
    check_in_doc = frappe.get_doc("Check In", check_in)
    
    if not check_in_doc.guest_name:
        return {
            "columns": [],
            "data": []
        }
    
    # Define filters based on the Check In document
    filters = frappe._dict({
        "company": check_in_doc.company or "Havano",
       "from_date": getdate(check_in_doc.check_in_date),
        "to_date": getdate(check_in_doc.check_out_date or frappe.utils.today()),
        "party_type": "Customer",
        "party": json.dumps([check_in_doc.guest_name]) # Pass the guest name directly
    })
    
    # Run the General Ledger report
    columns, data = execute(filters)
    
    return {
        "columns": columns,
        "data": data
    }

