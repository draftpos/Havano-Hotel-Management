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
            # frappe.msgprint("Venue Reserved")
    
    def on_cancel(self):
        """Make room available when reservation is cancelled"""
        if self.room:
            room = frappe.get_doc("Room", self.room)
            # Only make available if status is Reserved (not Occupied) and reservation matches
            if room.status == "Reserved" and room.reservation == self.name:
                frappe.db.set_value("Room", self.room, {
                    "status": "Available",
                    "reservation": "",
                    "current_guest": "",
                    "checkout_date": None
                }, update_modified=False)
                # frappe.msgprint(_("Room {0} is now available").format(self.room))
            elif room.reservation == self.name:
                # Clear reservation reference, guest, and checkout date even if status is not Reserved
                frappe.db.set_value("Room", self.room, {
                    "reservation": "",
                    "current_guest": "",
                    "checkout_date": None
                }, update_modified=False)

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
                frappe.log_error(title="Error Fetching Room Status", message=str(e))
                frappe.throw(_("An error occurred while checking the room status. Please try again later."))

            # If the room is occupied, raise an error
            if room_status == "Reserved":
                allow_overbooking = frappe.db.get_single_value("Hotel Settings", "allow_overbooking")

                if not allow_overbooking:
                    frappe.throw(_("Overbooking is not allowed in settings"))
            
            # Check for overlapping reservations for the same room and date
            if self.check_in_date and self.check_out_date:
                self.validate_no_overlapping_reservations()

        # If "is_group" is checked, validate the "to be billed" field in the reservation guest child table
        if self.is_group:
            if not any(guest.to_be_billed for guest in self.guest_table):
                frappe.throw(_("At least one guest must have 'To Be Billed' set to True in the Reservation Guests table."))
    
    def validate_no_overlapping_reservations(self):
        """Check if room is already reserved for the same date range"""
        from frappe.utils import getdate
        
        if not self.room or not self.check_in_date or not self.check_out_date:
            return
        
        # Convert check_in_date (Datetime) to date for comparison
        if isinstance(self.check_in_date, str):
            current_check_in = getdate(self.check_in_date.split()[0] if ' ' in self.check_in_date else self.check_in_date)
        else:
            current_check_in = getdate(self.check_in_date)
        
        current_check_out = getdate(self.check_out_date)
        
        # Get all submitted reservations (docstatus = 1) for the same room
        # Exclude cancelled reservations (docstatus = 2) and the current reservation if updating
        filters = {
            "room": self.room,
            "docstatus": 1  # Only submitted reservations (excludes cancelled which have docstatus = 2)
        }
        
        # Exclude current reservation if it exists (for updates)
        if self.name:
            filters["name"] = ["!=", self.name]
        
        existing_reservations = frappe.get_all(
            "Reservation",
            filters=filters,
            fields=["name", "check_in_date", "check_out_date"]
        )
        
        # Check for date overlaps
        for reservation in existing_reservations:
            if not reservation.check_in_date or not reservation.check_out_date:
                continue
            
            # Convert reservation dates to date objects
            res_check_in = getdate(reservation.check_in_date)
            res_check_out = getdate(reservation.check_out_date)
            
            # Check if date ranges overlap
            # Two date ranges overlap if: start1 < end2 AND start2 < end1
            if current_check_in < res_check_out and res_check_in < current_check_out:
                frappe.throw(
                    _("Room {0} is already reserved from {1} to {2} (Reservation: {3}). "
                      "Please select another room or date, or cancel the existing reservation first.").format(
                        self.room,
                        frappe.format(res_check_in, {"fieldtype": "Date"}),
                        frappe.format(res_check_out, {"fieldtype": "Date"}),
                        reservation.name
                    )
                )

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
            frappe.log_error(title="Error Creating Desk Folio", message=str(e))
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

