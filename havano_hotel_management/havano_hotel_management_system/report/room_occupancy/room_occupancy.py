# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see license.txt

# import frappe


# def execute(filters=None):
# 	columns, data = [], []
# 	return columns, data


# Copyright (c) 2025, Alphazen Technologies and contributors
# For license information, please see licence

import frappe
from frappe import _
from datetime import datetime, timedelta

def execute(filters=None):
    if not filters:
        filters = {}
    
    # Define columns
    columns = [
        {"fieldname": "room_type", "label": _("Room Type"), "fieldtype": "Link", "options": "Room Type", "width": 150},
        {"fieldname": "total_rooms", "label": _("Total Rooms"), "fieldtype": "Int", "width": 120},
        {"fieldname": "occupied_rooms", "label": _("Occupied Rooms"), "fieldtype": "Int", "width": 120},
        {"fieldname": "reserved_rooms", "label": _("Reserved Rooms"), "fieldtype": "Int", "width": 120},
        {"fieldname": "available_rooms", "label": _("Available Rooms"), "fieldtype": "Int", "width": 120},
        {"fieldname": "occupancy_rate", "label": _("Occupancy Rate"), "fieldtype": "Percent", "width": 120},
        {"fieldname": "total_revenue", "label": _("Total Revenue"), "fieldtype": "Currency", "width": 150},
        {"fieldname": "avg_daily_rate", "label": _("Avg Daily Rate"), "fieldtype": "Currency", "width": 150}
    ]

    # Fetch data
    data = get_room_occupancy_and_revenue_data(filters)
    # data = []
    
    # Add chart data - ensure we have data before creating chart
    chart = None
    if data and len(data) > 0:
        chart = get_chart_data(data)
    
    # Return empty list instead of None for data to avoid JSON parsing issues
    if not data:
        data = []
    
    # Return a proper dict for the 3rd parameter (message) instead of None
    message = None
    
    return columns, data, message, chart

def get_room_occupancy_and_revenue_data(filters):
    try:
        date_filters = get_date_filter_conditions(filters)
        room_filters = get_room_filter_conditions(filters)
        
        # Fetch data from the database
        data = frappe.db.sql(f"""
            WITH RoomStats AS (
                SELECT 
                    room.room_type,
                    COUNT(room.name) AS total_rooms,
                    COUNT(CASE WHEN room.status = 'Occupied' THEN 1 END) AS occupied_rooms,
                    COUNT(CASE WHEN room.status = 'Reserved' THEN 1 END) AS reserved_rooms,
                    COUNT(CASE WHEN room.status = 'Available' THEN 1 END) AS available_rooms
                FROM `tabRoom` AS room
                WHERE 1=1 {room_filters}
                GROUP BY room.room_type
            ),
            RevenueStats AS (
                SELECT 
                    room.room_type,
                    SUM(CASE 
                        WHEN checkin.docstatus = 1 THEN checkin.total_charge 
                        ELSE IFNULL(reservation.advance_payment, 0) 
                    END) AS total_revenue,
                    COUNT(DISTINCT CASE WHEN checkin.docstatus = 1 THEN checkin.name END) AS total_checkins,
                    SUM(CASE WHEN checkin.docstatus = 1 THEN checkin.nights ELSE 0 END) AS total_nights
                FROM `tabRoom` AS room
                LEFT JOIN `tabCheck In` AS checkin ON room.name = checkin.room AND checkin.docstatus = 1 {date_filters}
                LEFT JOIN `tabReservation` AS reservation ON room.name = reservation.room AND reservation.payment_status IN ('Paid', 'Partial') {date_filters}
                WHERE 1=1 {room_filters}
                GROUP BY room.room_type
            )
            SELECT 
                rs.room_type,
                rs.total_rooms,
                rs.occupied_rooms,
                rs.reserved_rooms,
                rs.available_rooms,
                CASE 
                    WHEN rs.total_rooms > 0 THEN (rs.occupied_rooms / rs.total_rooms) * 100 
                    ELSE 0 
                END AS occupancy_rate,
                IFNULL(rev.total_revenue, 0) AS total_revenue,
                CASE 
                    WHEN IFNULL(rev.total_nights, 0) > 0 THEN IFNULL(rev.total_revenue, 0) / rev.total_nights 
                    ELSE 0 
                END AS avg_daily_rate
            FROM RoomStats rs
            LEFT JOIN RevenueStats rev ON rs.room_type = rev.room_type
            ORDER BY rs.room_type
        """, as_dict=True)
        
        # Ensure we return an empty list if no data
        return data
    except Exception as e:
        frappe.log_error(f"Error in Room Occupancy & Revenue Report: {str(e)}")
        return []

def get_date_filter_conditions(filters):
    conditions = []
    
    # Filter by date range - ensure proper formatting and escaping
    if filters.get("from_date") and filters.get("to_date"):
        from_date = frappe.db.escape(filters.get('from_date'))
        to_date = frappe.db.escape(filters.get('to_date'))
        conditions.append(f"""
            AND (
                (checkin.check_in_date BETWEEN {from_date} AND {to_date})
                OR (reservation.check_in_date BETWEEN {from_date} AND {to_date})
            )
        """)
    elif filters.get("from_date"):
        from_date = frappe.db.escape(filters.get('from_date'))
        conditions.append(f"""
            AND (
                checkin.check_in_date >= {from_date}
                OR reservation.check_in_date >= {from_date}
            )
        """)
    elif filters.get("to_date"):
        to_date = frappe.db.escape(filters.get('to_date'))
        conditions.append(f"""
            AND (
                checkin.check_in_date <= {to_date}
                OR reservation.check_in_date <= {to_date}
            )
        """)
    
    return " ".join(conditions)

def get_room_filter_conditions(filters):
    conditions = []
    
    # Filter by room type - ensure proper escaping
    if filters.get("room_type"):
        conditions.append(f"AND room.room_type = {frappe.db.escape(filters.get('room_type'))}")
    
    # Filter by floor
    if filters.get("floor"):
        conditions.append(f"AND room.floor = {frappe.db.escape(filters.get('floor'))}")
    
    # Filter by housekeeping status
    if filters.get("housekeeping_status"):
        conditions.append(f"AND room.housekeeping_status = {frappe.db.escape(filters.get('housekeeping_status'))}")
    
    return " ".join(conditions)

def get_chart_data(data):
    if not data or len(data) == 0:
        return None
        
    labels = [row.get("room_type") or "Unknown" for row in data]
    occupancy_rates = [row.get("occupancy_rate") or 0 for row in data]
    revenues = [row.get("total_revenue") or 0 for row in data]
    
    return {
        "data": {
            "labels": labels,
            "datasets": [
                {
                    "name": _("Occupancy Rate (%)"),
                    "values": occupancy_rates,
                    "chartType": "bar"
                },
                {
                    "name": _("Revenue"),
                    "values": revenues,
                    "chartType": "line"
                }
            ]
        },
        "type": "axis-mixed",
        "height": 300,
        "colors": ["#7cd6fd", "#5e64ff"]
    }