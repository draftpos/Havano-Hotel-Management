# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Housekeeping(Document):
	def validate(self):
		# Update the selected room's housekeeping status to match the cleaning status
		if self.room and self.cleaning_status:
			# Update the room's housekeeping_status
			frappe.db.set_value("Room", self.room, "housekeeping_status", self.cleaning_status, update_modified=False)
			
			# If cleaning status is "Clean" and last_cleaned is set, update last_cleaned_date
			if self.cleaning_status == "Clean" and self.last_cleaned:
				from frappe.utils import getdate
				last_cleaned_date = getdate(self.last_cleaned)
				frappe.db.set_value("Room", self.room, "last_cleaned_date", last_cleaned_date, update_modified=False)
		
