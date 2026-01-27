# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Room(Document):
    def validate(self):
        self.calculate_title()
        self.update_current_checkin()
        self.calculate_checkout_status()
    
    def on_update(self):
        """Update calculated fields when document is updated"""
        # Only update if not already being updated (prevent recursion)
        if not hasattr(frappe.flags, 'updating_room_fields'):
            frappe.flags.updating_room_fields = True
            try:
                # Recalculate fields
                self.calculate_title()
                self.calculate_checkout_status()
                
                # Save the fields if they changed (without triggering modified timestamp)
                if self.has_value_changed("title"):
                    frappe.db.set_value("Room", self.name, "title", self.title, update_modified=False)
                if self.has_value_changed("checkout_status"):
                    frappe.db.set_value("Room", self.name, "checkout_status", self.checkout_status, update_modified=False)
            finally:
                frappe.flags.updating_room_fields = False
    
    def calculate_title(self):
        """Calculate and set title based on room_name and status"""
        if self.room_name and self.status:
            self.title = f"{self.room_name} - {self.status}"
        elif self.room_name:
            self.title = self.room_name
    
    def update_current_checkin(self):
        """Clear current_checkin when status is Available"""
        if self.status == "Available":
            self.current_checkin = ""
    
    def calculate_checkout_status(self):
        """Calculate checkout_status based on checkout_date and current date"""
        if self.status == "Occupied" and self.checkout_date:
            from frappe.utils import getdate, today
            checkout_date = getdate(self.checkout_date)
            today_date = getdate(today())
            
            if checkout_date < today_date:
                self.checkout_status = "Overdue"
            else:
                self.checkout_status = "In"
        elif self.status == "Occupied":
            self.checkout_status = "In"
        else:
            # For non-occupied rooms, clear checkout_status
            self.checkout_status = ""

    def before_insert(self):
        self.validate_room_item()

    def validate_room_item(self):
        if not self.room_item:
            self.create_room_item()

    def create_room_item(self):
        hotel_item_group = frappe.db.get_single_value("Hotel Settings", "hotel_item_group")

        new_item = frappe.get_doc({
            "doctype": "Item",
            "item_code": self.room_number,
            "item_name": self.room_number,
            "is_stock_item": 0,
            "standard_rate": self.price,
            "item_group": hotel_item_group,
            "stock_uom": "Nos"
        })

        new_item.insert()
        self.room_item = new_item.name


@frappe.whitelist()
def update_room_fields(room_name, update_data):
    """
    Helper function to update Room fields and recalculate derived fields
    This ensures title and checkout_status are always up-to-date
    """
    try:
        # Get current values from database
        current_values = frappe.db.get_value(
            "Room",
            room_name,
            ["room_name", "status", "checkout_date", "title", "checkout_status"],
            as_dict=True
        )
        
        if not current_values:
            frappe.throw(_("Room {0} not found").format(room_name))
        
        # Update the room with provided data
        if update_data:
            frappe.db.set_value("Room", room_name, update_data, update_modified=False)
            # Update current_values with new data for calculation
            current_values.update(update_data)
        
        # Recalculate title
        if current_values.get("room_name") and current_values.get("status"):
            new_title = f"{current_values['room_name']} - {current_values['status']}"
        elif current_values.get("room_name"):
            new_title = current_values['room_name']
        else:
            new_title = current_values.get("title", "")
        
        # Recalculate checkout_status
        new_checkout_status = ""
        if current_values.get("status") == "Occupied" and current_values.get("checkout_date"):
            from frappe.utils import getdate, today
            checkout_date = getdate(current_values["checkout_date"])
            today_date = getdate(today())
            
            if checkout_date < today_date:
                new_checkout_status = "Overdue"
            else:
                new_checkout_status = "In"
        elif current_values.get("status") == "Occupied":
            new_checkout_status = "In"
        
        # Update calculated fields only if they changed
        recalc_data = {}
        if current_values.get("title") != new_title:
            recalc_data["title"] = new_title
        if current_values.get("checkout_status") != new_checkout_status:
            recalc_data["checkout_status"] = new_checkout_status
        
        if recalc_data:
            frappe.db.set_value("Room", room_name, recalc_data, update_modified=False)
        
        frappe.db.commit()
        return {"success": True}
    except Exception as e:
        frappe.log_error(title="Error Updating Room Fields", message=str(e))
        frappe.throw(_("Error updating room fields: {0}").format(str(e)))


@frappe.whitelist()
def get_room_history(room_name):
    return frappe.db.sql("""
        SELECT
            guest AS guest_name,
            check_in_date AS checkin_date,
            check_out_date AS checkout_date,
            nights,
            NULL AS amount,
            'Reservation' AS source
        FROM `tabReservation`
        WHERE room = %s AND docstatus = 1

        UNION ALL

        SELECT
            guest_name,
            check_in_date AS checkin_date,
            check_out_date AS checkout_date,
            nights,
            total_charge AS amount,
            'Check In' AS source
        FROM `tabCheck In`
        WHERE room = %s AND docstatus = 1

        UNION ALL

        SELECT
            guest AS guest_name,
            NULL AS checkin_date,
            actual_check_out_time AS checkout_date,
            NULL AS nights,
            total_charges AS amount,
            'Check Out' AS source
        FROM `tabCheck Out`
        WHERE room = %s AND docstatus = 1

        ORDER BY checkin_date DESC
    """, (room_name, room_name, room_name), as_dict=True)
