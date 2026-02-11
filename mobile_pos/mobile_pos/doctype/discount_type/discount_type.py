# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class DiscountType(Document):
	def validate(self):
		"""Validate and set default parent account from settings"""
		if not self.parent_account:
			# Get default parent account from settings for the company
			from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
			default_parent = get_settings_value("default_parent_account_for_discount", self.company)
			if default_parent:
				self.parent_account = default_parent
			else:
				frappe.throw(_(
					"Please set Parent Account field or configure Default Parent Account for Discount in Mobile POS Settings for company {0}"
				).format(self.company))

		# Validate that parent account is a group
		if self.parent_account:
			is_group = frappe.db.get_value("Account", self.parent_account, "is_group")
			if not is_group:
				frappe.throw(_(
					"Parent Account {0} must be a group account. "
					"Please go to Mobile POS Settings and select a GROUP account (like 'Direct Expenses' or 'Expenses')."
				).format(frappe.bold(self.parent_account)))

	def before_insert(self):
		"""Create discount account before inserting the discount type"""
		# Ensure parent account is set before creating discount account
		if not self.parent_account:
			# Try to get it from settings one more time for the company
			from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
			default_parent = get_settings_value("default_parent_account_for_discount", self.company)
			if default_parent:
				self.parent_account = default_parent
			else:
				frappe.throw(_(
					"Cannot create discount account without a parent account. "
					"Please set Default Parent Account for Discount in Mobile POS Settings for company {0}."
				).format(self.company))

		if not self.discount_account:
			self.discount_account = self.create_discount_account()

	def after_rename(self, old_name, new_name, merge=False):
		"""Rename the linked discount account when Discount Type is renamed"""
		if self.discount_account and not merge:
			# Get company abbreviation
			company_abbr = frappe.get_cached_value('Company', self.company, 'abbr')
			old_account_name = f"{old_name} - {company_abbr}"
			new_account_name = f"{new_name} - {company_abbr}"

			# Check if the old account exists
			if frappe.db.exists("Account", old_account_name):
				try:
					# Rename the account
					frappe.rename_doc("Account", old_account_name, new_account_name, force=True)
					# Update the discount_account field
					self.db_set("discount_account", new_account_name)
					frappe.msgprint(_("Discount Account renamed from {0} to {1}").format(
						old_account_name, new_account_name
					))
				except Exception as e:
					frappe.log_error(
						f"Failed to rename discount account from {old_account_name} to {new_account_name}: {str(e)}",
						"Discount Type Rename Error"
					)
					frappe.msgprint(
						_("Warning: Could not rename the linked account. Please rename it manually."),
						indicator="orange"
					)

	def create_discount_account(self):
		"""Create a new discount account for this discount type"""
		# Ensure parent account is set
		if not self.parent_account:
			frappe.throw(_(
				"Cannot create discount account without a parent account. "
				"Parent account: {0}"
			).format(self.parent_account or "Not Set"))

		# Check if account already exists
		account_name = f"{self.discount_type_name} - {frappe.get_cached_value('Company', self.company, 'abbr')}"
		existing_account = frappe.db.exists("Account", account_name)

		if existing_account:
			return existing_account

		# Create new account
		account = frappe.new_doc("Account")
		account.account_name = self.discount_type_name
		account.company = self.company
		account.parent_account = self.parent_account
		account.account_type = "Expense Account"
		account.is_group = 0
		account.flags.ignore_permissions = True

		try:
			account.save()
			frappe.msgprint(_("Discount Account {0} created successfully").format(account.name))
		except Exception as e:
			frappe.throw(_("Failed to create discount account: {0}").format(str(e)))

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
