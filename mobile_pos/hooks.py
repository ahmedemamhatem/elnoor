app_name = "mobile_pos"
app_title = "Mobile Pos"
app_publisher = "Ahmed Emam"
app_description = "mobile_pos"
app_email = "ahmedemamhatem@gmail.com"
app_license = "mit"

# Fixtures
# --------
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            [
                "name",
                "in",
                [
                    "User-pos_user_type",
                    "Item-custom_show_on_web",
                    "Customer-custom_phone",
                    "Customer-custom_email",
                    "Customer-custom_favorites",
                    "Customer-custom_mini_pos_profile",
                    "Sales Order-custom_stock_transfer",
                    "Sales Order-mini_pos_profile",
                    "Sales Invoice-custom_paid_amount",
                    "Sales Invoice-custom_customer_balance_after",
                    "Customer-custom_company",
                    "Journal Entry-custom_mini_pos_profile",
                    "Sales Invoice-custom_employee_invoice",
                    "Sales Invoice-custom_employee",
                    "Journal Entry-custom_pos_employee_loan"
                ]
            ]
        ]
    },
    {
        "dt": "Custom HTML Block",
        "filters": [
            ["name", "=", "POS Welcome Banner"]
        ]
    }
]

# Apps
# ------------------

# required_apps = []
app_name = "mobile_pos"
# ... other hooks

# Expose public files under /assets/mobile_pos/
app_include_js = [
    # include your service worker registration script here if you want
]
website_route_rules = [
    {"from_route": "/manifest.json", "to_route": "mobile_pos/public/manifest.json"},
    {"from_route": "/service-worker.js", "to_route": "mobile_pos/public/service-worker.js"},
    {"from_route": "/login", "to_route": "/main"},
]
# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "mobile_pos",
# 		"logo": "/assets/mobile_pos/logo.png",
# 		"title": "Mobile Pos",
# 		"route": "/mobile_pos",
# 		"has_permission": "mobile_pos.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/mobile_pos/css/mobile_pos.css"
# app_include_js = "/assets/mobile_pos/js/mobile_pos.js"

# include js, css files in header of web template
# web_include_css = "/assets/mobile_pos/css/mobile_pos.css"
# web_include_js = "/assets/mobile_pos/js/mobile_pos.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "mobile_pos/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "mobile_pos/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
home_page = "main"

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
# 	"methods": "mobile_pos.utils.jinja_methods",
# 	"filters": "mobile_pos.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "mobile_pos.install.before_install"
# after_install = "mobile_pos.install.after_install"

# Migrate
# -------
after_migrate = [
    "mobile_pos.setup.after_migrate",
    "mobile_pos.mobile_pos.fixtures.party_type_setup.setup_pos_employee_party_type"
]

# Uninstallation
# ------------

# before_uninstall = "mobile_pos.uninstall.before_uninstall"
# after_uninstall = "mobile_pos.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "mobile_pos.utils.before_app_install"
# after_app_install = "mobile_pos.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "mobile_pos.utils.before_app_uninstall"
# after_app_uninstall = "mobile_pos.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "mobile_pos.notifications.get_notification_config"

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

doc_events = {
	"Sales Invoice": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company",
		"on_submit": [
			"mobile_pos.mobile_pos.utils.invoice_utils.fix_incoming_rate_on_submit",
			"mobile_pos.mobile_pos.doctype.share_ledger.share_ledger.create_share_ledger_from_sales_invoice",
			"mobile_pos.mobile_pos.utils.invoice_utils.set_customer_balance_on_submit",
			"mobile_pos.mobile_pos.employee_sales.on_submit_sales_invoice"
		],
		"on_cancel": [
			"mobile_pos.mobile_pos.doctype.share_ledger.share_ledger.cancel_share_ledger_from_sales_invoice",
			"mobile_pos.mobile_pos.employee_sales.on_cancel_sales_invoice"
		]
	},
	"Purchase Invoice": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company"
	},
	"Sales Order": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company"
	},
	"Purchase Order": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company"
	},
	"Delivery Note": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company"
	},
	"Purchase Receipt": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company"
	},
	"Subcontracting Receipt": {
		"before_save": "mobile_pos.mobile_pos.utils.invoice_utils.set_represents_company"
	},
	"Journal Entry": {
		"on_submit": "mobile_pos.mobile_pos.doctype.share_ledger.share_ledger.create_share_ledger_from_journal_entry",
		"on_cancel": "mobile_pos.mobile_pos.doctype.share_ledger.share_ledger.cancel_share_ledger_from_journal_entry"
	}
}

# Scheduled Tasks
# ---------------

scheduler_events = {
	"hourly": [
		"mobile_pos.tasks.auto_reconcile_payments"
	],
}

# Testing
# -------

# before_tests = "mobile_pos.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "mobile_pos.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "mobile_pos.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["mobile_pos.utils.before_request"]
# after_request = ["mobile_pos.utils.after_request"]

# Job Events
# ----------
# before_job = ["mobile_pos.utils.before_job"]
# after_job = ["mobile_pos.utils.after_job"]

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
# 	"mobile_pos.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

