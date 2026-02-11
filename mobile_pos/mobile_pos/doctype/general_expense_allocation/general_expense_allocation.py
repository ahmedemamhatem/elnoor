# Copyright (c) 2025, Anthropic and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class GeneralExpenseAllocation(Document):
	def validate(self):
		self.validate_dates()
		# Only validate allocation_items on submit, not on save
		if self.docstatus == 1 and not self.allocation_items:
			frappe.throw(_("يرجى جلب المصروفات وحساب التوزيع أولاً"))

	def before_submit(self):
		if not self.allocation_items:
			frappe.throw(_("يرجى جلب المصروفات وحساب التوزيع أولاً"))

	def validate_dates(self):
		if getdate(self.from_date) > getdate(self.to_date):
			frappe.throw(_("From Date cannot be after To Date"))

	def on_submit(self):
		self.create_share_ledger_entries()
		self.db_set("status", "Submitted")

	def on_cancel(self):
		self.cancel_share_ledger_entries()
		self.db_set("status", "Cancelled")

	@frappe.whitelist()
	def fetch_expenses_and_calculate(self):
		"""Fetch general expenses and calculate allocation based on sales percentage"""
		# Get general expenses (expense entries without mini_pos_profile)
		expenses = frappe.get_all("Expense Entry",
			filters={
				"docstatus": 1,
				"company": self.company,
				"posting_date": ["between", [self.from_date, self.to_date]],
				"mini_pos_profile": ["is", "not set"]
			},
			fields=["name", "posting_date", "expense", "amount", "remarks"]
		)

		total_expenses = sum(flt(e.amount) for e in expenses)
		self.total_general_expenses = total_expenses

		if total_expenses == 0:
			frappe.msgprint(_("No general expenses found in this period"))
			return False

		# Get sales per POS profile in the same period
		sales_data = frappe.db.sql("""
			SELECT
				mp.name as mini_pos_profile,
				mp.full_name as pos_profile_name,
				COALESCE(SUM(si.grand_total), 0) as total_sales
			FROM `tabMini POS Profile` mp
			LEFT JOIN `tabSales Invoice` si ON si.custom_mini_pos_profile = mp.name
				AND si.docstatus = 1
				AND si.posting_date BETWEEN %s AND %s
				AND si.company = %s
			WHERE mp.company = %s
				AND mp.disabled = 0
			GROUP BY mp.name
			HAVING total_sales > 0
			ORDER BY total_sales DESC
		""", (self.from_date, self.to_date, self.company, self.company), as_dict=1)

		if not sales_data:
			frappe.msgprint(_("No sales found for any POS profile in this period"))
			return False

		total_sales = sum(flt(s.total_sales) for s in sales_data)
		self.total_sales_amount = total_sales

		# Calculate allocation for each POS profile
		self.allocation_items = []
		total_allocated = 0

		for sale in sales_data:
			sales_percentage = (flt(sale.total_sales) / total_sales * 100) if total_sales else 0
			allocated_amount = flt(total_expenses * sales_percentage / 100, 2)

			# Get shareholder count for this POS profile
			shareholder_count = frappe.db.count("Mini POS Shareholder", {
				"parent": sale.mini_pos_profile,
				"is_active": 1
			})

			self.append("allocation_items", {
				"mini_pos_profile": sale.mini_pos_profile,
				"pos_profile_name": sale.pos_profile_name,
				"total_sales": sale.total_sales,
				"sales_percentage": sales_percentage,
				"allocated_amount": allocated_amount,
				"shareholder_count": shareholder_count,
				"share_ledger_created": 0
			})

			total_allocated += allocated_amount

		self.total_allocated = total_allocated
		self.allocation_difference = flt(total_expenses - total_allocated, 2)

		self.save()
		return True

	def create_share_ledger_entries(self):
		"""Create Share Ledger entries for each POS profile's shareholders"""
		for item in self.allocation_items:
			if item.share_ledger_created:
				continue

			# Get shareholders for this POS profile
			shareholders = frappe.get_all("Mini POS Shareholder",
				filters={
					"parent": item.mini_pos_profile,
					"is_active": 1
				},
				fields=["shareholder", "percentage"]
			)

			if not shareholders:
				continue

			for sh in shareholders:
				# Calculate shareholder's portion of the expense
				share_amount = flt(item.allocated_amount * flt(sh.percentage) / 100, 2)

				if share_amount <= 0:
					continue

				# Get shareholder name
				shareholder_name = frappe.db.get_value("Shareholder", sh.shareholder, "shareholder_name")

				# Create Share Ledger entry as general expense
				share_ledger = frappe.get_doc({
					"doctype": "Share Ledger",
					"posting_date": self.posting_date,
					"shareholder": sh.shareholder,
					"shareholder_name": shareholder_name,
					"mini_pos_profile": item.mini_pos_profile,
					"company": self.company,
					"transaction_type": "General Expense",
					"voucher_type": "General Expense Allocation",
					"voucher_no": self.name,
					"expense_amount": item.allocated_amount,
					"net_amount": -item.allocated_amount,  # Negative for expense
					"percentage": sh.percentage,
					"share_amount": -share_amount,  # Negative share for expense
					"is_settled": 0
				})
				share_ledger.insert(ignore_permissions=True)
				share_ledger.submit()

			# Mark as created
			frappe.db.set_value("General Expense Allocation Item", item.name, "share_ledger_created", 1)

		frappe.msgprint(_("Share Ledger entries created for general expenses"))

	def cancel_share_ledger_entries(self):
		"""Cancel all Share Ledger entries linked to this allocation"""
		share_ledgers = frappe.get_all("Share Ledger",
			filters={
				"voucher_type": "General Expense Allocation",
				"voucher_no": self.name,
				"docstatus": 1
			}
		)

		for sl in share_ledgers:
			doc = frappe.get_doc("Share Ledger", sl.name)
			doc.cancel()

		# Reset flags
		for item in self.allocation_items:
			frappe.db.set_value("General Expense Allocation Item", item.name, "share_ledger_created", 0)


@frappe.whitelist()
def get_general_expenses_preview(company, from_date, to_date):
	"""Get preview of general expenses for display"""
	expenses = frappe.get_all("Expense Entry",
		filters={
			"docstatus": 1,
			"company": company,
			"posting_date": ["between", [from_date, to_date]],
			"mini_pos_profile": ["is", "not set"]
		},
		fields=["name", "posting_date", "expense", "amount", "remarks"],
		order_by="posting_date desc"
	)

	return {
		"expenses": expenses,
		"total": sum(flt(e.amount) for e in expenses)
	}
