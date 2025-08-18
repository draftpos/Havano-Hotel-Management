import frappe
from frappe import _

def execute(filters=None):
    if not filters:
        filters = {}
        
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
    
    # data = [
    #     {"room_type": "Suite", "total_rooms": 40, "occupied_rooms": 10, "reserved_rooms": 10, "available_rooms": 10, "occupancy_rate": 10, "total_revenue": 10, "avg_daily_rate": 10,}
    # ]
    data = get_room_data(filters)
    
    chart = None
    if data and len(data) > 0:
        chart = get_chart_data(data)
        
    message = None
    
    return columns, data, message, chart

def get_room_data(filters):
    try:
        date_conditions = get_date_filter_conditions(filters)
        room_conditions = get_room_filter_conditions(filters)
        
        data = frappe.db.sql(f"""
            SELECT 
                room.room_type,
                COUNT(DISTINCT room.name) AS total_rooms,
                COUNT(DISTINCT CASE WHEN room.status = 'Occupied' THEN room.name END) AS occupied_rooms,
                COUNT(DISTINCT CASE WHEN room.status = 'Reserved' THEN room.name END) AS reserved_rooms,
                COUNT(DISTINCT CASE WHEN room.status = 'Available' THEN room.name END) AS available_rooms,
                ROUND(
                    CASE 
                        WHEN COUNT(DISTINCT room.name) > 0 THEN 
                            (COUNT(DISTINCT CASE WHEN room.status = 'Occupied' THEN room.name END) / COUNT(DISTINCT room.name)) * 100
                        ELSE 0
                    END, 2
                ) AS occupancy_rate,
                IFNULL(SUM(CASE WHEN checkin.docstatus = 1 THEN checkin.total_charge ELSE 0 END), 0) AS total_revenue,
                ROUND(
                    CASE 
                        WHEN SUM(CASE WHEN checkin.docstatus = 1 THEN checkin.nights ELSE 0 END) > 0 THEN
                            SUM(CASE WHEN checkin.docstatus = 1 THEN checkin.total_charge ELSE 0 END) / 
                            SUM(CASE WHEN checkin.docstatus = 1 THEN checkin.nights ELSE 0 END)
                        ELSE 0
                    END, 2
                ) AS avg_daily_rate
            FROM `tabRoom` AS room
            LEFT JOIN `tabCheck In` AS checkin ON room.name = checkin.room AND checkin.docstatus = 1 {date_conditions}
            WHERE 1=1 {room_conditions}
            GROUP BY room.room_type
            ORDER BY room.room_type
        """, as_dict=True)
        
        return data
    except Exception as e:
        frappe.log_error(f"Error in Room Occupancy & Revenue Report: {str(e)}")
        return []

def get_date_filter_conditions(filters):
    conditions = ""
    
    if filters.get("date_range") and isinstance(filters.get("date_range"), list) and len(filters.get("date_range")) == 2:
        from_date, to_date = filters.get("date_range")
        conditions += f" AND checkin.creation BETWEEN {frappe.db.escape(from_date)} AND {frappe.db.escape(to_date)}"
    else:
        if filters.get("from_date"):
            conditions += f" AND checkin.creation >= {frappe.db.escape(filters.get('from_date'))}"
        if filters.get("to_date"):
            conditions += f" AND checkin.creation <= {frappe.db.escape(filters.get('to_date'))}"
    
    return conditions

def get_room_filter_conditions(filters):
    conditions = ""
    
    if filters.get("room_type"):
        conditions += f" AND room.room_type = {frappe.db.escape(filters.get('room_type'))}"
    
    if filters.get("floor"):
        conditions += f" AND room.floor = {frappe.db.escape(filters.get('floor'))}"
    
    if filters.get("housekeeping_status"):
        conditions += f" AND room.housekeeping_status = {frappe.db.escape(filters.get('housekeeping_status'))}"
    
    return conditions
def get_date_conditions(filters):
    conditions = []
    
    # Filter by date range
    if filters.get("date_range") and isinstance(filters.get("date_range"), list) and len(filters.get("date_range")) == 2:
        from_date, to_date = filters.get("date_range")
        conditions.append(f"""
            AND (
                (checkin.check_in_date BETWEEN {frappe.db.escape(from_date)} AND {frappe.db.escape(to_date)})
                OR (reservation.check_in_date BETWEEN {frappe.db.escape(from_date)} AND {frappe.db.escape(to_date)})
                OR (checkout.check_out_date BETWEEN {frappe.db.escape(from_date)} AND {frappe.db.escape(to_date)})
            )
        """)
    elif filters.get("from_date") or filters.get("to_date"):
        if filters.get("from_date"):
            conditions.append(f"""
                AND (
                    checkin.check_in_date >= {frappe.db.escape(filters.get('from_date'))}
                    OR reservation.check_in_date >= {frappe.db.escape(filters.get('from_date'))}
                    OR checkout.check_out_date >= {frappe.db.escape(filters.get('from_date'))}
                )
            """)
        if filters.get("to_date"):
            conditions.append(f"""
                AND (
                    checkin.check_in_date <= {frappe.db.escape(filters.get('to_date'))}
                    OR reservation.check_in_date <= {frappe.db.escape(filters.get('to_date'))}
                    OR checkout.check_out_date <= {frappe.db.escape(filters.get('to_date'))}
                )
            """)
    
    return " ".join(conditions)

def get_room_conditions(filters):
    conditions = []
    
    # Filter by room type
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
    
    labels = []
    occupancy_rates = []
    revenues = []
    
    for row in data:
        labels.append(row.get("room_type") or "Unknown")
        occupancy_rates.append(float(row.get("occupancy_rate") or 0))
        revenues.append(float(row.get("total_revenue") or 0))
    
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