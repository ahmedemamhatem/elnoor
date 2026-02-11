# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, nowdate


class ExpenseEntry(Document):
	def validate(self):
		"""Validate the expense entry before saving"""
		if not self.posting_date:
			self.posting_date = nowdate()

		# Fetch expense account if not set
		if self.expense and not self.expense_account:
			self.expense_account = frappe.db.get_value("Expense", self.expense, "expense_account")

		# Fetch payment account from mode of payment
		if self.mode_of_payment and self.company and not self.payment_account:
			self.payment_account = self.get_payment_account()

	def get_payment_account(self):
		"""Get the default account for the mode of payment and company"""
		account = frappe.db.get_value(
			"Mode of Payment Account",
			{"parent": self.mode_of_payment, "company": self.company},
			"default_account"
		)

		if not account:
			frappe.throw(
				_("Default account not found for Mode of Payment {0} and Company {1}").format(
					frappe.bold(self.mode_of_payment),
					frappe.bold(self.company)
				)
			)

		return account

	def on_submit(self):
		"""Create Journal Entry on submit"""
		self.create_journal_entry()

	def on_cancel(self):
		"""Cancel and delete the linked Journal Entry"""
		if self.journal_entry:
			je = frappe.get_doc("Journal Entry", self.journal_entry)
			if je.docstatus == 1:
				je.cancel()
			# Delete the cancelled journal entry
			frappe.delete_doc("Journal Entry", self.journal_entry, force=1)
			frappe.msgprint(_("Journal Entry {0} cancelled and deleted").format(self.journal_entry))

	def create_journal_entry(self):
		"""Create a Journal Entry for the expense"""
		if self.journal_entry:
			frappe.throw(_("Journal Entry already created: {0}").format(self.journal_entry))

		# Create Journal Entry
		je = frappe.new_doc("Journal Entry")
		je.voucher_type = "Journal Entry"
		je.posting_date = self.posting_date
		je.company = self.company
		je.user_remark = _("Expense Entry: {0}").format(self.name)

		# Add debit entry for expense account
		je.append("accounts", {
			"account": self.expense_account,
			"debit_in_account_currency": flt(self.amount),
			"credit_in_account_currency": 0,
			"cost_center": self.cost_center,
			"project": self.project,
			"mini_pos_profile": self.mini_pos_profile,
			"user_remark": _("Against Expense Entry: {0}").format(self.name)
		})

		# Add credit entry for payment account (mode of payment)
		je.append("accounts", {
			"account": self.payment_account,
			"debit_in_account_currency": 0,
			"credit_in_account_currency": flt(self.amount),
			"cost_center": self.cost_center,
			"project": self.project,
			"user_remark": _("Against Expense Entry: {0}").format(self.name)
		})

		# Save and submit the Journal Entry
		je.flags.ignore_permissions = True
		je.save()
		je.submit()

		# Update the expense entry with the journal entry reference
		self.db_set("journal_entry", je.name)

		frappe.msgprint(_("Journal Entry {0} created successfully").format(je.name))
