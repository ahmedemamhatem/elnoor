# Copyright (c) 2025, Anthropic and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class Shareholder(Document):
	def before_insert(self):
		"""Auto-create payable account for new shareholder"""
		if not self.payable_account:
			self.create_payable_account()

	def validate(self):
		self.validate_payable_account()
		self.validate_percentage()

	def create_payable_account(self):
		"""Create a payable account for this shareholder under the parent account"""
		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
		settings = get_mobile_pos_settings(self.company)

		if not settings.parent_shareholder_payable_account:
			frappe.throw(_("Please set Parent Shareholder Payable Account in Mobile POS Settings for company {0} first").format(self.company))

		# Get parent account details
		parent_account = frappe.get_doc("Account", settings.parent_shareholder_payable_account)

		# Use shareholder name for account name
		account_name = self.shareholder_name

		# Check if account already exists
		existing_account = frappe.db.exists("Account", {
			"account_name": account_name,
			"parent_account": settings.parent_shareholder_payable_account,
			"company": self.company
		})

		if existing_account:
			self.payable_account = existing_account
			return

		# Create new account
		new_account = frappe.get_doc({
			"doctype": "Account",
			"account_name": account_name,
			"parent_account": settings.parent_shareholder_payable_account,
			"company": self.company,
			"account_type": "Payable",
			"root_type": parent_account.root_type,
			"is_group": 0,
			"account_currency": frappe.get_cached_value("Company", self.company, "default_currency")
		})
		new_account.insert(ignore_permissions=True)
		self.payable_account = new_account.name
		frappe.msgprint(_("Payable Account '{0}' created successfully").format(new_account.name), alert=True)

	def validate_payable_account(self):
		"""Validate payable account is of type Payable"""
		if self.payable_account:
			account_type = frappe.db.get_value("Account", self.payable_account, "account_type")
			if account_type != "Payable":
				frappe.throw(_("Payable Account must be of type 'Payable'. Selected account is of type '{0}'").format(account_type))

	def validate_percentage(self):
		"""Validate default percentage is between 0 and 100"""
		if self.default_percentage:
			percentage = flt(self.default_percentage)
			if percentage < 0 or percentage > 100:
				frappe.throw(_("Default Percentage must be between 0 and 100"))

	def on_update(self):
		self.update_totals()

	def update_totals(self):
		"""Update total share amounts from Share Ledger"""
		# Get all share ledger entries for this shareholder filtered by company
		share_data = frappe.db.sql("""
			SELECT
				SUM(CASE WHEN is_settled = 0 THEN share_amount ELSE 0 END) as pending,
				SUM(CASE WHEN is_settled = 1 THEN share_amount ELSE 0 END) as settled,
				SUM(share_amount) as total
			FROM `tabShare Ledger`
			WHERE shareholder = %s AND company = %s AND docstatus = 1
		""", (self.name, self.company), as_dict=1)

		if share_data:
			row = share_data[0]
			frappe.db.set_value("Shareholder", self.name, {
				"total_share_amount": flt(row.get("total", 0)),
				"total_settled_amount": flt(row.get("settled", 0)),
				"total_pending_amount": flt(row.get("pending", 0))
			}, update_modified=False)


@frappe.whitelist()
def get_shareholder_pos_profiles(shareholder):
	"""Get all POS profiles where this shareholder is assigned"""
	profiles = frappe.db.sql("""
		SELECT
			p.name as pos_profile,
			p.full_name as pos_profile_name,
			s.percentage,
			s.is_active
		FROM `tabMini POS Shareholder` s
		INNER JOIN `tabMini POS Profile` p ON p.name = s.parent
		WHERE s.shareholder = %s
		ORDER BY p.full_name
	""", shareholder, as_dict=1)

	return profiles


@frappe.whitelist()
def get_shareholder_summary(shareholder, from_date=None, to_date=None, company=None):
	"""Get summary of shareholder earnings"""
	conditions = ["sl.shareholder = %s", "sl.docstatus = 1"]
	params = [shareholder]

	if company:
		conditions.append("sl.company = %s")
		params.append(company)

	if from_date:
		conditions.append("sl.posting_date >= %s")
		params.append(from_date)

	if to_date:
		conditions.append("sl.posting_date <= %s")
		params.append(to_date)

	summary = frappe.db.sql("""
		SELECT
			sl.mini_pos_profile,
			p.full_name as pos_profile_name,
			SUM(sl.revenue_amount) as total_revenue,
			SUM(sl.expense_amount) as total_expense,
			SUM(sl.net_amount) as net_profit,
			SUM(sl.share_amount) as share_amount,
			SUM(CASE WHEN sl.is_settled = 1 THEN sl.share_amount ELSE 0 END) as settled_amount,
			SUM(CASE WHEN sl.is_settled = 0 THEN sl.share_amount ELSE 0 END) as pending_amount,
			COUNT(*) as transaction_count
		FROM `tabShare Ledger` sl
		LEFT JOIN `tabMini POS Profile` p ON p.name = sl.mini_pos_profile
		WHERE {conditions}
		GROUP BY sl.mini_pos_profile
		ORDER BY share_amount DESC
	""".format(conditions=" AND ".join(conditions)), params, as_dict=1)

	return summary


@frappe.whitelist()
def update_shareholder_totals(shareholder=None, company=None):
	"""Update totals for shareholder(s)"""
	if shareholder:
		shareholders = [shareholder]
	else:
		filters = {}
		if company:
			filters["company"] = company
		shareholders = frappe.get_all("Shareholder", filters=filters, pluck="name")

	for sh in shareholders:
		doc = frappe.get_doc("Shareholder", sh)
		doc.update_totals()

	return {"message": _("Totals updated successfully")}


@frappe.whitelist()
def make_advance_payment(shareholder, amount, mode_of_payment, payment_account,
						reference_no=None, remarks=None):
	"""Make an advance payment to shareholder before settlement"""
	amount = flt(amount)
	if amount <= 0:
		frappe.throw(_("Amount must be greater than 0"))

	# Get shareholder details
	sh_doc = frappe.get_doc("Shareholder", shareholder)
	if not sh_doc.payable_account:
		frappe.throw(_("Shareholder {0} does not have a Payable Account").format(shareholder))

	# Build user remark
	user_remark = _("Advance Payment to Shareholder: {0}").format(sh_doc.shareholder_name)
	if remarks:
		user_remark += "\n" + remarks

	# Create Journal Entry
	accounts = [
		{
			"account": sh_doc.payable_account,
			"party_type": "Shareholder",
			"party": shareholder,
			"debit_in_account_currency": amount,
			"debit": amount,
			"user_remark": user_remark
		},
		{
			"account": payment_account,
			"credit_in_account_currency": amount,
			"credit": amount,
			"user_remark": user_remark
		}
	]

	je = frappe.get_doc({
		"doctype": "Journal Entry",
		"voucher_type": "Journal Entry",
		"posting_date": frappe.utils.today(),
		"company": sh_doc.company,
		"user_remark": user_remark,
		"cheque_no": reference_no,
		"cheque_date": frappe.utils.today() if reference_no else None,
		"accounts": accounts
	})
	je.insert(ignore_permissions=True)
	je.submit()

	# Update advance balance on shareholder
	current_advance = flt(sh_doc.advance_balance)
	frappe.db.set_value("Shareholder", shareholder, "advance_balance", current_advance + amount)

	return je.name
