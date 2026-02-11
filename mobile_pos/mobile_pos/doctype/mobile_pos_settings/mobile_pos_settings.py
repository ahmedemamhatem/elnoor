# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class MobilePOSSettings(Document):
	pass


def get_mobile_pos_settings(company=None):
	"""
	Get Mobile POS Settings for the specified company.

	Args:
		company: Company name. If not provided, uses the user's default company
		         or the first available settings.

	Returns:
		Mobile POS Settings document or frappe._dict with default values

	Usage:
		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
		settings = get_mobile_pos_settings(company)
	"""
	if not company:
		# Try to get user's default company
		company = frappe.defaults.get_user_default("Company")

	if not company:
		# Try to get global default company
		company = frappe.db.get_single_value("Global Defaults", "default_company")

	# Try to get settings for the specific company
	if company:
		settings_name = frappe.db.get_value(
			"Mobile POS Settings",
			{"company": company, "enabled": 1},
			"name"
		)
		if settings_name:
			return frappe.get_doc("Mobile POS Settings", settings_name)

	# Fallback: Try to get any enabled settings
	settings_name = frappe.db.get_value(
		"Mobile POS Settings",
		{"enabled": 1},
		"name",
		order_by="creation asc"
	)
	if settings_name:
		return frappe.get_doc("Mobile POS Settings", settings_name)

	# Return empty dict-like object if no settings found
	return frappe._dict({
		"company": company,
		"enabled": 0,
		"main_warehouse": None,
		"allow_negative_stock": 0,
		"default_parent_account_for_expense": None,
		"default_parent_account_for_discount": None,
		"invoice_discount_account": None,
		"selling_price_list": None,
		"parent_shareholder_payable_account": None,
		"auto_create_shareholder_account": 0,
		"profit_sharing_expense_account": None,
		"employee_purchases_account": None,
		"employee_salary_account": None,
		"employee_long_term_loan_account": None
	})


def get_settings_value(fieldname, company=None):
	"""
	Get a single value from Mobile POS Settings for the specified company.

	Args:
		fieldname: The field name to retrieve
		company: Company name. If not provided, uses default company detection.

	Returns:
		The field value or None

	Usage:
		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
		allow_negative = get_settings_value("allow_negative_stock", company)
	"""
	if not company:
		company = frappe.defaults.get_user_default("Company")

	if not company:
		company = frappe.db.get_single_value("Global Defaults", "default_company")

	# Try to get value for specific company
	if company:
		value = frappe.db.get_value(
			"Mobile POS Settings",
			{"company": company, "enabled": 1},
			fieldname
		)
		if value is not None:
			return value

	# Fallback: get from any enabled settings
	return frappe.db.get_value(
		"Mobile POS Settings",
		{"enabled": 1},
		fieldname,
		order_by="creation asc"
	)


@frappe.whitelist()
def get_group_expense_accounts(doctype, txt, searchfield, start, page_len, filters):
	"""Filter to show only group accounts with Expense root type"""
	company = filters.get("company") if filters else None

	conditions = """
		is_group = 1
		AND docstatus < 2
		AND root_type = 'Expense'
		AND (name LIKE %(txt)s OR account_name LIKE %(txt)s)
	"""

	if company:
		conditions += " AND company = %(company)s"

	return frappe.db.sql("""
		SELECT name, account_name
		FROM `tabAccount`
		WHERE {conditions}
		ORDER BY name
		LIMIT %(start)s, %(page_len)s
	""".format(conditions=conditions), {
		"txt": "%" + txt + "%",
		"start": start,
		"page_len": page_len,
		"company": company
	})
