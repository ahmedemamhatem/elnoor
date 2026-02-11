# Copyright (c) 2026, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_months, getdate, flt


class POSEmployeeLoan(Document):
	def validate(self):
		self.set_payment_account()
		self.validate_loan_amount()
		self.calculate_installment()
		self.generate_repayment_schedule()
		self.calculate_totals()

	def set_payment_account(self):
		"""Set payment account from mode of payment"""
		if self.mode_of_payment:
			self.payment_account = get_payment_account(self.mode_of_payment, self.company)

	def validate_loan_amount(self):
		"""Validate loan amount based on loan type"""
		if self.loan_type == "Short Term":
			if self.amount and self.fixed_salary:
				monthly_amount = flt(self.amount)
				if monthly_amount >= flt(self.fixed_salary):
					frappe.throw(
						_("مبلغ السلفة القصيرة الأجل ({0}) يجب أن يكون أقل من المرتب الثابت للموظف ({1})").format(
							frappe.format_value(monthly_amount, {"fieldtype": "Currency"}),
							frappe.format_value(self.fixed_salary, {"fieldtype": "Currency"})
						),
						title=_("خطأ في مبلغ السلفة")
					)
		elif self.loan_type == "Long Term":
			if not self.repayment_months or self.repayment_months < 1:
				frappe.throw(_("يجب تحديد عدد أشهر السداد للسلفة طويلة الأجل"))

			if self.amount and self.repayment_months and self.fixed_salary:
				monthly_installment = flt(self.amount) / flt(self.repayment_months)
				if monthly_installment >= flt(self.fixed_salary):
					frappe.throw(
						_("القسط الشهري ({0}) يجب أن يكون أقل من المرتب الثابت للموظف ({1})").format(
							frappe.format_value(monthly_installment, {"fieldtype": "Currency"}),
							frappe.format_value(self.fixed_salary, {"fieldtype": "Currency"})
						),
						title=_("خطأ في قسط السلفة الطويلة")
					)

	def calculate_installment(self):
		"""Calculate monthly installment for long term loans"""
		if self.loan_type == "Long Term" and self.amount and self.repayment_months:
			self.installment_amount = flt(self.amount) / flt(self.repayment_months)
		else:
			self.installment_amount = 0

	def generate_repayment_schedule(self):
		"""Generate repayment schedule for long term loans"""
		if self.loan_type != "Long Term":
			self.repayment_schedule = []
			return

		if not self.amount or not self.repayment_months or not self.first_repayment_date:
			return

		self.repayment_schedule = []

		installment = flt(self.amount) / flt(self.repayment_months)
		remaining = flt(self.amount)

		start_date = getdate(self.first_repayment_date)

		for i in range(1, self.repayment_months + 1):
			if i == self.repayment_months:
				amount = remaining
			else:
				amount = round(installment, 2)
				remaining -= amount

			due_date = add_months(start_date, i - 1)

			self.append("repayment_schedule", {
				"installment_no": i,
				"due_date": due_date,
				"amount": amount,
				"paid": 0
			})

	def calculate_totals(self):
		"""Calculate total paid and outstanding for long term loans"""
		if self.loan_type == "Long Term":
			self.total_paid = sum(
				flt(row.amount) for row in self.repayment_schedule if row.paid
			)
			self.outstanding_amount = flt(self.amount) - flt(self.total_paid)
		else:
			self.total_paid = 0
			self.outstanding_amount = 0

	def on_submit(self):
		self.create_journal_entry()

	def on_cancel(self):
		self.validate_cancel()
		self.reset_deducted()
		self.cancel_journal_entry()

	def validate_cancel(self):
		"""Validate that loan can be cancelled"""
		if self.loan_type == "Long Term":
			paid_installments = [row for row in self.repayment_schedule if row.paid]
			if paid_installments:
				frappe.throw(
					_("لا يمكن إلغاء السلفة لأنه تم سداد {0} قسط/أقساط").format(len(paid_installments))
				)

	def reset_deducted(self):
		"""Reset deducted flag when loan is cancelled"""
		if self.deducted:
			self.db_set("deducted", 0)

	def create_journal_entry(self):
		"""Create journal entry on submit
		Short Term:
			Debit: Employee Salary Account (from Mobile POS Settings) - with POS Employee party
			Credit: Mode of Payment Account
		Long Term:
			Debit: Long Term Loan Account (from Mobile POS Settings) - with POS Employee party
			Credit: Mode of Payment Account
		"""
		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings

		settings = get_mobile_pos_settings(self.company)

		if not self.company:
			frappe.throw(_("Please set Company"))

		if not self.payment_account:
			frappe.throw(_("Payment Account is required"))

		if self.loan_type == "Short Term":
			if not settings.employee_salary_account:
				frappe.throw(_("Please set Employee Salary Account in Mobile POS Settings"))
			debit_account = settings.employee_salary_account
		else:
			if not settings.employee_long_term_loan_account:
				frappe.throw(_("Please set Employee Long Term Loan Account in Mobile POS Settings"))
			debit_account = settings.employee_long_term_loan_account

		employee_cost_center = frappe.db.get_value("POS Employee", self.employee, "cost_center")

		je = frappe.new_doc("Journal Entry")
		je.voucher_type = "Journal Entry"
		je.posting_date = self.posting_date
		je.company = self.company
		je.user_remark = f"Employee Loan ({self.loan_type}) - {self.employee_name} - {self.name}"
		je.custom_pos_employee_loan = self.name

		je.append("accounts", {
			"account": debit_account,
			"debit_in_account_currency": self.amount,
			"credit_in_account_currency": 0,
			"party_type": "POS Employee",
			"party": self.employee,
			"cost_center": employee_cost_center,
			"user_remark": f"Loan to {self.employee_name} ({self.loan_type})"
		})

		je.append("accounts", {
			"account": self.payment_account,
			"debit_in_account_currency": 0,
			"credit_in_account_currency": self.amount,
			"user_remark": f"Loan to {self.employee_name}"
		})

		je.insert(ignore_permissions=True)
		je.submit()

		self.db_set("journal_entry", je.name)
		frappe.msgprint(_("Journal Entry {0} created").format(je.name))

	def cancel_journal_entry(self):
		"""Cancel linked journal entry on cancel"""
		if self.journal_entry:
			je = frappe.get_doc("Journal Entry", self.journal_entry)
			if je.docstatus == 1:
				je.flags.ignore_permissions = True
				je.cancel()
				frappe.msgprint(_("Journal Entry {0} cancelled").format(self.journal_entry))

	def mark_installment_paid(self, installment_no, paid_date=None):
		"""Mark a specific installment as paid"""
		for row in self.repayment_schedule:
			if row.installment_no == installment_no and not row.paid:
				row.paid = 1
				row.paid_date = paid_date or frappe.utils.nowdate()
				break

		self.calculate_totals()

		if self.outstanding_amount <= 0:
			self.fully_paid = 1

		self.save(ignore_permissions=True)


def get_payment_account(mode_of_payment, company=None):
	"""Get default account for mode of payment"""
	if not company:
		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
		settings = get_mobile_pos_settings(company)
		company = settings.company

	account = frappe.db.get_value(
		"Mode of Payment Account",
		{"parent": mode_of_payment, "company": company},
		"default_account"
	)
	return account


def get_employee_outstanding_short_term_loans(employee, company=None):
	"""Get total outstanding SHORT TERM loans for an employee"""
	conditions = "WHERE employee = %(employee)s AND docstatus = 1 AND loan_type = 'Short Term' AND deducted = 0"
	params = {"employee": employee}

	if company:
		conditions += " AND company = %(company)s"
		params["company"] = company

	total = frappe.db.sql("""
		SELECT COALESCE(SUM(amount), 0) as total
		FROM `tabPOS Employee Loan`
		{conditions}
	""".format(conditions=conditions), params, as_dict=True)

	return total[0].total if total else 0


def get_employee_next_long_term_installment(employee, company=None):
	"""Get the next unpaid installment for long term loans for an employee"""
	filters = {
		"employee": employee,
		"docstatus": 1,
		"loan_type": "Long Term",
		"fully_paid": 0
	}
	if company:
		filters["company"] = company

	loans = frappe.get_all(
		"POS Employee Loan",
		filters=filters,
		fields=["name"]
	)

	total_installment = 0
	installment_details = []

	for loan in loans:
		loan_doc = frappe.get_doc("POS Employee Loan", loan.name)
		for row in loan_doc.repayment_schedule:
			if not row.paid:
				total_installment += flt(row.amount)
				installment_details.append({
					"loan": loan.name,
					"installment_no": row.installment_no,
					"amount": row.amount,
					"due_date": row.due_date
				})
				break

	return {
		"total": total_installment,
		"details": installment_details
	}


@frappe.whitelist()
def get_employee_all_outstanding_loans(employee, company=None):
	"""Get all outstanding loans (short term + next long term installment)"""
	short_term = get_employee_outstanding_short_term_loans(employee, company)
	long_term_data = get_employee_next_long_term_installment(employee, company)

	return {
		"short_term": short_term,
		"long_term_installment": long_term_data["total"],
		"long_term_details": long_term_data["details"],
		"total": short_term + long_term_data["total"]
	}
