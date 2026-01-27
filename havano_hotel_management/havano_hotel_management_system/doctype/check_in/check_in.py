# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class CheckIn(Document):
    def validate(self):
        self.set_checkout_status()
        self.validate_room_availability()
        self.calculate_payment_fields()
    
    def calculate_payment_fields(self):
        """Calculate and set total_balance, amount_paid, and balance_due"""
        # Calculate total_balance from guest's customer balance
        if self.guest_name:
            try:
                from frappe.utils import flt, nowdate
                from erpnext.accounts.utils import get_balance_on
                
                company = self.company or frappe.defaults.get_user_default("company")
                if company:
                    customer = frappe.db.get_value("Hotel Guest", self.guest_name, "guest_customer")
                    if customer:
                        receivable_account = frappe.get_cached_value("Company", company, "default_receivable_account")
                        if receivable_account:
                            posting_date = nowdate()
                            try:
                                balance = get_balance_on(
                                    account=receivable_account,
                                    date=posting_date,
                                    party_type="Customer",
                                    party=customer,
                                    company=company,
                                    in_account_currency=True,
                                )
                                self.total_balance = flt(balance)
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
                                self.total_balance = flt(balance)
                    else:
                        self.total_balance = 0
                else:
                    self.total_balance = 0
            except Exception as e:
                frappe.log_error(title="Error Calculating Total Balance", message=str(e))
                self.total_balance = 0
        else:
            self.total_balance = 0
        
        # Calculate amount_paid from payment entries (only for submitted documents)
        if self.docstatus == 1 and self.name:
            payment_entries = frappe.get_all(
                "Payment Entry",
                filters={
                    "check_in_reference": self.name,
                    "docstatus": 1
                },
                fields=["paid_amount"]
            )
            self.amount_paid = sum(float(pe.paid_amount or 0) for pe in payment_entries)
        elif self.is_new() or self.docstatus == 0:
            # For new or draft documents, set to 0
            if not self.amount_paid:
                self.amount_paid = 0
        
        # Calculate balance_due
        if self.total_charge:
            self.balance_due = float(self.total_charge) - float(self.amount_paid or 0)
        else:
            self.balance_due = 0
    
    def validate_room_availability(self):
        """Validate that room is not reserved for the check-in date"""
        if not self.room or not self.check_in_date:
            return
        
        from frappe.utils import getdate, today
        
        # Check if room is currently occupied
        room_status = frappe.db.get_value("Room", self.room, "status")
        if room_status == "Occupied":
            frappe.throw(_("Room {0} is currently occupied. Please select another room.").format(self.room))
        
        # If allow_overbooking is checked, skip reservation validation
        if self.allow_overbooking:
            return
        
        # Check if room has a reservation for this date
        reservation = frappe.db.get_value("Room", self.room, "reservation")
        if reservation:
            reservation_doc = frappe.get_doc("Reservation", reservation)
            if reservation_doc.docstatus == 1:  # Only check submitted reservations
                # Check if reservation dates overlap with check-in date
                if reservation_doc.check_in_date and reservation_doc.check_out_date:
                    check_in_date = getdate(self.check_in_date)
                    res_check_in = getdate(reservation_doc.check_in_date)
                    res_check_out = getdate(reservation_doc.check_out_date)
                    
                    # Check if check-in date falls within reservation period
                    if res_check_in <= check_in_date < res_check_out:
                        # Allow if this is the same reservation (checking in for the reserved room)
                        if self.reservation and self.reservation == reservation:
                            # This is the correct reservation for this room, allow it
                            return
                        # Also allow if room is Reserved status (even without reservation field set yet)
                        if room_status == "Reserved":
                            # Room is reserved, allow check-in (reservation will be set)
                            return
                        # Only throw error if this is a different reservation
                        frappe.throw(_("Room {0} is reserved for the selected check-in date ({1}). Please select another room or date, or enable 'Allow Overbooking' to proceed.").format(
                            self.room, 
                            frappe.format(self.check_in_date, {"fieldtype": "Date"})
                        ))
    
    def on_submit(self):
        """Calculate payment fields when Check In is submitted"""
        self.calculate_payment_fields()
        # Ensure amount_paid is 0 initially for new submissions
        if not self.amount_paid:
            self.amount_paid = 0
        # Ensure balance_due equals total_charge initially
        if self.total_charge and not self.balance_due:
            self.balance_due = float(self.total_charge)
    
    def on_update(self):
        """Update checkout status and payment fields when document is updated"""
        # Only update if not already being updated (prevent recursion)
        if not hasattr(frappe.flags, 'updating_check_in_fields'):
            frappe.flags.updating_check_in_fields = True
            try:
                self.set_checkout_status()
                # Recalculate payment fields for submitted documents
                if self.docstatus == 1:
                    self.calculate_payment_fields()
                
                # Save the fields if they changed (without triggering modified timestamp)
                if self.has_value_changed("checkout_status"):
                    frappe.db.set_value("Check In", self.name, "checkout_status", self.checkout_status, update_modified=False)
                if self.has_value_changed("total_balance"):
                    frappe.db.set_value("Check In", self.name, "total_balance", self.total_balance, update_modified=False)
                if self.has_value_changed("amount_paid"):
                    frappe.db.set_value("Check In", self.name, "amount_paid", self.amount_paid, update_modified=False)
                if self.has_value_changed("balance_due"):
                    frappe.db.set_value("Check In", self.name, "balance_due", self.balance_due, update_modified=False)
            finally:
                frappe.flags.updating_check_in_fields = False
    
    def set_checkout_status(self):
        """Set checkout status based on actual_checkout_date and check_out_date"""
        # Always check actual_checkout_date first - if it exists, guest is checked out
        if self.actual_checkout_date:
            self.checkout_status = "Out"
        elif self.check_out_date:
            # Check if check_out_date is past today (overdue)
            from frappe.utils import getdate, today
            if getdate(self.check_out_date) < getdate(today()):
                self.checkout_status = "Overdue"
            else:
                self.checkout_status = "In"
        else:
            self.checkout_status = "In"
    
    # def before_submit(self):
    #     self.create_sales_invoice()
        # def on_submit(self):
        # 	if self.room:
        # 		frappe.db.set_value("Room", self.room, "status", "Occupied")

    @frappe.whitelist()
    def create_sales_invoice(self):
        try:
            # If doc is a string (when called via whitelist), convert to JSON
            # if isinstance(self, str):
            #     self = frappe.parse_json(self)
            #     doc_name = self.get("name")
            # else:
            #     doc_name = self.name
            
            # Get room details
            room = frappe.get_doc("Room", self.room)
            
            # Get income account and cost center
            company = frappe.defaults.get_user_default("company")
            income_account = frappe.get_cached_value("Company", company, "default_income_account")
            cost_center = frappe.get_cached_value("Company", company, "cost_center")
            
            # Get debit account
            debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
            
            # Get the customer from the Hotel Guest
            guest = frappe.get_doc("Hotel Guest", self.guest_name)
            if not guest.guest_customer:
                frappe.throw(_("No customer linked to guest {0}. Please ensure the guest has a customer.").format(self.guest_name))
            customer = guest.guest_customer
            
            # Create sales invoice
            si = frappe.new_doc("Sales Invoice")
            si.customer = customer
            si.posting_date = self.check_in_date
            si.due_date = self.check_out_date
            si.company = company
            si.debit_to = debit_to
            #si.set_warehouse = "Stores - H"
            
            # room_item = frappe.db.get_value("Room", self.room, "room_item")
            # Add item
            si.append("items", {
                "item_code": room.room_item, # "Room Charge",
                "item_name": room.room_item,
                "description": self.name,
                "qty": self.nights,
                "rate": room.price,
                "amount": self.total_charge,
                "income_account": income_account,
                "cost_center": cost_center,
                # "warehouse": frappe.db.get_value("Item Default", 
                #                                 {"parent": "Room Charge"}, 
                #                                 "default_warehouse")
            })

            # self.sales_invoice_number = si.name
            # self.append("sales_invoices", {
            #     "sales_invoice": si.name,
            #     "room": self.room,
            #     "amount": self.total_charge,
            #     "date": frappe.utils.today()
            # })
            
            # Save and submit the invoice
            si.insert(ignore_permissions=True)
            si.submit()
            # self.reload()
            
            # NOTE: Room update (status, current_checkin, etc.) is NOT done automatically
            # Room should be updated manually or through explicit processes
            # This prevents automatic room updates that may not be desired
            
            frappe.db.set_value("Check In", self.name, "sales_invoice_number", si.name)

            # self.save()

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
    

    #Additional Sales Invoice
    @frappe.whitelist()
    def create_addtional_sales_invoice(self, amount):
        try:
            # If doc is a string (when called via whitelist), convert to JSON
            # if isinstance(self, str):
            #     self = frappe.parse_json(self)
            #     doc_name = self.get("name")
            # else:
            #     doc_name = self.name
            
            # Get room details
            room = frappe.get_doc("Room", self.room)
            
            # Get income account and cost center
            company = frappe.defaults.get_user_default("company")
            income_account = frappe.get_cached_value("Company", company, "default_income_account")
            cost_center = frappe.get_cached_value("Company", company, "cost_center")
            
            # Get debit account
            debit_to = frappe.get_cached_value("Company", company, "default_receivable_account")
            
            # Get the customer from the Hotel Guest
            guest = frappe.get_doc("Hotel Guest", self.guest_name)
            if not guest.guest_customer:
                frappe.throw(_("No customer linked to guest {0}. Please ensure the guest has a customer.").format(self.guest_name))
            customer = guest.guest_customer
            
            # Create sales invoice
            si = frappe.new_doc("Sales Invoice")
            si.customer = customer
            si.posting_date = self.check_in_date
            si.due_date = self.check_out_date
            si.company = company
            si.debit_to = debit_to
            #si.set_warehouse = "Stores - H"
            
            # room_item = frappe.db.get_value("Room", self.room, "room_item")
            # Add item
            si.append("items", {
                "item_code": room.room_item, # "Room Charge",
                "item_name": room.room_item,
                "description": self.name,
                "qty": self.nights,
                "rate": room.price,
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
            # self.append("sales_invoices", {
            #     "sales_invoice": si.name,
            #     "room": self.room,
            #     "amount": self.total_charge,
            #     "date": frappe.utils.today()
            # })
            # self.save()
        
            frappe.db.commit()
            
                # frappe.msgprint(_("Additional Sales Invoice {0} created").format(
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
def get_rooms_from_reservation(doctype, txt, searchfield, start, page_len, filters):
    reservation = filters.get('reservation')
    
    # Query to get rooms from reservation
    return frappe.db.sql("""
        SELECT room.name, room.room_number, room.room_type
        FROM `tabRoom` room
        INNER JOIN `tabReservation Room` res_room ON room.name = res_room.room
        WHERE res_room.parent = %s
        AND (room.name LIKE %s OR room.room_number LIKE %s)
    """, (reservation, "%" + txt + "%", "%" + txt + "%"))


@frappe.whitelist()
def update_checkout_status(check_in_name=None):
    """Update checkout status for a Check In or all Check Ins"""
    if check_in_name:
        # Update specific check in
        check_in = frappe.get_doc("Check In", check_in_name)
        check_in.set_checkout_status()
        frappe.db.set_value("Check In", check_in_name, "checkout_status", check_in.checkout_status, update_modified=False)
        frappe.db.commit()
        return {"status": "updated", "checkout_status": check_in.checkout_status}
    else:
        # Update all check ins
        check_ins = frappe.get_all("Check In", filters={"docstatus": 1}, fields=["name"])
        updated = 0
        for ci in check_ins:
            check_in = frappe.get_doc("Check In", ci.name)
            old_status = check_in.checkout_status
            check_in.set_checkout_status()
            if old_status != check_in.checkout_status:
                frappe.db.set_value("Check In", ci.name, "checkout_status", check_in.checkout_status, update_modified=False)
                updated += 1
        frappe.db.commit()
        return {"status": "updated", "count": updated}


@frappe.whitelist()
def get_general_ledger_entries(check_in):
    """Get General Ledger entries related to this Check In"""
    check_in_doc = frappe.get_doc("Check In", check_in)
    
    # Define filters based on the Check In document
    filters = {
        "company": check_in_doc.company,
        "from_date": check_in_doc.check_in_date,
        "to_date": check_in_doc.check_out_date or frappe.utils.today(),
        "party_type": "Customer",
        "party": check_in_doc.customer,
        # Add any other relevant filters
    }
    
    # Run the General Ledger report
    from erpnext.accounts.report.general_ledger.general_ledger import execute
    columns, data = execute(filters)
    
    return {
        "columns": columns,
        "data": data
    }


