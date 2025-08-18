# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Room(Document):
    def validate(self):
        # Prevent changing status (e.g., via Kanban View)
        if self.get_doc_before_save():
            if self.status != self.get_doc_before_save().status:
                frappe.throw("You are not allowed to change status from the Kanban View.")

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
