# Copyright (c) 2025, Anthropic and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class ShareLedger(Document):
	def validate(self):
		self.calculate_net_amount()
		self.calculate_share_amount()
		self.validate_shareholder_in_profile()

	def calculate_net_amount(self):
		"""Calculate net amount = revenue - expense"""
		self.net_amount = flt(self.revenue_amount) - flt(self.expense_amount)

	def calculate_share_amount(self):
		"""Calculate share amount based on percentage"""
		if not self.percentage:
			# Get percentage from Mini POS Shareholder if not set
			if self.mini_pos_profile and self.shareholder:
				percentage = frappe.db.get_value(
					"Mini POS Shareholder",
					{"parent": self.mini_pos_profile, "shareholder": self.shareholder, "is_active": 1},
					"percentage"
				)
				self.percentage = flt(percentage)

		# Calculate share amount from net amount
		self.share_amount = flt(self.net_amount) * flt(self.percentage) / 100

	def validate_shareholder_in_profile(self):
		"""Validate that shareholder is assigned to the POS profile"""
		if self.mini_pos_profile and self.shareholder:
			exists = frappe.db.exists("Mini POS Shareholder", {
				"parent": self.mini_pos_profile,
				"shareholder": self.shareholder
			})
			if not exists:
				frappe.throw(_("Shareholder {0} is not assigned to POS Profile {1}").format(
					self.shareholder, self.mini_pos_profile
				))

	def on_submit(self):
		"""Update shareholder totals on submit"""
		self.update_shareholder_totals()

	def on_cancel(self):
		"""Clear settlement reference on cancel and update totals"""
		if self.settlement_reference:
			frappe.throw(_("Cannot cancel Share Ledger that is already settled. Cancel the settlement first."))
		self.update_shareholder_totals()

	def update_shareholder_totals(self):
		"""Update shareholder totals"""
		if self.shareholder:
			try:
				from mobile_pos.mobile_pos.doctype.shareholder.shareholder import update_shareholder_totals
				update_shareholder_totals(self.shareholder)
			except Exception:
				pass


def create_share_ledger_from_sales_invoice(doc, method=None):
	"""Create Share Ledger entries from Sales Invoice on submit - one per shareholder"""
	if not doc.custom_mini_pos_profile:
		return

	# Check if Mini POS Profile has profit sharing enabled
	profile = frappe.get_doc("Mini POS Profile", doc.custom_mini_pos_profile)
	if not profile.enable_profit_sharing:
		return

	# Get active shareholders for this profile
	shareholders = frappe.get_all(
		"Mini POS Shareholder",
		filters={"parent": doc.custom_mini_pos_profile, "is_active": 1},
		fields=["shareholder", "percentage"]
	)

	if not shareholders:
		return

	# Check if Share Ledger already exists for this voucher
	existing = frappe.db.exists("Share Ledger", {
		"voucher_type": "Sales Invoice",
		"voucher_no": doc.name,
		"docstatus": 1
	})
	if existing:
		return

	# Calculate revenue as margin: (selling_total) - (cost_total) for all items
	# rate is per Sales UOM, incoming_rate is per Stock UOM, so we must use
	# (rate * qty) for selling total and (incoming_rate * stock_qty) for cost total
	if doc.is_return:
		transaction_type = "Sales Return"
		# For returns, margin is an expense (profit lost)
		total_margin = sum(
			(flt(item.rate) * abs(flt(item.qty))) - (flt(item.incoming_rate) * abs(flt(item.stock_qty)))
			for item in doc.items
		)
		revenue_amount = 0
		expense_amount = total_margin
	else:
		transaction_type = "Sales"
		# For normal sales, margin is revenue
		total_margin = sum(
			(flt(item.rate) * flt(item.qty)) - (flt(item.incoming_rate) * flt(item.stock_qty))
			for item in doc.items
		)
		revenue_amount = total_margin
		expense_amount = 0

	# Create Share Ledger entry for each shareholder
	for sh in shareholders:
		share_ledger = frappe.get_doc({
			"doctype": "Share Ledger",
			"mini_pos_profile": doc.custom_mini_pos_profile,
			"shareholder": sh.shareholder,
			"company": doc.company,
			"posting_date": doc.posting_date,
			"transaction_type": transaction_type,
			"voucher_type": "Sales Invoice",
			"voucher_no": doc.name,
			"revenue_amount": revenue_amount,
			"expense_amount": expense_amount,
			"percentage": sh.percentage,
			"remarks": _("Auto-created from {0}").format(doc.name)
		})
		share_ledger.insert(ignore_permissions=True)
		share_ledger.submit()


def cancel_share_ledger_from_sales_invoice(doc, method=None):
	"""Cancel Share Ledger entries when Sales Invoice is cancelled"""
	if not doc.custom_mini_pos_profile:
		return

	# Find and cancel related Share Ledger entries
	share_ledgers = frappe.get_all("Share Ledger", filters={
		"voucher_type": "Sales Invoice",
		"voucher_no": doc.name,
		"company": doc.company,
		"docstatus": 1
	})

	for sl in share_ledgers:
		share_ledger = frappe.get_doc("Share Ledger", sl.name)
		if not share_ledger.is_settled:
			share_ledger.cancel()


def create_share_ledger_from_journal_entry(doc, method=None):
	"""Create Share Ledger entries from Journal Entry for expense accounts on submit"""
	# Get expense parent account from Mobile POS Settings for this company
	from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
	settings = get_mobile_pos_settings(doc.company)
	if not settings.default_parent_account_for_expense:
		return

	expense_parent = settings.default_parent_account_for_expense

	# Check each account in journal entry
	for account_row in doc.accounts:
		if not account_row.mini_pos_profile:
			continue

		# Check if this is an expense account (under expense parent)
		if not is_expense_account(account_row.account, expense_parent):
			continue

		# Check if Mini POS Profile has profit sharing enabled
		profile = frappe.get_doc("Mini POS Profile", account_row.mini_pos_profile)
		if not profile.enable_profit_sharing:
			continue

		# Get active shareholders for this profile
		shareholders = frappe.get_all(
			"Mini POS Shareholder",
			filters={"parent": account_row.mini_pos_profile, "is_active": 1},
			fields=["shareholder", "percentage"]
		)

		if not shareholders:
			continue

		# Check if Share Ledger already exists for this voucher and profile
		existing = frappe.db.exists("Share Ledger", {
			"voucher_type": "Journal Entry",
			"voucher_no": doc.name,
			"mini_pos_profile": account_row.mini_pos_profile,
			"docstatus": 1
		})
		if existing:
			continue

		# Expense is debit amount
		expense_amount = flt(account_row.debit)
		if expense_amount <= 0:
			continue

		# Create Share Ledger entry for each shareholder
		for sh in shareholders:
			share_ledger = frappe.get_doc({
				"doctype": "Share Ledger",
				"mini_pos_profile": account_row.mini_pos_profile,
				"shareholder": sh.shareholder,
				"company": doc.company,
				"posting_date": doc.posting_date,
				"transaction_type": "Expense",
				"voucher_type": "Journal Entry",
				"voucher_no": doc.name,
				"revenue_amount": 0,
				"expense_amount": expense_amount,
				"percentage": sh.percentage,
				"remarks": _("Auto-created from {0} - {1}").format(doc.name, account_row.account)
			})
			share_ledger.insert(ignore_permissions=True)
			share_ledger.submit()


def cancel_share_ledger_from_journal_entry(doc, method=None):
	"""Cancel Share Ledger entries when Journal Entry is cancelled"""
	# Find and cancel related Share Ledger entries
	share_ledgers = frappe.get_all("Share Ledger", filters={
		"voucher_type": "Journal Entry",
		"voucher_no": doc.name,
		"company": doc.company,
		"docstatus": 1
	})

	for sl in share_ledgers:
		share_ledger = frappe.get_doc("Share Ledger", sl.name)
		if not share_ledger.is_settled:
			share_ledger.cancel()


def is_expense_account(account, parent_account):
	"""Check if account is under the expense parent account"""
	if not account or not parent_account:
		return False

	# Get lft and rgt of parent account
	parent = frappe.db.get_value("Account", parent_account, ["lft", "rgt"], as_dict=True)
	if not parent:
		return False

	# Get lft of the account
	acc = frappe.db.get_value("Account", account, ["lft", "rgt"], as_dict=True)
	if not acc:
		return False

	# Check if account is descendant of parent
	return acc.lft >= parent.lft and acc.rgt <= parent.rgt
