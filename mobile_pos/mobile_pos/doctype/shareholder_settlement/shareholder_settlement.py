# Copyright (c) 2025, Anthropic and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class ShareholderSettlement(Document):
	def validate(self):
		self.validate_dates()
		self.calculate_totals()

	def validate_dates(self):
		if getdate(self.from_date) > getdate(self.to_date):
			frappe.throw(_("From Date cannot be after To Date"))

	def calculate_totals(self):
		"""Calculate totals from share ledger entries"""
		self.total_revenue = sum(flt(row.net_amount) for row in self.share_ledger_entries if flt(row.net_amount) > 0)
		self.total_expenses = sum(abs(flt(row.net_amount)) for row in self.share_ledger_entries if flt(row.net_amount) < 0)
		self.net_profit = self.total_revenue - self.total_expenses
		self.share_amount = sum(flt(row.share_amount) for row in self.share_ledger_entries)

		# Get average percentage
		if self.share_ledger_entries:
			self.percentage = sum(flt(row.percentage) for row in self.share_ledger_entries) / len(self.share_ledger_entries)

	def before_submit(self):
		if not self.share_ledger_entries:
			frappe.throw(_("Please fetch Share Ledger entries before submitting"))
		if flt(self.share_amount) == 0:
			frappe.throw(_("Share amount is zero. Nothing to settle."))

	def on_submit(self):
		self.mark_share_ledgers_as_settled()
		self.create_accrual_journal_entry()
		self.db_set("status", "Submitted")

	def before_cancel(self):
		"""Clear Share Ledger references before cancel to avoid linked document error"""
		self.unmark_share_ledgers()

	def on_cancel(self):
		self.cancel_journal_entries()
		self.db_set("status", "Cancelled")

	def mark_share_ledgers_as_settled(self):
		"""Mark all included Share Ledger entries as settled"""
		for row in self.share_ledger_entries:
			frappe.db.set_value("Share Ledger", row.share_ledger, {
				"is_settled": 1,
				"settlement_reference": self.name,
				"settlement_date": self.posting_date
			})

	def unmark_share_ledgers(self):
		"""Unmark Share Ledger entries on cancellation"""
		frappe.db.sql("""
			UPDATE `tabShare Ledger`
			SET is_settled = 0, settlement_reference = NULL, settlement_date = NULL
			WHERE settlement_reference = %s
		""", self.name)

	def create_accrual_journal_entry(self):
		"""Create Journal Entry for accrual of shareholder payable"""
		if flt(self.share_amount) <= 0:
			return

		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
		settings = get_mobile_pos_settings(self.company)
		if not settings.profit_sharing_expense_account:
			frappe.throw(_("Please set Profit Sharing Expense Account in Mobile POS Settings for company {0}").format(self.company))

		# Get shareholder's payable account
		payable_account = frappe.db.get_value("Shareholder", self.shareholder, "payable_account")
		if not payable_account:
			frappe.throw(_("Shareholder {0} does not have a Payable Account").format(self.shareholder))

		accounts = [
			{
				"account": settings.profit_sharing_expense_account,
				"debit_in_account_currency": flt(self.share_amount),
				"debit": flt(self.share_amount),
				"cost_center": frappe.get_cached_value("Company", self.company, "cost_center")
			},
			{
				"account": payable_account,
				"party_type": "Shareholder",
				"party": self.shareholder,
				"credit_in_account_currency": flt(self.share_amount),
				"credit": flt(self.share_amount),
				"user_remark": _("Shareholder Settlement: {0}").format(self.shareholder_name)
			}
		]

		je = frappe.get_doc({
			"doctype": "Journal Entry",
			"voucher_type": "Journal Entry",
			"posting_date": self.posting_date,
			"company": self.company,
			"user_remark": _("Shareholder Settlement: {0} - {1}").format(self.name, self.shareholder_name),
			"accounts": accounts
		})
		je.insert(ignore_permissions=True)
		je.submit()

		self.db_set("accrual_journal_entry", je.name)

	def cancel_journal_entries(self):
		"""Cancel journal entries"""
		for field in ["accrual_journal_entry", "payment_journal_entry"]:
			je_name = self.get(field)
			if je_name:
				je = frappe.get_doc("Journal Entry", je_name)
				if je.docstatus == 1:
					je.cancel()

	@frappe.whitelist()
	def fetch_share_ledger_entries(self):
		"""Fetch unsettled Share Ledger entries for this shareholder"""
		filters = {
			"shareholder": self.shareholder,
			"company": self.company,
			"posting_date": ["between", [self.from_date, self.to_date]],
			"is_settled": 0,
			"docstatus": 1
		}

		if self.mini_pos_profile:
			filters["mini_pos_profile"] = self.mini_pos_profile

		share_ledgers = frappe.get_all("Share Ledger",
			filters=filters,
			fields=["name", "posting_date", "mini_pos_profile", "transaction_type",
					"voucher_type", "voucher_no", "net_amount", "percentage", "share_amount",
					"revenue_amount", "expense_amount"],
			order_by="posting_date asc"
		)

		self.share_ledger_entries = []
		total_revenue = 0
		total_expenses = 0
		total_share = 0
		total_percentage = 0

		for sl in share_ledgers:
			self.append("share_ledger_entries", {
				"share_ledger": sl.name,
				"posting_date": sl.posting_date,
				"mini_pos_profile": sl.mini_pos_profile,
				"transaction_type": sl.transaction_type,
				"voucher_type": sl.voucher_type,
				"voucher_no": sl.voucher_no,
				"net_amount": sl.net_amount,
				"percentage": sl.percentage,
				"share_amount": sl.share_amount
			})
			total_revenue += flt(sl.revenue_amount)
			total_expenses += flt(sl.expense_amount)
			total_share += flt(sl.share_amount)
			total_percentage += flt(sl.percentage)

		self.total_revenue = total_revenue
		self.total_expenses = total_expenses
		self.net_profit = total_revenue - total_expenses
		self.share_amount = total_share
		self.percentage = total_percentage / len(share_ledgers) if share_ledgers else 0

		self.save()
		return True

	@frappe.whitelist()
	def make_payment(self, mode_of_payment=None, payment_account=None, use_advance=0):
		"""Make payment to shareholder with optional advance allocation"""
		if self.docstatus != 1:
			frappe.throw(_("Settlement must be submitted before making payment"))

		if self.status == "Paid":
			frappe.throw(_("This settlement has already been paid"))

		share_amount = flt(self.share_amount)
		if share_amount <= 0:
			frappe.throw(_("Share amount must be greater than 0"))

		# Get shareholder's payable account and advance balance
		sh_doc = frappe.get_doc("Shareholder", self.shareholder)
		payable_account = sh_doc.payable_account
		if not payable_account:
			frappe.throw(_("Shareholder {0} does not have a Payable Account").format(self.shareholder))

		# Calculate advance allocation
		advance_balance = flt(sh_doc.advance_balance)
		advance_amount = 0
		cash_amount = share_amount

		if use_advance and advance_balance > 0:
			advance_amount = min(advance_balance, share_amount)
			cash_amount = share_amount - advance_amount

		# Create payment Journal Entry only if there's cash payment needed
		je_name = None
		if cash_amount > 0:
			if not payment_account:
				frappe.throw(_("Payment account is required for cash payment"))

			accounts = [
				{
					"account": payable_account,
					"party_type": "Shareholder",
					"party": self.shareholder,
					"debit_in_account_currency": cash_amount,
					"debit": cash_amount,
					"user_remark": _("Payment to {0}").format(self.shareholder_name)
				},
				{
					"account": payment_account,
					"credit_in_account_currency": cash_amount,
					"credit": cash_amount,
					"user_remark": _("Payment to {0}").format(self.shareholder_name)
				}
			]

			je = frappe.get_doc({
				"doctype": "Journal Entry",
				"voucher_type": "Journal Entry",
				"posting_date": frappe.utils.today(),
				"company": self.company,
				"user_remark": _("Shareholder Payment - {0} - {1}").format(self.name, self.shareholder_name),
				"accounts": accounts
			})
			je.insert(ignore_permissions=True)
			je.submit()
			je_name = je.name
			self.db_set("payment_journal_entry", je.name)

		# Deduct advance balance if used
		if advance_amount > 0:
			new_advance_balance = advance_balance - advance_amount
			frappe.db.set_value("Shareholder", self.shareholder, "advance_balance", new_advance_balance)
			self.db_set("advance_used", advance_amount)

		self.db_set("status", "Paid")

		return je_name or _("Payment completed using advance balance")


@frappe.whitelist()
def get_unsettled_summary(shareholder, from_date, to_date, mini_pos_profile=None, company=None):
	"""Get summary of unsettled Share Ledger entries for a shareholder"""
	filters = {
		"shareholder": shareholder,
		"posting_date": ["between", [from_date, to_date]],
		"is_settled": 0,
		"docstatus": 1
	}

	if company:
		filters["company"] = company

	if mini_pos_profile:
		filters["mini_pos_profile"] = mini_pos_profile

	share_ledgers = frappe.get_all("Share Ledger",
		filters=filters,
		fields=["net_amount", "share_amount", "percentage"]
	)

	total_revenue = sum(flt(sl.net_amount) for sl in share_ledgers if flt(sl.net_amount) > 0)
	total_expenses = sum(abs(flt(sl.net_amount)) for sl in share_ledgers if flt(sl.net_amount) < 0)
	net_profit = total_revenue - total_expenses
	share_amount = sum(flt(sl.share_amount) for sl in share_ledgers)
	avg_percentage = sum(flt(sl.percentage) for sl in share_ledgers) / len(share_ledgers) if share_ledgers else 0

	return {
		"entry_count": len(share_ledgers),
		"total_revenue": total_revenue,
		"total_expenses": total_expenses,
		"net_profit": net_profit,
		"percentage": avg_percentage,
		"share_amount": share_amount
	}
