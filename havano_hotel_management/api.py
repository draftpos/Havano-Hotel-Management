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
        
        # Update room status
        frappe.db.set_value("Room", doc.room, "status", "Occupied")
        frappe.db.set_value("Room", doc.room, "current_checkin", doc.name)

        frappe.db.set_value("Room", doc.room, "current_guest", doc.guest_name)
        frappe.db.set_value("Room", doc.room, "checkout_date", doc.check_out_date)

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
            message=f"Error creating Hotel Guest for Customer {doc.name}: {str(e)}\n{frappe.get_traceback()}",
            title="Error Creating Hotel Guest from Customer"
        )


def update_check_in_balance_on_payment_entry_submit(doc, method):
    """
    Hook function to update Check In balance_due and amount_paid when Payment Entry is submitted
    """
    if not doc.check_in_reference:
        return
    
    try:
        check_in_name = doc.check_in_reference
        
        # Get all submitted payment entries for this check-in
        payment_entries = frappe.get_all(
            "Payment Entry",
            filters={
                "check_in_reference": check_in_name,
                "docstatus": 1  # Only submitted payments
            },
            fields=["paid_amount"]
        )
        
        # Calculate total amount paid
        total_amount_paid = sum([float(pe.paid_amount) for pe in payment_entries])
        
        # Get the check-in document to get total_charge
        check_in_doc = frappe.get_doc("Check In", check_in_name)
        total_charge = float(check_in_doc.total_charge or 0)
        
        # Calculate balance_due = total_charge - amount_paid
        balance_due = total_charge - total_amount_paid
        
        # Update check-in with calculated amounts
        frappe.db.set_value("Check In", check_in_name, "amount_paid", total_amount_paid, update_modified=False)
        frappe.db.set_value("Check In", check_in_name, "balance_due", balance_due, update_modified=False)
        
        frappe.db.commit()
        
    except Exception as e:
        frappe.log_error(
            message=f"Error updating Check In balance on Payment Entry submit: {str(e)}\n{frappe.get_traceback()}",
            title="Error Updating Check In Balance"
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
                    frappe.db.set_value("Room", reservation.room, "status", "Reserved", update_modified=False)
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
                        frappe.db.set_value("Room", reservation.room, "status", "Available", update_modified=False)
                        frappe.db.set_value("Room", reservation.room, "reservation", "", update_modified=False)
                        updated_count += 1
        
        frappe.db.commit()
        
        if updated_count > 0:
            frappe.logger().info(f"Updated {updated_count} room statuses from reservations")
        
        return {"updated": updated_count}
        
    except Exception as e:
        frappe.log_error(
            message=f"Error updating room statuses from reservations: {str(e)}\n{frappe.get_traceback()}",
            title="Error in Reservation Room Status Update"
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
            message=f"Error getting payment entry for Check In {check_in}: {str(e)}\n{frappe.get_traceback()}",
            title="Error Getting Payment Entry"
        )
        frappe.throw(_("An error occurred while creating the Payment Entry. Please try again later."))

