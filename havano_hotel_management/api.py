import frappe 
from frappe import _
from frappe.utils import flt, getdate, today
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
        
        # Get the customer from the Hotel Guest
        guest = frappe.get_doc("Hotel Guest", doc.guest_name)
        if not guest.guest_customer:
            frappe.throw(_("No customer linked to guest {0}. Please ensure the guest has a customer.").format(doc.guest_name))
        customer = guest.guest_customer
        
        # Get income account and cost center
        company = frappe.defaults.get_user_default("company")
        income_account = frappe.get_cached_value("Company", company, "default_income_account")
        cost_center = frappe.get_cached_value("Company", company, "cost_center")
        
        # Get debit account
        debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
        
        # Create sales invoice
        si = frappe.new_doc("Sales Invoice")
        si.customer = customer
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
        
        # NOTE: Room update (status, current_checkin, current_guest, checkout_date) 
        # is NOT done automatically on Check In submit
        # Room should be updated manually or through a separate process
        # This prevents automatic room updates that may not be desired

        frappe.db.set_value("Check In", doc_name, "sales_invoice_number", si.name)
        
        # Set balance_due to total_charge on submit (if not already set)
        if not doc.balance_due and doc.total_charge:
            frappe.db.set_value("Check In", doc_name, "balance_due", doc.total_charge, update_modified=False)
        # Set amount_paid to 0 initially if not set
        if not doc.amount_paid:
            frappe.db.set_value("Check In", doc_name, "amount_paid", 0, update_modified=False)

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
        
        # frappe.msgprint(_("Sales Invoice {0} created and room status updated to Occupied").format(
        #     frappe.bold(si.name)
        # ))
        
        return {
            "sales_invoice": si.name,
            "refresh": True
        }   
    except Exception as e:
        frappe.log_error(title="Error Creating Sales Invoice", message=str(e))
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
        
        # Get the customer from the Hotel Guest
        guest = frappe.get_doc("Hotel Guest", doc.guest_name)
        if not guest.guest_customer:
            frappe.throw(_("No customer linked to guest {0}. Please ensure the guest has a customer.").format(doc.guest_name))
        customer = guest.guest_customer
        
        # Get income account and cost center
        company = frappe.defaults.get_user_default("company")
        income_account = frappe.get_cached_value("Company", company, "default_income_account")
        cost_center = frappe.get_cached_value("Company", company, "cost_center")
        
        # Get debit account
        debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
        
        # Create sales invoice
        si = frappe.new_doc("Sales Invoice")
        si.customer = customer
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
        frappe.log_error(title="Error Creating Sales Invoice", message=str(e))
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
        frappe.log_error(title="Error Creating Sales Invoice", message=str(e))
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
def make_payment_entry(payment_method, amount, payment_date, check_in=None, customer=None, sales_invoice=None, reference_no=None, reference_date=None, remarks=None):
    """
    Create a Payment Entry for all Sales Invoices related to a Customer
    If sales_invoice is provided, it will be used; otherwise, all outstanding invoices for the customer will be used
    Backward compatible: can be called with sales_invoice (old way) or customer (new way)
    check_in is optional - required for rooms with check-in, optional for reserved rooms
    """
    try:
        # Determine payment account based on payment method
        payment_account = get_payment_account(payment_method)
        
        # Handle backward compatibility: if sales_invoice is provided but customer is not, get customer from invoice
        if sales_invoice and not customer:
            invoice = frappe.get_doc("Sales Invoice", sales_invoice)
            customer = invoice.customer
        
        # Validate customer is available
        if not customer:
            frappe.throw(_("Customer is required. Please provide customer or sales_invoice."))
        
        # Get customer details
        customer_doc = frappe.get_doc("Customer", customer)
        
        # Get company - from check_in if available, otherwise from defaults
        if check_in:
            check_in_doc = frappe.get_doc("Check In", check_in)
            company = check_in_doc.company or frappe.defaults.get_user_default("Company")
        else:
            company = frappe.defaults.get_user_default("Company")
        
        # Get customer's debtors account
        debtors_account = frappe.get_value("Company", company, "default_receivable_account")
        if not debtors_account:
            debtors_account = customer_doc.default_receivable_account or None
        
        if not debtors_account:
            frappe.throw(_("Please set default receivable account for company {0} or customer {1}").format(company, customer))
        
        # Get all outstanding sales invoices for the customer
        invoices = []
        if sales_invoice:
            # If specific invoice provided, use only that
            invoices = [frappe.get_doc("Sales Invoice", sales_invoice)]
        else:
            # Get all outstanding invoices for the customer
            invoice_list = frappe.get_all(
                "Sales Invoice",
                filters={
                    "customer": customer,
                    "outstanding_amount": [">", 0],
                    "docstatus": 1
                },
                fields=["name"],
                order_by="posting_date asc"
            )
            invoices = [frappe.get_doc("Sales Invoice", inv.name) for inv in invoice_list]
        
        # Create a new Payment Entry
        payment_entry = frappe.new_doc("Payment Entry")
        payment_entry.payment_type = "Receive"
        payment_entry.mode_of_payment = payment_method
        payment_entry.party_type = "Customer"
        payment_entry.party = customer
        payment_entry.paid_from = debtors_account
        payment_entry.paid_to = payment_account
        payment_entry.paid_amount = float(amount)
        payment_entry.received_amount = float(amount)
        payment_entry.reference_no = reference_no
        payment_entry.reference_date = reference_date
        payment_entry.posting_date = payment_date
        
        # Set remarks based on context
        if check_in:
            payment_entry.remarks = remarks or f"Payment for Check In {check_in}"
        else:
            payment_entry.remarks = remarks or f"Payment for customer {customer}"
        
        # Allocate payment amount across invoices if available
        remaining_amount = float(amount)
        invoice_names = []
        
        if invoices:
            # Calculate total outstanding amount
            total_outstanding = sum([float(inv.outstanding_amount) for inv in invoices])
            
            # Allocate payment amount across all invoices
            for invoice in invoices:
                if remaining_amount <= 0:
                    break
                
                outstanding = float(invoice.outstanding_amount)
                allocated = min(remaining_amount, outstanding)
                
                payment_entry.append("references", {
                    "reference_doctype": "Sales Invoice",
                    "reference_name": invoice.name,
                    "total_amount": invoice.grand_total,
                    "outstanding_amount": outstanding,
                    "allocated_amount": allocated
                })
                
                remaining_amount -= allocated
                invoice_names.append(invoice.name)
        # If no invoices, payment will be unallocated (advance payment)
        
        # Set the check in reference if available
        if check_in:
            payment_entry.check_in_reference = check_in
        
        # Save and submit the payment entry
        payment_entry.setup_party_account_field()
        payment_entry.set_missing_values()
        payment_entry.set_exchange_rate()
        payment_entry.set_amounts()
        payment_entry.save()
        payment_entry.submit()

        # Update check-in if available
        if check_in:
            check_in_doc = frappe.get_doc("Check In", check_in)
            
            # Get all payment entries for this check-in
            payment_entries = frappe.get_all(
                "Payment Entry",
                filters={
                    "check_in_reference": check_in,
                    "docstatus": 1  # Only submitted payments
                },
                fields=["paid_amount"]
            )
            
            # Calculate total amount paid
            total_amount_paid = sum([float(pe.paid_amount) for pe in payment_entries])
            
            # Update check-in with payment entry and calculated amounts
            frappe.db.set_value("Check In", check_in, "payment_entry", payment_entry.name)
            frappe.db.set_value("Check In", check_in, "amount_paid", total_amount_paid)
            
            # Calculate balance_due = total_charge - amount_paid
            balance_due = float(check_in_doc.total_charge or 0) - total_amount_paid
            frappe.db.set_value("Check In", check_in, "balance_due", balance_due)
            
            # Update the check in document if needed (use first invoice if available)
            if invoices:
                update_check_in_payment_status(check_in_doc, invoices[0])
        
        frappe.db.commit()
        
        if invoice_names:
            invoice_list_str = ", ".join(invoice_names)
            message = f"Payment Entry {payment_entry.name} created and submitted successfully for invoices: {invoice_list_str}."
        else:
            message = f"Payment Entry {payment_entry.name} created and submitted successfully as advance payment for customer {customer}."
        
        return {
            "success": True,
            "payment_entry": payment_entry.name,
            "message": message
        }
    
    except Exception as e:
        frappe.log_error(title="Payment Entry Creation Error", message=f"Error creating payment entry: {str(e)}")
        frappe.db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to create payment entry: {str(e)}"
        }

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

@frappe.whitelist()
def make_payment_entry_for_reservation(reservation, guest, payment_method, amount, payment_date, sales_invoice=None, reference_no=None, reference_date=None, remarks=None):
    """
    Create a Payment Entry for a Reservation
    Can work with or without a Sales Invoice
    """
    try:
        # Get the reservation details
        reservation_doc = frappe.get_doc("Reservation", reservation)
        
        # Get guest details to determine customer account
        guest_doc = frappe.get_doc("Hotel Guest", guest)
        customer = guest_doc.guest_customer if hasattr(guest_doc, 'guest_customer') and guest_doc.guest_customer else None
        
        if not customer:
            frappe.throw(_("No customer linked to guest {0}. Please link a customer to the guest first.").format(guest))
        
        # Determine payment account based on payment method
        payment_account = get_payment_account(payment_method)
        
        # Get customer's debtors account
        company = reservation_doc.company or frappe.defaults.get_user_default("Company")
        debtors_account = frappe.get_value("Company", company, "default_receivable_account")
        if not debtors_account:
            # Try to get from customer
            if frappe.db.exists("Customer", customer):
                customer_doc = frappe.get_doc("Customer", customer)
                debtors_account = customer_doc.default_receivable_account or None
        
        if not debtors_account:
            frappe.throw(_("Please set default receivable account for company {0} or customer {1}").format(company, customer))
        
        # Create a new Payment Entry
        payment_entry = frappe.new_doc("Payment Entry")
        payment_entry.payment_type = "Receive"
        payment_entry.mode_of_payment = payment_method
        payment_entry.party_type = "Customer"
        payment_entry.party = customer
        payment_entry.paid_from = debtors_account
        payment_entry.paid_to = payment_account
        payment_entry.paid_amount = float(amount)
        payment_entry.received_amount = float(amount)
        payment_entry.reference_no = reference_no
        payment_entry.reference_date = reference_date
        payment_entry.posting_date = payment_date
        payment_entry.remarks = remarks or f"Payment for Reservation {reservation}"
        
        # If sales invoice is provided, add reference to it
        if sales_invoice and frappe.db.exists("Sales Invoice", sales_invoice):
            invoice = frappe.get_doc("Sales Invoice", sales_invoice)
            payment_entry.append("references", {
                "reference_doctype": "Sales Invoice",
                "reference_name": invoice.name,
                "total_amount": invoice.grand_total,
                "outstanding_amount": invoice.outstanding_amount,
                "allocated_amount": float(amount)
            })
            payment_entry.remarks = remarks or f"Payment against Sales Invoice {invoice.name} for Reservation {reservation}"
        
        # Set reservation reference if the field exists
        if hasattr(payment_entry, 'reservation_reference'):
            payment_entry.reservation_reference = reservation
        
        # Save and submit the payment entry
        payment_entry.setup_party_account_field()
        payment_entry.set_missing_values()
        payment_entry.set_exchange_rate()
        payment_entry.set_amounts()
        payment_entry.save()
        payment_entry.submit()
        
        return payment_entry.name
    
    except Exception as e:
        frappe.log_error(title="Reservation Payment Entry Creation Error", message=f"Error creating payment entry for reservation: {str(e)}\n{frappe.get_traceback()}")
        frappe.throw(f"Error creating payment entry: {str(e)}")

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


def create_hotel_guest_from_customer(doc, method):
    """
    Hook function to create a Hotel Guest when a Customer is created
    """
    try:
        # Skip if this customer was created from a Hotel Guest (to avoid circular creation)
        if hasattr(doc.flags, 'from_hotel_guest') and doc.flags.from_hotel_guest:
            return
        
        # Also check frappe.flags to prevent circular creation
        if hasattr(frappe.flags, 'creating_customer_from_guest') and frappe.flags.creating_customer_from_guest:
            return
        
        # Check if a Hotel Guest already exists for this customer
        existing_guest = frappe.db.exists("Hotel Guest", {"guest_customer": doc.name})
        if existing_guest:
            return  # Guest already exists, skip creation
        
        # Also check if a guest with the same full_name exists (in case guest was created first)
        customer_name = doc.customer_name or ""
        if customer_name:
            existing_guest_by_name = frappe.db.exists("Hotel Guest", {"full_name": customer_name})
            if existing_guest_by_name:
                # Link the existing guest to this customer
                frappe.db.set_value("Hotel Guest", existing_guest_by_name, "guest_customer", doc.name)
                return
        
        # Parse customer name to extract first and last name
        customer_name = doc.customer_name or ""
        name_parts = customer_name.strip().split()
        
        # Determine first name and last name
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = " ".join(name_parts[1:])  # Everything after first name
        elif len(name_parts) == 1:
            first_name = name_parts[0]
            last_name = name_parts[0]  # Use same name if only one part
        else:
            first_name = customer_name
            last_name = customer_name
        
        # Get customer email and phone from contact if available
        guest_email = None
        guest_phone = None
        
        # Try to get email and phone from customer's primary contact
        if hasattr(doc, 'email_id') and doc.email_id:
            guest_email = doc.email_id
        if hasattr(doc, 'mobile_no') and doc.mobile_no:
            guest_phone = doc.mobile_no
        
        # If not found in customer, try to get from linked contacts
        if not guest_email or not guest_phone:
            contacts = frappe.get_all(
                "Dynamic Link",
                filters={
                    "link_doctype": "Customer",
                    "link_name": doc.name,
                    "parenttype": "Contact"
                },
                fields=["parent"]
            )
            
            if contacts:
                contact = frappe.get_doc("Contact", contacts[0].parent)
                if not guest_email and contact.email_ids:
                    guest_email = contact.email_ids[0].email_id
                if not guest_phone and contact.phone_nos:
                    guest_phone = contact.phone_nos[0].phone
        
        # Create Hotel Guest
        # Construct full_name from first_name and last_name
        full_name = f"{first_name} {last_name}".strip()
        
        # Get customer TIN and VAT if available
        customer_tin = None
        customer_vat = None
        if hasattr(doc, 'custom_customer_tin') and doc.custom_customer_tin:
            customer_tin = str(doc.custom_customer_tin)
        if hasattr(doc, 'custom_customer_vat') and doc.custom_customer_vat:
            # Truncate VAT to 9 characters if longer
            customer_vat = str(doc.custom_customer_vat)[:9]
        
        guest_doc = frappe.get_doc({
            "doctype": "Hotel Guest",
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
            "guest_customer": doc.name,
            "guest_email": guest_email,
            "guest_phone_number": guest_phone,
            "gender": doc.gender if hasattr(doc, 'gender') and doc.gender else None,
            "customer_tin": customer_tin,
            "customer_vat": customer_vat
        })
        
        # Disable the before_insert hook to avoid creating another customer
        guest_doc.flags.ignore_validate_guest_customer = True
        guest_doc.insert(ignore_permissions=True)
        
        frappe.db.commit()
        
    except Exception as e:
        # Log error but don't throw to avoid breaking customer creation
        frappe.log_error(
            title="Error Creating Hotel Guest from Customer",
            message=f"Error creating Hotel Guest for Customer {doc.name}: {str(e)}\n{frappe.get_traceback()}"
        )


def update_check_in_balance_on_payment_entry_submit(doc, method):
    """
    Hook function to update Check In payment fields when Payment Entry is submitted
    Recalculates total_balance, amount_paid, and balance_due
    """
    if not doc.check_in_reference:
        return
    
    try:
        check_in_name = doc.check_in_reference
        check_in_doc = frappe.get_doc("Check In", check_in_name)
        
        # Recalculate all payment fields using the CheckIn method
        check_in_doc.calculate_payment_fields()
        
        # Get current values from database to compare
        current_values = frappe.db.get_value(
            "Check In",
            check_in_name,
            ["total_balance", "amount_paid", "balance_due"],
            as_dict=True
        )
        
        # Update only if values changed (without triggering modified timestamp)
        update_data = {}
        if current_values.get("total_balance") != check_in_doc.total_balance:
            update_data["total_balance"] = check_in_doc.total_balance
        if current_values.get("amount_paid") != check_in_doc.amount_paid:
            update_data["amount_paid"] = check_in_doc.amount_paid
        if current_values.get("balance_due") != check_in_doc.balance_due:
            update_data["balance_due"] = check_in_doc.balance_due
        
        if update_data:
            frappe.db.set_value("Check In", check_in_name, update_data, update_modified=False)
            frappe.db.commit()
        
    except Exception as e:
        frappe.log_error(
            title="Error Updating Check In Balance",
            message=f"Error updating Check In balance on Payment Entry submit: {str(e)}\n{frappe.get_traceback()}"
        )


@frappe.whitelist()
def update_room_statuses_from_reservations():
    """
    Cron job to update room statuses based on reservations
    - Sets room to Reserved on check_in_date
    - Makes room Available after check_out_date (if not occupied)
    """
    try:
        from frappe.utils import getdate, today, now_datetime
        
        today_date = getdate(today())
        current_datetime = now_datetime()
        
        # Get all submitted reservations
        reservations = frappe.get_all(
            "Reservation",
            filters={"docstatus": 1},
            fields=["name", "room", "check_in_date", "check_out_date"]
        )
        
        updated_count = 0
        
        for reservation in reservations:
            if not reservation.room:
                continue
                
            room = frappe.get_doc("Room", reservation.room)
            res_check_in = getdate(reservation.check_in_date) if reservation.check_in_date else None
            res_check_out = getdate(reservation.check_out_date) if reservation.check_out_date else None
            
            # If check_in_date is today or earlier, set room to Reserved
            if res_check_in and res_check_in <= today_date:
                # Only set to Reserved if room is Available and reservation matches
                if room.status == "Available" and room.reservation == reservation.name:
                    # Use helper function to ensure calculated fields are updated
                    from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                    update_room_fields(reservation.room, {"status": "Reserved"})
                    updated_count += 1
            
            # If check_out_date has passed and room is Reserved (not Occupied), make it Available
            if res_check_out and res_check_out < today_date:
                if room.status == "Reserved" and room.reservation == reservation.name:
                    # Check if there's an active check-in for this room
                    active_checkin = frappe.db.get_value(
                        "Check In",
                        {
                            "room": reservation.room,
                            "docstatus": 1,
                            "actual_checkout_date": ["is", "not set"]
                        },
                        "name"
                    )
                    
                    # Only make available if no active check-in
                    if not active_checkin:
                        # Use helper function to ensure calculated fields are updated
                        from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                        update_room_fields(reservation.room, {
                            "status": "Available",
                            "reservation": ""
                        })
                        updated_count += 1
        
        frappe.db.commit()
        
        if updated_count > 0:
            frappe.logger().info(f"Updated {updated_count} room statuses from reservations")
        
        return {"updated": updated_count}
        
    except Exception as e:
        frappe.log_error(
            title="Error in Reservation Room Status Update",
            message=f"Error updating room statuses from reservations: {str(e)}\n{frappe.get_traceback()}"
        )
        return {"error": str(e)}


@frappe.whitelist()
def get_payment_entry_for_check_in(sales_invoice, check_in):
    """
    Get payment entry for a sales invoice with check_in_reference pre-filled
    """
    try:
        from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
        
        # Get the payment entry document
        payment_entry = get_payment_entry("Sales Invoice", sales_invoice)
        
        # Set the check_in_reference
        payment_entry.check_in_reference = check_in
        
        # Return the document as a dict
        return payment_entry.as_dict()
    
    except Exception as e:
        frappe.log_error(
            title="Error Getting Payment Entry",
            message=f"Error getting payment entry for Check In {check_in}: {str(e)}\n{frappe.get_traceback()}"
        )
        frappe.throw(_("An error occurred while creating the Payment Entry. Please try again later."))

@frappe.whitelist()
def get_total_balance(guest_name=None, company=None, posting_date=None):
    """Return Customer's balance in Accounts Receivable for the given Hotel Guest."""
    from frappe.utils import flt, nowdate

    if not guest_name:
        return 0

    company = company or frappe.defaults.get_user_default("company")
    if not company:
        return 0

    customer = frappe.db.get_value("Hotel Guest", guest_name, "guest_customer")
    if not customer:
        return 0

    receivable_account = frappe.get_cached_value("Company", company, "default_receivable_account")
    if not receivable_account:
        return 0

    posting_date = posting_date or nowdate()

    # Preferred: ERPNext helper (handles fiscal year validations, etc.)
    try:
        from erpnext.accounts.utils import get_balance_on

        balance = get_balance_on(
            account=receivable_account,
            date=posting_date,
            party_type="Customer",
            party=customer,
            company=company,
            in_account_currency=True,
        )
        return flt(balance)
    except Exception:
        # Fallback: sum GL entries
        balance = frappe.db.sql(
            """
            SELECT COALESCE(SUM(debit - credit), 0)
            FROM `tabGL Entry`
            WHERE
                is_cancelled = 0
                AND company = %s
                AND account = %s
                AND party_type = 'Customer'
                AND party = %s
                AND posting_date <= %s
            """,
            (company, receivable_account, customer, posting_date),
        )[0][0]
        return flt(balance)


@frappe.whitelist()
def create_and_submit_checkout(check_in, actual_check_out_time, room_condition, notes=None, check_out_by=None):
    """
    Create and submit a Check Out document from Check In
    Also updates Check In and Room status
    """
    try:
        # Check if checkout already exists
        existing_checkout = frappe.db.exists("Check Out", {"check_in": check_in})
        if existing_checkout:
            frappe.throw(_("Check out already exists for this check-in."))
        
        # Get Check In document
        check_in_doc = frappe.get_doc("Check In", check_in)
        
        # Create Check Out document
        checkout_doc = frappe.new_doc("Check Out")
        checkout_doc.check_in = check_in
        checkout_doc.guest = check_in_doc.guest_name
        checkout_doc.room = check_in_doc.room
        checkout_doc.actual_check_out_time = actual_check_out_time
        checkout_doc.days_stayed = check_in_doc.nights or ""
        checkout_doc.room_condition = room_condition
        checkout_doc.check_out_by = check_out_by or frappe.session.user
        checkout_doc.notes = notes or ""
        checkout_doc.balance_due = check_in_doc.balance_due or 0
        
        if check_in_doc.sales_invoice_number:
            checkout_doc.sales_invoice_number = check_in_doc.sales_invoice_number
        
        if check_in_doc.total_charge:
            checkout_doc.total_charges = check_in_doc.total_charge
        
        if check_in_doc.amount_paid:
            checkout_doc.payment_collected = check_in_doc.amount_paid
        
        # Save the Check Out document
        checkout_doc.insert(ignore_permissions=True)
        
        # Submit the Check Out document
        checkout_doc.submit()
        
        # Update Check In document with actual checkout date
        frappe.db.set_value("Check In", check_in, {"actual_checkout_date": actual_check_out_time, "checkout_status": "Out"}, update_modified=False)
        
        # Update Room status to Available and clear checkout_date
        # Use helper function to ensure calculated fields are updated
        from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
        update_room_fields(check_in_doc.room, {
            "status": "Available",
            "current_checkin": "",
            "current_guest": "",
            "checkout_date": None
        })

        
        
        frappe.db.commit()
        
        return {
            "success": True,
            "checkout_name": checkout_doc.name,
            "message": _("Check Out {0} created and submitted successfully").format(checkout_doc.name)
        }
        
    except Exception as e:
        frappe.log_error(title="Error Creating Check Out", message=str(e))
        frappe.db.rollback()
        frappe.throw(_("An error occurred while creating Check Out: {0}").format(str(e)))


@frappe.whitelist()
def mark_rooms_reserved_for_today():
    """
    Check all rooms reserved for today and mark them as Reserved
    Also checks check-ins for today
    """
    try:
        from frappe.utils import getdate, today
        
        today_date = getdate(today())
        updated_count = 0
        debug_info = []
        
        # Get all submitted reservations
        reservations = frappe.get_all(
            "Reservation",
            filters={"docstatus": 1},
            fields=["name", "room", "check_in_date"]
        )
        
        for reservation in reservations:
            if not reservation.room:
                continue
            
            # Check if check_in_date is today
            if reservation.check_in_date:
                res_check_in_date = getdate(reservation.check_in_date)
                debug_info.append(f"Reservation {reservation.name}: check_in_date={reservation.check_in_date}, parsed={res_check_in_date}, today={today_date}")
                
                if res_check_in_date == today_date:
                    # Get room status and current reservation
                    room_data = frappe.db.get_value("Room", reservation.room, ["status", "reservation"], as_dict=True)
                    room_status = room_data.status if room_data else None
                    current_reservation = room_data.reservation if room_data else None
                    
                    debug_info.append(f"Room {reservation.room}: status={room_status}, current_reservation={current_reservation}")
                    
                    # Update if:
                    # 1. Room is Available, OR
                    # 2. Room is Reserved but reservation doesn't match (should update to correct reservation)
                    # Don't update if room is Occupied
                    if room_status == "Available" or (room_status == "Reserved" and current_reservation != reservation.name):
                        # Set room to Reserved and link reservation
                        # Use helper function to ensure calculated fields are updated
                        from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                        update_room_fields(reservation.room, {
                            "status": "Reserved",
                            "reservation": reservation.name
                        })
                        updated_count += 1
                        debug_info.append(f"Updated room {reservation.room} to Reserved")
        
        # Also check for check-ins today that should mark rooms as Occupied
        check_ins = frappe.get_all(
            "Check In",
            filters={"docstatus": 1},
            fields=["name", "room", "check_in_date"]
        )
        
        for check_in in check_ins:
            if not check_in.room or not check_in.check_in_date:
                continue
            
            # Check if check_in_date is today
            check_in_date = getdate(check_in.check_in_date)
            if check_in_date == today_date:
                # Get room status
                room_status = frappe.db.get_value("Room", check_in.room, "status")
                
                # If room is Reserved or Available, mark as Occupied
                if room_status in ["Reserved", "Available"]:
                    # Use helper function to ensure calculated fields are updated
                    from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                    update_room_fields(check_in.room, {
                        "status": "Occupied",
                        "current_checkin": check_in.name
                    })
                    updated_count += 1
        
        frappe.db.commit()
        
        return {
            "success": True,
            "updated_count": updated_count,
            "message": _("Updated {0} room(s) status").format(updated_count),
            "debug": debug_info if updated_count == 0 else None  # Only return debug if no updates
        }
        
    except Exception as e:
        frappe.log_error(title="Error Marking Rooms Reserved", message=str(e))
        frappe.db.rollback()
        return {
            "success": False,
            "message": _("An error occurred while updating room statuses: {0}").format(str(e))
        }


@frappe.whitelist()
def get_hotel_dashboard_stats():
    """Get room statistics for dashboard cards"""
    try:
        from frappe.utils import getdate, today
        
        today_date = getdate(today())
        
        # Get all rooms with their check-in information for accurate due-out calculation
        rooms_query = """
            SELECT 
                room.name,
                room.status,
                room.housekeeping_status,
                room.checkout_date,
                room.checkout_status,
                checkin.check_out_date as checkin_check_out_date
            FROM `tabRoom` as room
            LEFT JOIN `tabCheck In` as checkin ON room.current_checkin = checkin.name AND checkin.docstatus = 1
        """
        all_rooms = frappe.db.sql(rooms_query, as_dict=True)
        
        stats = {
            "vacant": 0,
            "occupied": 0,
            "reserved": 0,
            "due_out": 0,
            "dirty": 0,
            "all": len(all_rooms)
        }
        
        for room in all_rooms:
            # Count by status
            if room.status == "Available":
                stats["vacant"] += 1
            elif room.status == "Occupied":
                stats["occupied"] += 1
            elif room.status == "Reserved":
                stats["reserved"] += 1
            
            # Count dirty rooms
            if room.housekeeping_status == "Dirty":
                stats["dirty"] += 1
            
            # Count due out (rooms with check_out_date in the past, not today)
            # Use check_in check_out_date if available, otherwise fall back to room.checkout_date
            if room.status == "Occupied":
                checkout_date_to_check = None
                if room.checkin_check_out_date:
                    checkout_date_to_check = getdate(room.checkin_check_out_date)
                elif room.checkout_date:
                    checkout_date_to_check = getdate(room.checkout_date)
                
                # Only count as due out if checkout date is < today (past dates only, not today)
                if checkout_date_to_check and checkout_date_to_check < today_date:
                    stats["due_out"] += 1
        
        return stats
    except Exception as e:
        frappe.log_error(title="Error getting hotel dashboard stats", message=f"Error getting hotel dashboard stats: {str(e)}")
        return {
            "vacant": 0,
            "occupied": 0,
            "reserved": 0,
            "due_out": 0,
            "dirty": 0,
            "all": 0
        }


@frappe.whitelist()
def get_hotel_dashboard_rooms(filters=None, page_length=20, page_start=0):
    """Get paginated room data for dashboard table"""
    try:
        from frappe.utils import getdate, today
        
        # Ensure page_length and page_start are integers
        page_length = int(page_length) if page_length else 20
        page_start = int(page_start) if page_start else 0
        
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        
        if not filters:
            filters = {}
        
        # Build filter conditions using frappe.db.sql with proper escaping
        conditions = []
        values = []
        
        # Status filter
        if filters.get("status"):
            if filters["status"] == "Vacant":
                conditions.append("room.status = %s")
                values.append("Available")
            elif filters["status"] == "Occupied":
                conditions.append("room.status = %s")
                values.append("Occupied")
            elif filters["status"] == "Reserved":
                conditions.append("room.status = %s")
                values.append("Reserved")
            elif filters["status"] == "Due Out":
                # Filter for occupied rooms with check_out_date < today (not <= today, only past dates)
                conditions.append("room.status = %s AND checkin.check_out_date < CURDATE()")
                values.append("Occupied")
            elif filters["status"] == "Dirty":
                conditions.append("room.housekeeping_status = %s")
                values.append("Dirty")
        
        # Room type filter
        if filters.get("room_type"):
            conditions.append("room.room_type = %s")
            values.append(filters["room_type"])
        
        # Floor filter
        if filters.get("floor"):
            conditions.append("room.floor = %s")
            values.append(filters["floor"])
        
        # Room number filter
        if filters.get("room_number"):
            conditions.append("room.room_number LIKE %s")
            values.append(f"%{filters['room_number']}%")
        
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total
            FROM `tabRoom` as room
            {where_clause}
        """
        try:
            if values:
                total_count = frappe.db.sql(count_query, tuple(values), as_dict=True)[0].total
            else:
                total_count = frappe.db.sql(count_query, as_dict=True)[0].total
        except Exception as e:
            frappe.log_error(title="Error in count query", message=f"Error in count query: {str(e)}")
            total_count = 0
        
        # Get paginated data
        # Only join reservation for non-vacant rooms (Occupied, Reserved, etc.)
        query = f"""
            SELECT 
                room.name as room_name,
                room.room_number,
                room.room_name as room_display_name,
                room.room_type,
                room.status,
                room.housekeeping_status,
                room.checkout_date,
                room.checkout_status,
                room.current_guest,
                room.reservation,
                checkin.name as check_in_name,
                checkin.check_in_date as checkin_check_in_date,
                checkin.check_out_date as checkin_check_out_date,
                checkin.balance_due as checkin_balance,
                reservation.check_in_date as reservation_check_in_date,
                reservation.check_out_date as reservation_check_out_date,
                reservation.guest as reservation_guest,
                guest.full_name as guest_display_name,
                guest.guest_customer,
                reservation_guest.full_name as reservation_guest_name,
                reservation_guest.guest_customer as reservation_guest_customer
            FROM `tabRoom` as room
            LEFT JOIN `tabCheck In` as checkin ON room.current_checkin = checkin.name AND checkin.docstatus = 1
            LEFT JOIN `tabReservation` as reservation ON room.reservation = reservation.name AND reservation.docstatus = 1
            LEFT JOIN `tabHotel Guest` as guest ON room.current_guest = guest.name
            LEFT JOIN `tabHotel Guest` as reservation_guest ON reservation.guest = reservation_guest.name
            {where_clause}
            ORDER BY room.room_number
            LIMIT %s OFFSET %s
        """
        
        # Add pagination parameters to values
        query_values = list(values) + [int(page_length), int(page_start)]
        try:
            data = frappe.db.sql(query, tuple(query_values), as_dict=True)
        except Exception as e:
            frappe.log_error(title="Error in data query", message=f"Error in data query: {str(e)}\nQuery: {query}\nValues: {query_values}")
            data = []
        
        # Format the data
        formatted_data = []
        company = frappe.defaults.get_user_default("company")
        from frappe.utils import getdate, today
        
        for idx, row in enumerate(data, start=page_start + 1):
            # Format arrival date - use Reservation check_in_date for reserved rooms, Check In for occupied
            arrival_str = ""
            room_status = row.status or "Available"
            
            if room_status == "Reserved" and row.reservation_check_in_date:
                # For reserved rooms, use reservation check_in_date
                if isinstance(row.reservation_check_in_date, str):
                    arrival_str = row.reservation_check_in_date
                else:
                    arrival_str = row.reservation_check_in_date.strftime("%Y-%m-%d %H:%M")
            elif row.checkin_check_in_date:
                # For occupied rooms, use check in date
                if isinstance(row.checkin_check_in_date, str):
                    arrival_str = row.checkin_check_in_date
                else:
                    arrival_str = row.checkin_check_in_date.strftime("%Y-%m-%d %H:%M")
            
            # Format departure date - use Reservation check_out_date for reserved rooms, Check In for occupied
            departure_str = ""
            departure_date = None
            if room_status == "Reserved" and row.reservation_check_out_date:
                # For reserved rooms, use reservation check_out_date
                if isinstance(row.reservation_check_out_date, str):
                    departure_str = row.reservation_check_out_date
                    departure_date = getdate(row.reservation_check_out_date)
                else:
                    departure_str = row.reservation_check_out_date.strftime("%Y-%m-%d")
                    departure_date = getdate(row.reservation_check_out_date)
            elif row.checkin_check_out_date:
                # For occupied rooms, use check out date
                if isinstance(row.checkin_check_out_date, str):
                    departure_str = row.checkin_check_out_date
                    departure_date = getdate(row.checkin_check_out_date)
                else:
                    departure_str = row.checkin_check_out_date.strftime("%Y-%m-%d")
                    departure_date = getdate(row.checkin_check_out_date)
            
            # Determine if occupied room should show as "Due Out"
            # If room is occupied and departure date is < today (not <=), change status to "Due Out"
            display_status = room_status
            if room_status == "Occupied" and departure_date:
                today_date = getdate(today())
                if departure_date < today_date:  # Only past dates, not today
                    display_status = "Due Out"
            
            # Get guest name - use reservation guest for reserved rooms, current guest for occupied
            guest_name = ""
            if room_status == "Reserved":
                # For reserved rooms, get guest from reservation
                guest_name = row.reservation_guest_name or row.reservation_guest or ""
            else:
                # For occupied/other rooms, use current guest
                guest_name = row.guest_display_name or row.current_guest or ""
            
            # Calculate total balance (customer account balance for occupied/reserved, check_in balance_due for others)
            total_balance = 0
            
            if room_status == "Occupied" and row.guest_customer:
                # Get customer account balance for occupied rooms
                try:
                    total_balance = get_total_balance(
                        guest_name=row.current_guest,
                        company=company
                    )
                except Exception as e:
                    frappe.log_error(title="Error getting customer balance", message=f"Error getting customer balance for guest {row.current_guest}: {str(e)}")
                    total_balance = flt(row.checkin_balance) if row.checkin_balance else 0
            elif room_status == "Reserved" and row.reservation_guest_customer:
                # Get customer account balance for reserved rooms
                try:
                    total_balance = get_total_balance(
                        guest_name=row.reservation_guest,
                        company=company
                    )
                except Exception as e:
                    frappe.log_error(title="Error getting customer balance", message=f"Error getting customer balance for reservation guest {row.reservation_guest}: {str(e)}")
                    total_balance = flt(row.checkin_balance) if row.checkin_balance else 0
            else:
                # Use Check In balance_due for other rooms or if no customer
                total_balance = flt(row.checkin_balance) if row.checkin_balance else 0
            
            # Get CheckIn balance (from check_in.balance_due field)
            checkin_balance = flt(row.checkin_balance) if row.checkin_balance else 0
            
            formatted_data.append({
                "sn": idx,
                "room": row.room_number or row.room_display_name or row.room_name,
                "room_type": row.room_type or "",
                "guest_name": guest_name,
                "arrival": arrival_str,
                "departure": departure_str,
                "reservation": row.reservation or "",
                "total_balance": total_balance,
                "checkin_balance": checkin_balance,
                "room_name": row.room_name,
                "status": display_status,  # Use display_status which may be "Due Out" for occupied rooms
                "original_status": room_status,  # Keep original status for filtering
                "housekeeping_status": row.housekeeping_status or "",
                "checkout_status": row.checkout_status or ""
            })
        
        return {
            "data": formatted_data,
            "total": total_count,
        }
    except Exception as e:
        frappe.log_error(title="Hotel Dashboard Error", message=f"Error getting hotel dashboard rooms: {str(e)}")
        return {
            "data": [],
            "total": 0
        }


@frappe.whitelist()
def create_and_submit_reservation(room, guest, check_in_date, check_out_date, nights, reservation_type="Room"):
    """
    Create and submit a Reservation document
    """
    try:
        # Create reservation document
        reservation = frappe.new_doc("Reservation")
        reservation.room = room
        reservation.guest = guest
        reservation.check_in_date = check_in_date
        reservation.check_out_date = check_out_date
        reservation.nights = int(nights) if nights else 1
        reservation.reservation_type = reservation_type
        
        # Insert the document
        reservation.insert(ignore_permissions=True)
        
        # Submit the document
        reservation.submit()
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"Reservation {reservation.name} created and submitted successfully.",
            "name": reservation.name
        }
    except Exception as e:
        frappe.log_error(title="Create Reservation Error", message=f"Error creating and submitting reservation: {str(e)}")
        frappe.db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to create reservation: {str(e)}"
        }


@frappe.whitelist()
def cleanup_expired_reservations():
    """
    Clean up rooms that are reserved but arrival date is not today
    - Update room status to Available
    - Clear reservation reference from room
    """
    try:
        from frappe.utils import getdate, today
        
        today_date = getdate(today())
        updated_count = 0
        
        # Get all reserved rooms with reservations
        reserved_rooms = frappe.get_all(
            "Room",
            filters={"status": "Reserved", "reservation": ["!=", ""]},
            fields=["name", "reservation"]
        )
        
        for room in reserved_rooms:
            if not room.reservation:
                continue
            
            # Get reservation details
            reservation = frappe.db.get_value(
                "Reservation",
                room.reservation,
                ["check_in_date", "docstatus"],
                as_dict=True
            )
            
            if not reservation:
                # Reservation doesn't exist, clear it
                # Use helper function to ensure calculated fields are updated
                from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                update_room_fields(room.name, {
                    "status": "Available",
                    "reservation": "",
                    "current_guest": ""
                })
                updated_count += 1
                continue
            
            # Only process submitted reservations
            if reservation.docstatus != 1:
                continue
            
            # Check if arrival date is NOT today
            if reservation.check_in_date:
                arrival_date = getdate(reservation.check_in_date)
                if arrival_date != today_date:
                    # Clear reservation and make room available
                    # Use helper function to ensure calculated fields are updated
                    from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                    update_room_fields(room.name, {
                        "status": "Available",
                        "reservation": "",
                        "current_guest": ""
                    })
                    updated_count += 1
        
        frappe.db.commit()
        
        return {
            "success": True,
            "updated": updated_count,
            "message": f"Cleaned up {updated_count} expired reservations"
        }
        
    except Exception as e:
        frappe.log_error(
            title="Error in Cleanup Expired Reservations",
            message=f"Error cleaning up expired reservations: {str(e)}\n{frappe.get_traceback()}"
        )
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_rooms_from_today_reservations():
    """
    Update rooms with reservation details for reservations with check_in_date of today
    - Set room status to Reserved
    - Link reservation to room
    - Update room with guest information if available
    """
    try:
        from frappe.utils import getdate, today
        
        today_date = getdate(today())
        updated_count = 0
        
        # Get all submitted reservations with check_in_date (Datetime field)
        # We'll filter by date in Python since Frappe filters don't easily handle datetime ranges
        from datetime import datetime
        
        all_reservations = frappe.get_all(
            "Reservation",
            filters={
                "docstatus": 1,
                "reservation_type": "Room",
                "room": ["!=", ""]
            },
            fields=["name", "room", "guest", "check_in_date", "check_out_date"]
        )
        
        # Filter reservations with check_in_date of today
        for reservation in all_reservations:
            if not reservation.room or not reservation.check_in_date:
                continue
            
            # Check if check_in_date is today
            res_check_in_date = getdate(reservation.check_in_date)
            if res_check_in_date != today_date:
                continue
            
            # Get current room status
            room = frappe.get_doc("Room", reservation.room)
            
            # Only update if room is Available or if reservation doesn't match
            if room.status == "Available" or (room.status == "Reserved" and room.reservation != reservation.name):
                # Update room with reservation details
                update_data = {
                    "status": "Reserved",
                    "reservation": reservation.name
                }
                
                # Update guest if available
                if reservation.guest:
                    update_data["current_guest"] = reservation.guest
                
                # Update checkout date if available
                if reservation.check_out_date:
                    update_data["checkout_date"] = reservation.check_out_date
                
                # Use helper function to ensure calculated fields are updated
                from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                update_room_fields(reservation.room, update_data)
                updated_count += 1
        
        frappe.db.commit()
        
        return {
            "success": True,
            "updated": updated_count,
            "message": f"Updated {updated_count} rooms from today's reservations"
        }
        
    except Exception as e:
        frappe.log_error(
            title="Error in Update Rooms from Reservations",
            message=f"Error updating rooms from today's reservations: {str(e)}\n{frappe.get_traceback()}"
        )
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def cancel_reservation(reservation_name, room_name=None):
    """
    Cancel a reservation and make the room available
    """
    try:
        if not reservation_name:
            frappe.throw(_("Reservation name is required."))
        
        # Get the reservation document
        reservation = frappe.get_doc("Reservation", reservation_name)
        
        # Check if reservation is already cancelled
        if reservation.docstatus == 2:
            return {
                "success": False,
                "message": _("Reservation {0} is already cancelled.").format(reservation_name)
            }
        
        # Cancel the reservation (this will trigger on_cancel which makes room available)
        reservation.cancel()
        
        # Also clear the current_guest and checkout_date from the room if room is linked
        if reservation.room:
            # Use helper function to ensure calculated fields are updated
            from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
            update_room_fields(reservation.room, {
                "current_guest": "",
                "checkout_date": None
            })
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Reservation {0} has been cancelled successfully.").format(reservation_name)
        }
        
    except Exception as e:
        frappe.log_error(title="Cancel Reservation Error", message=f"Error cancelling reservation: {str(e)}")
        frappe.db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to cancel reservation: {str(e)}"
        }

@frappe.whitelist()
def update_reservation(reservation_name, guest=None, check_in_date=None, check_out_date=None, nights=None):
    """
    Update a reservation's guest, check in date, check out date, and nights
    """
    try:
        if not reservation_name:
            frappe.throw(_("Reservation name is required."))
        
        # Get the reservation document
        reservation = frappe.get_doc("Reservation", reservation_name)
        
        # Check if reservation is cancelled
        if reservation.docstatus == 2:
            frappe.throw(_("Cannot update a cancelled reservation."))
        
        # Update fields if provided
        if guest:
            reservation.guest = guest
            # Update the guest customer if available
            guest_doc = frappe.get_doc("Hotel Guest", guest)
            if guest_doc.guest_customer:
                reservation.customer = guest_doc.guest_customer
        
        if check_in_date:
            reservation.check_in_date = check_in_date
        
        if check_out_date:
            reservation.check_out_date = check_out_date
        
        if nights:
            reservation.nights = int(nights)
        
        # Save the reservation
        reservation.save()
        
        # If room is linked, update room's current_guest and checkout_date
        if reservation.room:
            update_data = {}
            if guest:
                update_data["current_guest"] = guest
            if check_out_date:
                update_data["checkout_date"] = check_out_date
            if update_data:
                # Use helper function to ensure calculated fields are updated
                from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
                update_room_fields(reservation.room, update_data)
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Reservation {0} has been updated successfully.").format(reservation_name)
        }
        
    except Exception as e:
        frappe.log_error(title="Update Reservation Error", message=f"Error updating reservation: {str(e)}")
        frappe.db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to update reservation: {str(e)}"
        }

@frappe.whitelist()
def get_check_in_summary(check_in_name):
    """
    Get comprehensive summary for Check In including:
    - Total balance
    - Payment status (amount_paid, balance_due)
    - Checkout status
    This reduces multiple API calls from JS to a single call
    """
    try:
        if not check_in_name:
            frappe.throw(_("Check In name is required."))
        
        check_in = frappe.get_doc("Check In", check_in_name)
        
        # Get total balance
        total_balance = 0
        if check_in.guest_name:
            total_balance = get_total_balance(
                guest_name=check_in.guest_name,
                company=check_in.company
            )
        
        # Get payment entries and calculate amount_paid
        payment_entries = frappe.get_all(
            "Payment Entry",
            filters={
                "check_in_reference": check_in_name,
                "docstatus": 1
            },
            fields=["paid_amount"]
        )
        
        total_amount_paid = sum(flt(pe.paid_amount or 0) for pe in payment_entries)
        balance_due = flt(check_in.total_charge or 0) - total_amount_paid
        
        # Calculate checkout status
        checkout_status = "In"
        if check_in.actual_checkout_date:
            checkout_status = "Out"
        elif check_in.check_out_date:
            from frappe.utils import getdate, today
            if getdate(check_in.check_out_date) < getdate(today()):
                checkout_status = "Overdue"
        
        return {
            "success": True,
            "total_balance": total_balance,
            "amount_paid": total_amount_paid,
            "balance_due": balance_due,
            "checkout_status": checkout_status
        }
        
    except Exception as e:
        frappe.log_error(title="Error Getting Check In Summary", message=str(e))
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def move_check_in_to_room(check_in_name, new_room_name):
    """
    Move a Check In to a different room
    Updates both old and new room in a single transaction
    """
    try:
        if not check_in_name:
            frappe.throw(_("Check In name is required."))
        if not new_room_name:
            frappe.throw(_("New room name is required."))
        
        check_in = frappe.get_doc("Check In", check_in_name)
        old_room = check_in.room
        
        if old_room == new_room_name:
            frappe.throw(_("New room must be different from current room."))
        
        # Validate new room is available
        new_room_status = frappe.db.get_value("Room", new_room_name, "status")
        if new_room_status != "Available":
            frappe.throw(_("Room {0} is not available. Current status: {1}").format(new_room_name, new_room_status))
        
        # Update old room
        # Use helper function to ensure calculated fields are updated
        from havano_hotel_management.havano_hotel_management_system.doctype.room.room import update_room_fields
        update_room_fields(old_room, {
            "status": "Available",
            "current_checkin": ""
        })
        
        # Update new room
        update_room_fields(new_room_name, {
            "status": "Occupied",
            "current_checkin": check_in_name
        })
        
        # Update check in document
        check_in.room = new_room_name
        check_in.save(ignore_permissions=True)
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Check In moved to room {0} successfully.").format(new_room_name)
        }
        
    except Exception as e:
        frappe.log_error(title="Error Moving Check In to Room", message=str(e))
        frappe.db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to move check in: {str(e)}"
        }


@frappe.whitelist()
def get_hotel_dashboard_url():
    """
    API endpoint to get the URL for redirecting to hotel dashboard page
    Returns the URL that can be used to redirect to the hotel dashboard
    """
    try:
        # Get the hotel dashboard page URL
        dashboard_url = frappe.utils.get_url(f"/app/hotel-dashboard")
        
        return {
            "success": True,
            "url": dashboard_url,
            "message": "Hotel dashboard URL retrieved successfully"
        }
    except Exception as e:
        frappe.log_error(title="Error Getting Hotel Dashboard URL", message=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to get hotel dashboard URL: {str(e)}"
        }


def redirect_to_hotel_dashboard_after_checkin(doc, method):
    """
    Hook function called after Check In is submitted
    Calls the API endpoint to get hotel dashboard URL and sets it in response
    This can be used by the frontend to redirect after check-in submission
    """
    try:
        # Call the API endpoint to get hotel dashboard URL
        result = get_hotel_dashboard_url()
        
        if result.get("success"):
            dashboard_url = result.get("url")
            
            # Log the redirect URL (can be used by frontend if needed)
            frappe.logger().info(f"Check In {doc.name} submitted. Redirect to: {dashboard_url}")
            
            # Store the redirect URL in frappe.response if available
            # This allows the frontend to access it after submit
            if hasattr(frappe, 'response'):
                frappe.response['redirect_to_dashboard'] = True
                frappe.response['dashboard_url'] = dashboard_url
            
            return {
                "redirect_to_dashboard": True,
                "dashboard_url": dashboard_url
            }
        else:
            frappe.log_error(
                title="Error Getting Dashboard URL in Hook",
                message=f"Failed to get dashboard URL for Check In {doc.name}: {result.get('error')}"
            )
    except Exception as e:
        frappe.log_error(
            title="Error in redirect_to_hotel_dashboard_after_checkin",
            message=f"Error for Check In {doc.name}: {str(e)}\n{frappe.get_traceback()}"
        )
