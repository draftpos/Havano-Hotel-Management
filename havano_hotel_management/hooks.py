app_name = "havano_hotel_management"
app_title = "Havano Hotel Management System"
app_publisher = "Alphazen Technologies"
app_description = "Hotel mangement system "
app_email = "info@alphazentechnologies.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "havano_hotel_management",
# 		"logo": "/assets/havano_hotel_management/logo.png",
# 		"title": "Havano Hotel Management System",
# 		"route": "/havano_hotel_management",
# 		"has_permission": "havano_hotel_management.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/havano_hotel_management/css/app.css"
# app_include_js = "/assets/havano_hotel_management/js/havano_hotel_management.js"

# include js, css files in header of web template
# web_include_css = "/assets/havano_hotel_management/css/havano_hotel_management.css"
# web_include_js = "/assets/havano_hotel_management/js/havano_hotel_management.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "havano_hotel_management/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
	"Sales Invoice": "public/js/custom_scripts/sales_invoice.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "havano_hotel_management/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "havano_hotel_management.utils.jinja_methods",
# 	"filters": "havano_hotel_management.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "havano_hotel_management.install.before_install"
# after_install = "havano_hotel_management.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "havano_hotel_management.uninstall.before_uninstall"
# after_uninstall = "havano_hotel_management.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "havano_hotel_management.utils.before_app_install"
# after_app_install = "havano_hotel_management.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "havano_hotel_management.utils.before_app_uninstall"
# after_app_uninstall = "havano_hotel_management.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "havano_hotel_management.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

doc_events = {
    "Check In": {
        # "validate": "havano_hotel_management.api.validate_check_in",
        "on_submit": [
            "havano_hotel_management.api.create_sales_invoice",
            "havano_hotel_management.api.redirect_to_hotel_dashboard_after_checkin"
        ]
    },
    "Booking": {
        # "validate": "havano_hotel_management.api.validate_booking",
        "on_submit": "havano_hotel_management.havano_hotel_management_system.doctype.booking.booking.create_sales_invoice"
    },
    "Customer": {
        "after_insert": "havano_hotel_management.api.create_hotel_guest_from_customer"
    },
    "Payment Entry": {
        "on_submit": "havano_hotel_management.api.update_check_in_balance_on_payment_entry_submit"
    },
}

fixtures = [
    "Custom Field"
]
# Scheduled Tasks
# ---------------
# filepath: /home/frappe/frappe-bench/apps/havano_hotel_management/havano_hotel_management/hooks.py

scheduler_events = {
    "cron": {
        "*/30 * * * *": [
            "havano_hotel_management.havano_hotel_management_system.doctype.booking.booking.check_and_update_bookings"
        ],
        
    },
    "daily": [
        "havano_hotel_management.api.update_room_statuses_from_reservations"
    ]
}
# scheduler_events = {
# 	"all": [
# 		"havano_hotel_management.tasks.all"
# 	],
# 	"daily": [
# 		"havano_hotel_management.tasks.daily"
# 	],
# 	"hourly": [
# 		"havano_hotel_management.tasks.hourly"
# 	],
# 	"weekly": [
# 		"havano_hotel_management.tasks.weekly"
# 	],
# 	"monthly": [
# 		"havano_hotel_management.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "havano_hotel_management.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "havano_hotel_management.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "havano_hotel_management.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["havano_hotel_management.utils.before_request"]
# after_request = ["havano_hotel_management.utils.after_request"]

# Job Events
# ----------
# before_job = ["havano_hotel_management.utils.before_job"]
# after_job = ["havano_hotel_management.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"havano_hotel_management.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

