# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe
from frappe import _

class Reservation(Document):
    def validate(self):
        self.validate_reservation()


    def before_submit(self):
        # Don't reserve room immediately - only mark reservation reference
        # Room will be reserved on check_in_date via cron job
        if self.room:
            frappe.db.set_value("Room", self.room, "reservation", self.name, update_modified=False)
        if self.venue:
            frappe.db.set_value("Venue", self.venue, "status", "Reserved")
            frappe.msgprint("Venue Reserved")
    
    def on_cancel(self):
        """Make room available when reservation is cancelled"""
        if self.room:
            room = frappe.get_doc("Room", self.room)
            # Only make available if status is Reserved (not Occupied) and reservation matches
            if room.status == "Reserved" and room.reservation == self.name:
                frappe.db.set_value("Room", self.room, "status", "Available", update_modified=False)
                frappe.db.set_value("Room", self.room, "reservation", "", update_modified=False)
                frappe.msgprint(_("Room {0} is now available").format(self.room))
            elif room.reservation == self.name:
                # Clear reservation reference even if status is not Reserved
                frappe.db.set_value("Room", self.room, "reservation", "", update_modified=False)

    def validate_reservation(self):
        # Ensure check-in date is before check-out date
        if self.check_in_date and self.check_out_date:
            if self.check_in_date >= self.check_out_date:
                frappe.throw(_("Check In Date should be before Check Out Date"))
        
        # If a room is specified, check its status
        if self.room:
            try:
                room_status = frappe.db.get_value("Room", self.room, "status")
            except Exception as e:
                frappe.log_error(message=str(e), title="Error Fetching Room Status")
                frappe.throw(_("An error occurred while checking the room status. Please try again later."))

            # If the room is occupied, raise an error
            if room_status == "Occupied":
                frappe.throw(_("Room {0} is already occupied. Please select another room.").format(self.room))

            elif room_status == "Reserved":
                allow_overbooking = frappe.db.get_single_value("Hotel Settings", "allow_overbooking")

                if not allow_overbooking:
                    frappe.throw(_("Overbooking is not allowed in settings"))

        # If "is_group" is checked, validate the "to be billed" field in the reservation guest child table
        if self.is_group:
            if not any(guest.to_be_billed for guest in self.guest_table):
                frappe.throw(_("At least one guest must have 'To Be Billed' set to True in the Reservation Guests table."))

    # def after_insert(self):
    #     self.create_desk_folio()

    def create_desk_folio(self):
        try:
            # Create a new document of Desk Folio Doctype
            new_doc = frappe.get_doc({
                "doctype": "Desk Folio",
                "reservation": self.name, 
                "guest": self.guest,
            })

            # Save the new document
            new_doc.insert(ignore_permissions=True)
            # frappe.msgprint("Desk Folio created")
        except Exception as e:
            frappe.log_error(message=str(e), title="Error Creating Desk Folio")
            frappe.throw(_("An error occurred while creating the Desk Folio. Please try again later."))

    # def validate(self):
    #     frappe.msgprint("Validating!")
    #     # Ensure check-in date is before check-out date
    #     # if self.check_in >= self.check_out:
    #     #     frappe.throw("Check In Date should be before Check Out Date")
        
    #     # If a room is specified, check its status
    #     if self.room:
    #         room_status = frappe.db.get_value("Room", self.room, "status")

    #         # If the room is occupied, raise an error
    #         if room_status == "Occupied":
    #             frappe.throw("Room {0} is already occupied. Please select another room.".format(self.room))
    
    # def after_insert(self):
    #     # Create a new document of Desk Folio Doctype
    #     new_doc = frappe.get_doc({
    #         "doctype": "Desk Folio",
    #         "reservation": self.name, 
    #         "guest": self.guest,
    #     })

    #     # Save the new document
    #     new_doc.insert(ignore_permissions=True)
    #     frappe.db.commit()  

