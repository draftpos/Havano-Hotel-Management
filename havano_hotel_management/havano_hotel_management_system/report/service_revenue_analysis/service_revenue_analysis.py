# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from datetime import datetime, timedelta, date

def execute(filters=None):
    if not filters:
        filters = {}
    
    columns = get_columns()
    data = get_data(filters)
    
    chart_data = get_chart_data(data, filters)
    summary = get_summary(data)
    
    return columns, data, None, chart_data

def get_columns():
    return [
        {"fieldname": "date", "label": _("Date"), "fieldtype": "Date", "width": 90},
        {
            "fieldname": "room_type",
            "label": _("Room Type"),
            "fieldtype": "Link",
            "options": "Room",
            "width": 120,
        },
        {
            "fieldname": "room_id",
            "label": _("Room ID"),
            "fieldtype": "Link",
            "options": "Room",
            "width": 100,
        },
        {
            "fieldname": "occupancy_status",
            "label": _("Occupancy Status"),
            "fieldtype": "Data",
            "width": 130,
        },
        {
            "fieldname": "reservation_id",
            "label": _("Reservation ID"),
            "fieldtype": "Link",
            "options": "Reservation",
            "width": 130,
        },
        {
            "fieldname": "checkin_id",
            "label": _("Checkin ID"),
            "fieldtype": "Link",
            "options": "Check In",
            "width": 130,
        },
        {
            "fieldname": "guest_name",
            "label": _("Guest Name"),
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "fieldname": "daily_rate",
            "label": _("Daily Rate"),
            "fieldtype": "Currency",
            "width": 110,
        },
        {
            "fieldname": "additional_charges",
            "label": _("Additional Charges"),
            "fieldtype": "Currency",
            "width": 150,
        },
        {
            "fieldname": "total_revenue",
            "label": _("Total Revenue"),
            "fieldtype": "Currency",
            "width": 130,
        },
    ]

def get_data(filters):
    # Date range for the report
    start_date = filters.get("from_date") or frappe.utils.today()
    end_date = filters.get("to_date") or frappe.utils.add_days(start_date, 30)
    
    # Ensure we have date objects for comparison
    if isinstance(start_date, str):
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
    elif isinstance(start_date, datetime):
        start_date_obj = start_date.date()
    else:
        start_date_obj = start_date
        
    if isinstance(end_date, str):
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
    elif isinstance(end_date, datetime):
        end_date_obj = end_date.date()
    else:
        end_date_obj = end_date
    
    # Get all rooms
    rooms = frappe.get_all(
        "Room",
        fields=["name", "room_type", "price"],
        filters=filters.get("room_type") and {"room_type": filters.get("room_type")} or {},
    )
    
    # Get all checkins within date range
    checkins = frappe.get_all(
        "Check In",
        fields=[
            "name",
            "room",
            "guest_name",
            "check_in_date",
            "check_out_date",
            "total_charge",
        ],
        filters=[
            ["check_in_date", "<=", end_date],
            ["check_out_date", ">=", start_date],
        ],
    )
    
    # Get all reservations within date range
    reservations = frappe.get_all(
        "Reservation",
        fields=[
            "name",
            "room",
            "guest",
            "check_in_date",
            "check_out_date",
        ],
        filters=[
            ["check_in_date", "<=", end_date],
            ["check_out_date", ">=", start_date],
        ],
    )
    
    # Prepare data
    data = []
    current_date = start_date_obj
    
    while current_date <= end_date_obj:
        date_str = current_date.strftime("%Y-%m-%d")
        
        for room in rooms:
            # Check if room is occupied on this date
            occupied_checkin = None
            for c in checkins:
                # Convert check-in date to date object
                if isinstance(c.check_in_date, str):
                    check_in_date = datetime.strptime(c.check_in_date, "%Y-%m-%d").date()
                elif isinstance(c.check_in_date, datetime):
                    check_in_date = c.check_in_date.date()
                else:
                    check_in_date = c.check_in_date
                
                # Convert check-out date to date object
                if isinstance(c.check_out_date, str):
                    check_out_date = datetime.strptime(c.check_out_date, "%Y-%m-%d").date()
                elif isinstance(c.check_out_date, datetime):
                    check_out_date = c.check_out_date.date()
                else:
                    check_out_date = c.check_out_date
                
                if (c.room == room.name and 
                    check_in_date <= current_date and 
                    check_out_date > current_date):
                    occupied_checkin = c
                    break
            
            # Check if room is reserved on this date
            reserved = None
            for r in reservations:
                # Convert check-in date to date object
                if isinstance(r.check_in_date, str):
                    check_in_date = datetime.strptime(r.check_in_date, "%Y-%m-%d").date()
                elif isinstance(r.check_in_date, datetime):
                    check_in_date = r.check_in_date.date()
                else:
                    check_in_date = r.check_in_date
                
                # Convert check-out date to date object
                if isinstance(r.check_out_date, str):
                    check_out_date = datetime.strptime(r.check_out_date, "%Y-%m-%d").date()
                elif isinstance(r.check_out_date, datetime):
                    check_out_date = r.check_out_date.date()
                else:
                    check_out_date = r.check_out_date
                
                if (r.room == room.name and 
                    check_in_date <= current_date and 
                    check_out_date > current_date):
                    reserved = r
                    break
            
            status = "Available"
            checkin_id = ""
            reservation_id = ""
            guest_name = ""
            daily_rate = 0
            additional_charges = 0
            total_revenue = 0
            
            if occupied_checkin:
                status = "Occupied"
                checkin_id = occupied_checkin.name
                guest_name = occupied_checkin.guest_name
                daily_rate = room.price or 0
                
                # Calculate additional charges per day (distribute evenly across stay)
                # Convert check-in date to date object
                if isinstance(occupied_checkin.check_in_date, str):
                    check_in_date = datetime.strptime(occupied_checkin.check_in_date, "%Y-%m-%d").date()
                elif isinstance(occupied_checkin.check_in_date, datetime):
                    check_in_date = occupied_checkin.check_in_date.date()
                else:
                    check_in_date = occupied_checkin.check_in_date
                
                # Convert check-out date to date object
                if isinstance(occupied_checkin.check_out_date, str):
                    check_out_date = datetime.strptime(occupied_checkin.check_out_date, "%Y-%m-%d").date()
                elif isinstance(occupied_checkin.check_out_date, datetime):
                    check_out_date = occupied_checkin.check_out_date.date()
                else:
                    check_out_date = occupied_checkin.check_out_date
                
                stay_length = (check_out_date - check_in_date).days
                if stay_length <= 0:
                    stay_length = 1  # Ensure we don't divide by zero
                
                # Use total_charge if available, otherwise use room price
                total_charge = getattr(occupied_checkin, 'total_charge', 0) or 0
                
                # Calculate additional charges as the difference between total and daily rate
                # If total_charge is not available, set additional_charges to 0
                if total_charge > 0:
                    additional_charges = (total_charge - (daily_rate * stay_length)) / stay_length
                    if additional_charges < 0:
                        additional_charges = 0
                
                total_revenue = daily_rate + additional_charges
                
            elif reserved:
                status = "Reserved"
                reservation_id = reserved.name
                guest_name = reserved.guest
                daily_rate = room.price or 0
                total_revenue = daily_rate
            
            data.append({
                "date": date_str,
                "room_type": room.room_type,
                "room_id": room.name,
                "occupancy_status": status,
                "reservation_id": reservation_id,
                "checkin_id": checkin_id,
                "guest_name": guest_name,
                "daily_rate": daily_rate,
                "additional_charges": additional_charges,
                "total_revenue": total_revenue,
            })
        
        current_date += timedelta(days=1)
    
    return data

def get_chart_data(data, filters):
    # Prepare data for chart
    dates = []
    revenue_data = []
    occupancy_data = []
    
    # Group by date
    date_groups = {}
    for entry in data:
        date = entry["date"]
        if date not in date_groups:
            date_groups[date] = {
                "total_revenue": 0,
                "total_rooms": 0,
                "occupied_rooms": 0
            }
        
        date_groups[date]["total_revenue"] += entry["total_revenue"]
        date_groups[date]["total_rooms"] += 1
        if entry["occupancy_status"] in ["Occupied", "Reserved"]:
            date_groups[date]["occupied_rooms"] += 1
    
    # Sort dates
    sorted_dates = sorted(date_groups.keys())
    
    for date in sorted_dates:
        group = date_groups[date]
        dates.append(date)
        revenue_data.append(group["total_revenue"])
        occupancy_rate = (group["occupied_rooms"] / group["total_rooms"]) * 100 if group["total_rooms"] > 0 else 0
        occupancy_data.append(occupancy_rate)
    
    chart = {
        "data": {
            "labels": dates,
            "datasets": [
                {
                    "name": "Revenue",
                    "values": revenue_data,
                    "chartType": "bar"
                },
                {
                    "name": "Occupancy Rate (%)",
                    "values": occupancy_data,
                    "chartType": "line"
                }
            ]
        },
        "type": "axis-mixed",
        "height": 300,
        "colors": ["#5e64ff", "#ff5858"]
    }
    
    return chart

def get_summary(data):
    total_revenue = sum(entry["total_revenue"] for entry in data)
    total_room_days = len(data)
    occupied_days = sum(1 for entry in data if entry["occupancy_status"] in ["Occupied", "Reserved"])
    occupancy_rate = (occupied_days / total_room_days) * 100 if total_room_days > 0 else 0
    avg_daily_rate = total_revenue / occupied_days if occupied_days > 0 else 0
    
    return {
        "total_revenue": total_revenue,
        "occupancy_rate": f"{occupancy_rate:.2f}%",
        "avg_daily_rate": avg_daily_rate,
        "total_room_days": total_room_days,
        "occupied_days": occupied_days
    }
