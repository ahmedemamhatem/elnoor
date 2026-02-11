# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Expense(Document):
	def validate(self):
		"""Validate and set default parent account from settings"""
		if not self.parent_account:
			# Get default parent account from settings for the company
			from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
			default_parent = get_settings_value("default_parent_account_for_expense", self.company)
			if default_parent:
				self.parent_account = default_parent
			else:
				frappe.throw(_(
					"Please set Parent Account field or configure Default Parent Account for Expense in Mobile POS Settings for company {0}"
				).format(self.company))

		# Validate that parent account is a group
		if self.parent_account:
			is_group = frappe.db.get_value("Account", self.parent_account, "is_group")
			if not is_group:
				frappe.throw(_(
					"Parent Account {0} must be a group account. "
					"Please go to Mobile POS Settings and select a GROUP account (like 'Indirect Expenses' or 'Expenses')."
				).format(frappe.bold(self.parent_account)))

	def before_insert(self):
		"""Create expense account before inserting the expense"""
		# Ensure parent account is set before creating expense account
		if not self.parent_account:
			# Try to get it from settings one more time for the company
			from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
			default_parent = get_settings_value("default_parent_account_for_expense", self.company)
			if default_parent:
				self.parent_account = default_parent
			else:
				frappe.throw(_(
					"Cannot create expense account without a parent account. "
					"Please set Default Parent Account in Mobile POS Settings for company {0}."
				).format(self.company))

		if not self.expense_account:
			self.expense_account = self.create_expense_account()

	def create_expense_account(self):
		"""Create a new expense account for this expense"""
		# Ensure parent account is set
		if not self.parent_account:
			frappe.throw(_(
				"Cannot create expense account without a parent account. "
				"Parent account: {0}"
			).format(self.parent_account or "Not Set"))

		# Check if account already exists
		account_name = f"{self.expense_name} - {frappe.get_cached_value('Company', self.company, 'abbr')}"
		existing_account = frappe.db.exists("Account", account_name)

		if existing_account:
			return existing_account

		# Create new account
		account = frappe.new_doc("Account")
		account.account_name = self.expense_name
		account.company = self.company
		account.parent_account = self.parent_account
		account.account_type = "Expense Account"
		account.is_group = 0
		account.flags.ignore_permissions = True

		try:
			account.save()
			frappe.msgprint(_("Expense Account {0} created successfully").format(account.name))
		except Exception as e:
			frappe.throw(_("Failed to create expense account: {0}").format(str(e)))

		return account.name


@frappe.whitelist()
def get_parent_account_query(doctype, txt, searchfield, start, page_len, filters):
	"""Filter parent account to show only group accounts"""
	company = filters.get("company")

	return frappe.db.sql("""
		SELECT name, account_name
		FROM `tabAccount`
		WHERE is_group = 1
			AND docstatus < 2
			AND company = %(company)s
			AND (name LIKE %(txt)s OR account_name LIKE %(txt)s)
		ORDER BY name
		LIMIT %(start)s, %(page_len)s
	""", {
		"company": company,
		"txt": "%" + txt + "%",
		"start": start,
		"page_len": page_len
	})
