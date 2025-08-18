# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class CheckIn(Document):
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
            
            # Create sales invoice
            si = frappe.new_doc("Sales Invoice")
            si.customer = self.guest_name
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
            
            # Update room status
            frappe.db.set_value("Room", self.room, "status", "Occupied")
            
            frappe.db.set_value("Check In", self.name, "sales_invoice_number", si.name)

            # self.save()

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
            
            # Create sales invoice
            si = frappe.new_doc("Sales Invoice")
            si.customer = self.guest_name
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
            
            frappe.msgprint(_("Additional Sales Invoice {0} created").format(
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

