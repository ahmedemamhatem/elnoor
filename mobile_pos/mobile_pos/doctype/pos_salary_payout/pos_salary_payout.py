import frappe
import json
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, flt, get_last_day

# Month name to number mapping
MONTH_MAP = {
	"January": 1, "February": 2, "March": 3, "April": 4,
	"May": 5, "June": 6, "July": 7, "August": 8,
	"September": 9, "October": 10, "November": 11, "December": 12
}


class POSSalaryPayout(Document):
	def validate(self):
		self.set_payment_account()
		if self.docstatus == 0:
			self.calculate_absence_overtime()
			self.calculate_employee_salaries()
			self.populate_salary_details()
			self.calculate_totals()

	def calculate_absence_overtime(self):
		"""Calculate absence deductions and overtime bonuses based on leave days"""
		if self.docstatus != 0:
			return

		posting_date = getdate(self.posting_date)
		fiscal_year = posting_date.year if self.posting_date else None
		month_num = MONTH_MAP.get(self.salary_month)

		if month_num and month_num > posting_date.month:
			fiscal_year -= 1

		for row in self.employees:
			if not row.employee:
				continue

			employee = frappe.get_doc("POS Employee", row.employee)
			allowed_leave = employee.allowed_leave_days or 0
			fixed_salary = employee.fixed_salary or 0

			absent_days = self.get_employee_absent_days(
				row.employee, self.salary_month, fiscal_year
			)
			row.absent_days = absent_days
			row.allowed_leave_days = allowed_leave

			daily_rate = flt(fixed_salary) / 30 if fixed_salary else 0

			is_late_joiner = False
			if employee.date_of_joining and month_num:
				joining_date = getdate(employee.date_of_joining)
				first_day = getdate(f"{fiscal_year}-{month_num:02d}-01")
				last_day = get_last_day(first_day)
				if first_day <= joining_date <= last_day:
					if joining_date.day >= 5:
						is_late_joiner = True

			row.is_late_joiner = is_late_joiner

			if is_late_joiner:
				row.overtime_days = 0
				row.overtime_bonus = 0
				row.no_leaves_bonus = 0
				row.absence_deduction = flt(absent_days * daily_rate) if absent_days > 0 else 0
			else:
				day_difference = absent_days - allowed_leave

				if day_difference > 0:
					row.overtime_days = 0
					row.overtime_bonus = 0
					row.no_leaves_bonus = 0
					row.absence_deduction = flt(day_difference * daily_rate)
				elif day_difference < 0:
					row.overtime_days = abs(day_difference)
					row.overtime_bonus = flt(abs(day_difference) * daily_rate)
					row.absence_deduction = 0
					if absent_days == 0:
						row.no_leaves_bonus = flt(2 * daily_rate)
					else:
						row.no_leaves_bonus = 0
				else:
					row.overtime_days = 0
					row.overtime_bonus = 0
					row.no_leaves_bonus = 0
					row.absence_deduction = 0

	def get_employee_absent_days(self, employee, salary_month, fiscal_year):
		"""Get total absent days from POS Salary Adjustments with is_absent flag"""
		if not employee or not salary_month or not fiscal_year:
			return 0

		result = frappe.db.sql("""
			SELECT COALESCE(SUM(sa.days), 0) as total_days
			FROM `tabPOS Salary Adjustment` sa
			INNER JOIN `tabPOS Salary Adjustment Type` sat ON sat.name = sa.adjustment_type
			INNER JOIN `tabPOS Employee` me ON me.name = sa.employee
			WHERE sa.employee = %(employee)s
			AND sa.company = %(company)s
			AND sa.salary_month = %(salary_month)s
			AND YEAR(sa.posting_date) = %(fiscal_year)s
			AND sa.docstatus = 1
			AND sat.is_absent = 1
			AND (me.date_of_joining IS NULL OR sa.posting_date >= me.date_of_joining)
			AND (me.status != 'Left' OR me.exit_date IS NULL OR sa.posting_date <= me.exit_date)
		""", {
			"employee": employee,
			"company": self.company,
			"salary_month": salary_month,
			"fiscal_year": fiscal_year
		}, as_dict=True)

		return flt(result[0].total_days) if result else 0

	def set_payment_account(self):
		"""Set payment account from mode of payment"""
		if self.mode_of_payment:
			self.payment_account = get_payment_account(self.mode_of_payment, self.company)

	def calculate_employee_salaries(self):
		"""Calculate salary details for each employee"""
		posting_date = getdate(self.posting_date)
		month_num = MONTH_MAP.get(self.salary_month)
		fiscal_year = posting_date.year
		if month_num and month_num > posting_date.month:
			fiscal_year -= 1

		for row in self.employees:
			if not row.employee:
				continue

			employee = frappe.get_doc("POS Employee", row.employee)
			row.employee_name = employee.employee_name
			row.employee_type = employee.employee_type

			base_fixed_salary = employee.fixed_salary or 0
			prorated_salary = base_fixed_salary
			worked_days = None
			salary_remarks = ""

			if month_num:
				first_day = getdate(f"{fiscal_year}-{month_num:02d}-01")
				last_day = get_last_day(first_day)
				total_days_in_month = (last_day - first_day).days + 1

				if employee.date_of_joining:
					joining_date = getdate(employee.date_of_joining)
					if first_day <= joining_date <= last_day:
						if joining_date.day == 5:
							salary_remarks = "تعيين يوم 5 - الإجازات محسوبة"
						elif joining_date.day > 5:
							remaining_days = (last_day - joining_date).days + 1
							daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0
							prorated_salary = flt(daily_rate * remaining_days, 2)
							worked_days = remaining_days
							salary_remarks = f"تعيين بتاريخ {joining_date.strftime('%d-%m-%Y')} | أيام العمل: {remaining_days} من {total_days_in_month}"

				if employee.status == "Left" and employee.exit_date:
					exit_date = getdate(employee.exit_date)

					if first_day <= exit_date <= last_day:
						if employee.date_of_joining:
							joining_date = getdate(employee.date_of_joining)
							if first_day <= joining_date <= last_day and joining_date.day >= 5:
								start_date = joining_date
							else:
								start_date = first_day
						else:
							start_date = first_day

						worked_days = (exit_date - start_date).days + 1
						daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0
						prorated_salary = flt(daily_rate * worked_days, 2)

						if start_date != first_day:
							salary_remarks = f"تعيين {start_date.strftime('%d-%m-%Y')} | استقالة {exit_date.strftime('%d-%m-%Y')} | أيام العمل: {worked_days}"
						else:
							salary_remarks = f"استقالة بتاريخ {exit_date.strftime('%d-%m-%Y')} | أيام العمل: {worked_days} من {total_days_in_month}"
					elif exit_date < first_day:
						prorated_salary = 0
						worked_days = 0
						salary_remarks = f"استقال قبل بداية الشهر ({exit_date.strftime('%d-%m-%Y')})"

			row.fixed_salary = prorated_salary
			row.worked_days = worked_days
			row.salary_remarks = salary_remarks

			# Calculate additional earnings and deductions
			additional_earnings = 0
			additional_deductions = 0

			for salary_row in employee.additional_salaries:
				if salary_row.calculation_type == "Fixed Amount":
					value = salary_row.amount or 0
				else:
					value = (row.fixed_salary or 0) * (salary_row.percent or 0) / 100

				if salary_row.type == "Allowance":
					additional_earnings += value
				elif salary_row.type == "Deduction":
					additional_deductions += value

			# Get additional salary deductions from POS Salary Adjustments
			if self.salary_month and self.docstatus == 0:
				add_sal_deductions = get_additional_salary_deductions(
					row.employee,
					self.salary_month,
					self.company
				)
				additional_earnings -= flt(add_sal_deductions.get("total_allowance_deduction", 0))
				additional_deductions -= flt(add_sal_deductions.get("total_deduction_reduction", 0))

				penalty_deduction = get_penalty_daily_att_deduction(
					row.employee,
					self.salary_month,
					self.company
				)
				additional_deductions += flt(penalty_deduction.get("daily_att_deduction", 0))

				additional_earnings = max(0, additional_earnings)
				additional_deductions = max(0, additional_deductions)

			row.additional_earnings = additional_earnings
			row.additional_deductions = additional_deductions

			# Get salary adjustments
			if self.salary_month and self.docstatus == 0:
				salary_adjustments = get_employee_salary_adjustments(
					row.employee,
					self.salary_month,
					self.company
				)
				row.daily_additions = salary_adjustments.get("total_additions", 0)
				row.daily_deductions = salary_adjustments.get("total_deductions", 0)
			else:
				row.daily_additions = row.daily_additions or 0
				row.daily_deductions = row.daily_deductions or 0

			# Get loans
			if self.docstatus == 0:
				from mobile_pos.mobile_pos.doctype.pos_employee_loan.pos_employee_loan import (
					get_employee_outstanding_short_term_loans,
					get_employee_next_long_term_installment,
				)
				row.total_loan = get_employee_outstanding_short_term_loans(row.employee, self.company)
				long_term_data = get_employee_next_long_term_installment(row.employee, self.company)
				row.long_term_loan_installment = long_term_data.get("total", 0)
				row.employee_sales = get_employee_pending_sales(row.employee, self.salary_month, self.company)

			# over_salary and avg_protein default to 0 (no quality bonus in POS)
			row.over_salary = row.over_salary or 0
			row.avg_protein = row.avg_protein or 0

			# Calculate net salary
			total_earnings = (
				flt(row.fixed_salary or 0)
				+ flt(row.additional_earnings or 0)
				+ flt(row.over_salary or 0)
				+ flt(row.daily_additions or 0)
				+ flt(row.overtime_bonus or 0)
				+ flt(row.no_leaves_bonus or 0)
			)
			total_deductions = (
				flt(row.additional_deductions or 0)
				+ flt(row.daily_deductions or 0)
				+ flt(row.total_loan or 0)
				+ flt(row.long_term_loan_installment or 0)
				+ flt(row.employee_sales or 0)
				+ flt(row.absence_deduction or 0)
			)
			row.net_salary = max(0, total_earnings - total_deductions)

	def calculate_totals(self):
		"""Calculate total amounts"""
		self.total_fixed_salary = sum(flt(row.fixed_salary or 0) for row in self.employees)
		self.total_earnings = sum(flt(row.additional_earnings or 0) for row in self.employees)
		self.total_over_salary = sum(flt(row.over_salary or 0) for row in self.employees)
		self.total_daily_additions = sum(flt(row.daily_additions or 0) for row in self.employees)
		self.total_overtime_bonus = sum(flt(row.overtime_bonus or 0) for row in self.employees)
		self.total_no_leaves_bonus = sum(flt(row.no_leaves_bonus or 0) for row in self.employees)
		self.total_deductions = sum(flt(row.additional_deductions or 0) for row in self.employees)
		self.total_daily_deductions = sum(flt(row.daily_deductions or 0) for row in self.employees)
		self.total_loan_deduction = sum(flt(row.total_loan or 0) for row in self.employees)
		self.total_long_term_loan = sum(flt(row.long_term_loan_installment or 0) for row in self.employees)
		self.total_employee_sales = sum(flt(row.employee_sales or 0) for row in self.employees)
		self.total_absence_deduction = sum(flt(row.absence_deduction or 0) for row in self.employees)
		self.total_net_salary = sum(flt(row.net_salary or 0) for row in self.employees)

	def populate_salary_details(self):
		"""Populate detailed salary items for each employee as JSON"""
		if self.docstatus != 0:
			return

		for row in self.employees:
			if not row.employee:
				continue

			earnings_grouped = {}
			deductions_grouped = {}

			def add_item(item_type, item_name, category, amount):
				if amount <= 0:
					return
				if item_type == "Earning":
					if item_name in earnings_grouped:
						earnings_grouped[item_name]["amount"] += flt(amount)
					else:
						earnings_grouped[item_name] = {"category": category, "amount": flt(amount)}
				else:
					if item_name in deductions_grouped:
						deductions_grouped[item_name]["amount"] += flt(amount)
					else:
						deductions_grouped[item_name] = {"category": category, "amount": flt(amount)}

			employee = frappe.get_doc("POS Employee", row.employee)

			# 1. Fixed Salary
			if row.fixed_salary:
				if row.worked_days and row.worked_days > 0:
					salary_label = f"المرتب الأساسي ({row.worked_days} يوم)"
				else:
					salary_label = "المرتب الأساسي"
				add_item("Earning", salary_label, "Fixed Salary", row.fixed_salary)

			# 2. Additional Salaries
			add_sal_deductions = {}
			if self.salary_month:
				deductions_data = get_additional_salary_deductions(row.employee, self.salary_month, self.company)
				add_sal_deductions = deductions_data.get("deductions_by_type", {})

			for salary_row in employee.additional_salaries:
				if salary_row.calculation_type == "Fixed Amount":
					value = salary_row.amount or 0
				else:
					value = (row.fixed_salary or 0) * (salary_row.percent or 0) / 100

				deducted_amount = flt(add_sal_deductions.get(salary_row.salary_type, 0))
				final_value = max(0, value - deducted_amount)

				if final_value > 0:
					item_type = "Earning" if salary_row.type == "Allowance" else "Deduction"
					if deducted_amount > 0:
						label = f"{salary_row.salary_type} (بعد خصم {deducted_amount})"
					else:
						label = salary_row.salary_type
					add_item(item_type, label, "Additional Salary", final_value)

			# 3. Overtime Bonus
			if row.overtime_bonus:
				item_name = f"مكافأة الإضافي ({row.overtime_days} يوم) بدل إجازات أسبوعية"
				add_item("Earning", item_name, "Overtime", row.overtime_bonus)

			# 4. No Leaves Bonus
			if row.no_leaves_bonus:
				add_item("Earning", "مكافأة انتظام (بدون إجازات) - يومين", "No Leaves Bonus", row.no_leaves_bonus)

			# 5. Salary Adjustments
			if self.salary_month:
				adjustments = get_employee_salary_adjustments_detailed(
					row.employee,
					self.salary_month,
					self.company
				)
				for adj in adjustments:
					item_type = "Earning" if adj["type"] == "Addition" else "Deduction"
					item_name = adj["adjustment_type"]
					if adj.get("amount_type") == "Days" and adj.get("days"):
						item_name += f" ({adj['days']} يوم)"
					if adj.get("remarks"):
						item_name += f" - {adj['remarks']}"
					elif adj.get("type_description"):
						item_name += f" - {adj['type_description']}"
					add_item(item_type, item_name, "Salary Adjustment", adj["amount"])

			# 6. Penalty Deductions
			if self.salary_month:
				penalty_data = get_penalty_daily_att_deduction(row.employee, self.salary_month, self.company)
				if penalty_data.get("daily_att_deduction", 0) > 0:
					for detail in penalty_data.get("deductions_detail", []):
						if detail.get("is_half"):
							label = f"خصم جزاء - {detail.get('salary_type')} (نصف)"
						else:
							penalty_count = penalty_data.get("penalty_count", 0)
							label = f"خصم جزاء - {detail.get('salary_type')} (كامل - {penalty_count} جزاء)"
						add_item("Deduction", label, "Penalty Deduction", detail.get("deduction_amount", 0))

			# 7. Absence Deduction
			if row.absence_deduction:
				if getattr(row, 'is_late_joiner', False):
					add_item("Deduction", f"خصم غياب - موظف جديد ({row.absent_days or 0} يوم)", "Absence", row.absence_deduction)
				else:
					extra_days = (row.absent_days or 0) - (row.allowed_leave_days or 0)
					add_item("Deduction", f"خصم الغياب ({extra_days} يوم)", "Absence", row.absence_deduction)

			# 8. Short Term Loans
			if row.total_loan:
				add_item("Deduction", "سلفة قصيرة الأجل", "Loan", row.total_loan)

			# 9. Long Term Loan Installment
			if row.long_term_loan_installment:
				add_item("Deduction", "قسط سلفة طويلة الأجل", "Loan", row.long_term_loan_installment)

			# 10. Employee Sales/Purchases
			if row.employee_sales:
				add_item("Deduction", "مشتريات الموظف", "Employee Sales", row.employee_sales)

			# Convert to list
			details = []
			for item_name, data in earnings_grouped.items():
				details.append({
					"item_type": "Earning",
					"item_name": item_name,
					"category": data["category"],
					"amount": data["amount"]
				})
			for item_name, data in deductions_grouped.items():
				details.append({
					"item_type": "Deduction",
					"item_name": item_name,
					"category": data["category"],
					"amount": data["amount"]
				})

			row.salary_details_json = json.dumps(details, ensure_ascii=False)

	def on_submit(self):
		self.mark_loans_as_deducted()
		self.mark_long_term_installments_paid()
		self.mark_employee_sales_deducted()
		self.create_journal_entry()

	def on_cancel(self):
		self.unmark_loans_as_deducted()
		self.unmark_long_term_installments()
		self.unmark_employee_sales()
		self.cancel_journal_entry()

	def mark_loans_as_deducted(self):
		"""Mark all outstanding SHORT TERM loans as deducted"""
		deducted_loans = []

		for row in self.employees:
			if not row.employee:
				continue

			loans = frappe.get_all(
				"POS Employee Loan",
				filters={
					"employee": row.employee,
					"company": self.company,
					"docstatus": 1,
					"loan_type": "Short Term",
					"deducted": 0
				},
				pluck="name"
			)

			for loan_name in loans:
				frappe.db.set_value("POS Employee Loan", loan_name, "deducted", 1)
				deducted_loans.append(loan_name)

		self.db_set("deducted_loans", json.dumps(deducted_loans))

	def mark_long_term_installments_paid(self):
		"""Mark the next unpaid installment for each long term loan"""
		paid_installments = []

		for row in self.employees:
			if not row.employee or not row.long_term_loan_installment:
				continue

			loans = frappe.get_all(
				"POS Employee Loan",
				filters={
					"employee": row.employee,
					"company": self.company,
					"docstatus": 1,
					"loan_type": "Long Term",
					"fully_paid": 0
				},
				fields=["name"]
			)

			for loan in loans:
				loan_doc = frappe.get_doc("POS Employee Loan", loan.name)
				for schedule_row in loan_doc.repayment_schedule:
					if not schedule_row.paid:
						schedule_row.paid = 1
						schedule_row.paid_date = self.posting_date
						schedule_row.salary_payout = self.name

						paid_installments.append({
							"loan": loan.name,
							"installment_no": schedule_row.installment_no
						})
						break

				loan_doc.calculate_totals()

				if loan_doc.outstanding_amount <= 0:
					loan_doc.fully_paid = 1

				loan_doc.flags.ignore_validate_update_after_submit = True
				loan_doc.save(ignore_permissions=True)

		if paid_installments:
			existing = json.loads(self.deducted_loans or "[]")
			existing.append({"long_term_installments": paid_installments})
			self.db_set("deducted_loans", json.dumps(existing))

	def unmark_loans_as_deducted(self):
		"""Unmark loans when salary payout is cancelled"""
		if self.deducted_loans:
			try:
				deducted_data = json.loads(self.deducted_loans)
				for item in deducted_data:
					if isinstance(item, str):
						if frappe.db.exists("POS Employee Loan", item):
							frappe.db.set_value("POS Employee Loan", item, "deducted", 0)
			except json.JSONDecodeError:
				pass

	def unmark_long_term_installments(self):
		"""Unmark long term installments when salary payout is cancelled"""
		if not self.deducted_loans:
			return

		try:
			deducted_data = json.loads(self.deducted_loans)
			for item in deducted_data:
				if isinstance(item, dict) and "long_term_installments" in item:
					for inst in item["long_term_installments"]:
						loan_name = inst.get("loan")
						installment_no = inst.get("installment_no")
						if not frappe.db.exists("POS Employee Loan", loan_name):
							continue

						loan_doc = frappe.get_doc("POS Employee Loan", loan_name)

						for schedule_row in loan_doc.repayment_schedule:
							if schedule_row.installment_no == installment_no:
								schedule_row.paid = 0
								schedule_row.paid_date = None
								schedule_row.salary_payout = None
								break

						total_paid = sum(
							flt(r.amount)
							for r in loan_doc.repayment_schedule
							if r.paid
						)
						loan_doc.total_paid = total_paid
						loan_doc.outstanding_amount = flt(loan_doc.amount) - total_paid
						loan_doc.fully_paid = 0

						loan_doc.flags.ignore_validate_update_after_submit = True
						loan_doc.save(ignore_permissions=True)

						frappe.msgprint(
							_("تم إرجاع القسط رقم {0} من السلفة {1}").format(
								installment_no, loan_name
							)
						)
		except json.JSONDecodeError:
			pass

	def mark_employee_sales_deducted(self):
		"""Mark pending employee sales as deducted"""
		deducted_sales = []
		month_num = MONTH_MAP.get(self.salary_month, 0)

		for row in self.employees:
			if not row.employee or not row.employee_sales:
				continue

			if month_num:
				ledger_entries = frappe.db.sql("""
					SELECT name FROM `tabPOS Employee Sales Ledger`
					WHERE employee = %s
					AND company = %s
					AND status = 'Pending'
					AND deducted = 0
					AND MONTH(COALESCE(due_date, posting_date)) = %s
				""", (row.employee, self.company, month_num), as_dict=True)
				ledger_entries = [e.name for e in ledger_entries]
			else:
				ledger_entries = frappe.get_all(
					"POS Employee Sales Ledger",
					filters={
						"employee": row.employee,
						"company": self.company,
						"status": "Pending",
						"deducted": 0
					},
					pluck="name"
				)

			for entry_name in ledger_entries:
				frappe.db.set_value("POS Employee Sales Ledger", entry_name, {
					"deducted": 1,
					"status": "Deducted",
					"salary_payout": self.name
				})
				deducted_sales.append(entry_name)

		if deducted_sales:
			existing = json.loads(self.deducted_loans or "[]")
			existing.append({"employee_sales": deducted_sales})
			self.db_set("deducted_loans", json.dumps(existing))

	def unmark_employee_sales(self):
		"""Unmark employee sales when salary payout is cancelled"""
		if not self.deducted_loans:
			return

		try:
			deducted_data = json.loads(self.deducted_loans)
			for item in deducted_data:
				if isinstance(item, dict) and "employee_sales" in item:
					for entry_name in item["employee_sales"]:
						if frappe.db.exists("POS Employee Sales Ledger", entry_name):
							frappe.db.set_value("POS Employee Sales Ledger", entry_name, {
								"deducted": 0,
								"status": "Pending",
								"salary_payout": None
							})
		except json.JSONDecodeError:
			pass

	def create_journal_entry(self):
		"""Create journal entry on submit"""
		from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings

		settings = get_mobile_pos_settings(self.company)

		if not settings.employee_salary_account:
			frappe.throw(_("يرجى تحديد حساب مرتبات الموظفين في إعدادات نقطة البيع"))

		if not self.company:
			frappe.throw(_("يرجى تحديد الشركة"))

		if not self.payment_account:
			frappe.throw(_("حساب الدفع مطلوب"))

		if not self.total_net_salary:
			frappe.throw(_("إجمالي صافي المرتبات صفر. لا يمكن إنشاء قيد يومية."))

		je = frappe.new_doc("Journal Entry")
		je.voucher_type = "Journal Entry"
		je.posting_date = self.posting_date
		je.company = self.company
		je.user_remark = f"Salary Payout - {self.salary_month or ''} - {self.name}"

		actual_total_net_salary = 0

		for row in self.employees:
			if not row.employee:
				continue

			net_salary_rounded = flt(row.net_salary, 2)
			if net_salary_rounded <= 0:
				continue

			employee_cost_center = frappe.db.get_value("POS Employee", row.employee, "cost_center")
			actual_total_net_salary += net_salary_rounded

			je.append("accounts", {
				"account": settings.employee_salary_account,
				"debit_in_account_currency": net_salary_rounded,
				"credit_in_account_currency": 0,
				"party_type": "POS Employee",
				"party": row.employee,
				"cost_center": employee_cost_center,
				"user_remark": f"Salary for {row.employee_name}"
			})

		actual_total_net_salary = flt(actual_total_net_salary, 2)

		je.append("accounts", {
			"account": self.payment_account,
			"debit_in_account_currency": 0,
			"credit_in_account_currency": actual_total_net_salary,
			"user_remark": f"Salary Payout - {self.salary_month or ''}"
		})

		# Handle Long Term Loan transfers
		if self.total_long_term_loan > 0 and settings.employee_long_term_loan_account:
			for row in self.employees:
				if not row.employee:
					continue

				loan_installment_rounded = flt(row.long_term_loan_installment, 2)
				if loan_installment_rounded <= 0:
					continue

				employee_cost_center = frappe.db.get_value("POS Employee", row.employee, "cost_center")

				je.append("accounts", {
					"account": settings.employee_long_term_loan_account,
					"debit_in_account_currency": 0,
					"credit_in_account_currency": loan_installment_rounded,
					"party_type": "POS Employee",
					"party": row.employee,
					"cost_center": employee_cost_center,
					"user_remark": f"Long term loan installment - {row.employee_name}"
				})

				je.append("accounts", {
					"account": settings.employee_salary_account,
					"debit_in_account_currency": loan_installment_rounded,
					"credit_in_account_currency": 0,
					"party_type": "POS Employee",
					"party": row.employee,
					"cost_center": employee_cost_center,
					"user_remark": f"Long term loan installment - {row.employee_name}"
				})

		# Handle Employee Sales transfers
		purchases_account = settings.employee_purchases_account or settings.employee_long_term_loan_account
		if self.total_employee_sales > 0 and purchases_account:
			for row in self.employees:
				if not row.employee:
					continue

				employee_sales_rounded = flt(row.employee_sales, 2)
				if employee_sales_rounded <= 0:
					continue

				employee_cost_center = frappe.db.get_value("POS Employee", row.employee, "cost_center")

				je.append("accounts", {
					"account": purchases_account,
					"debit_in_account_currency": 0,
					"credit_in_account_currency": employee_sales_rounded,
					"party_type": "POS Employee",
					"party": row.employee,
					"cost_center": employee_cost_center,
					"user_remark": f"مشتريات موظف - {row.employee_name}"
				})

				je.append("accounts", {
					"account": settings.employee_salary_account,
					"debit_in_account_currency": employee_sales_rounded,
					"credit_in_account_currency": 0,
					"party_type": "POS Employee",
					"party": row.employee,
					"cost_center": employee_cost_center,
					"user_remark": f"مشتريات موظف - {row.employee_name}"
				})

		je.insert(ignore_permissions=True)
		je.submit()

		self.db_set("journal_entry", je.name)
		frappe.msgprint(_("تم إنشاء قيد اليومية {0}").format(je.name))

	def cancel_journal_entry(self):
		"""Cancel linked journal entry on cancel"""
		if self.journal_entry:
			je = frappe.get_doc("Journal Entry", self.journal_entry)
			if je.docstatus == 1:
				je.flags.ignore_permissions = True
				je.cancel()
				frappe.msgprint(_("تم إلغاء قيد اليومية {0}").format(self.journal_entry))


@frappe.whitelist()
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


def get_employee_pending_sales(employee, salary_month=None, company=None):
	"""Get total pending employee sales for an employee"""
	if salary_month:
		month_num = MONTH_MAP.get(salary_month, 0)

		if month_num:
			conditions = "WHERE employee = %s AND status = 'Pending' AND deducted = 0 AND MONTH(COALESCE(due_date, posting_date)) = %s"
			params = [employee, month_num]
			if company:
				conditions += " AND company = %s"
				params.append(company)

			total = frappe.db.sql("""
				SELECT COALESCE(SUM(amount), 0) as total
				FROM `tabPOS Employee Sales Ledger`
				{conditions}
			""".format(conditions=conditions), params, as_dict=True)
			return total[0].total if total else 0

	conditions = "WHERE employee = %s AND status = 'Pending' AND deducted = 0"
	params = [employee]
	if company:
		conditions += " AND company = %s"
		params.append(company)

	total = frappe.db.sql("""
		SELECT COALESCE(SUM(amount), 0) as total
		FROM `tabPOS Employee Sales Ledger`
		{conditions}
	""".format(conditions=conditions), params, as_dict=True)

	return total[0].total if total else 0


def get_employee_salary_adjustments(employee, salary_month, company=None):
	"""Get all submitted salary adjustments (excluding absence and additional salary types)"""
	company_condition = "AND sa.company = %(company)s" if company else ""
	adjustments = frappe.db.sql("""
		SELECT sa.type, sa.amount
		FROM `tabPOS Salary Adjustment` sa
		LEFT JOIN `tabPOS Salary Adjustment Type` sat ON sat.name = sa.adjustment_type
		INNER JOIN `tabPOS Employee` me ON me.name = sa.employee
		WHERE sa.employee = %(employee)s
		{company_condition}
		AND sa.salary_month = %(salary_month)s
		AND sa.docstatus = 1
		AND COALESCE(sat.is_absent, 0) = 0
		AND sa.amount_type != 'Additional Salary'
		AND (me.date_of_joining IS NULL OR sa.posting_date >= me.date_of_joining)
		AND (me.status != 'Left' OR me.exit_date IS NULL OR sa.posting_date <= me.exit_date)
	""".format(company_condition=company_condition), {
		"employee": employee,
		"company": company,
		"salary_month": salary_month
	}, as_dict=True)

	total_additions = 0
	total_deductions = 0

	for adj in adjustments:
		if adj.type == "Addition":
			total_additions += adj.amount or 0
		elif adj.type == "Deduction":
			total_deductions += adj.amount or 0

	return {
		"total_additions": total_additions,
		"total_deductions": total_deductions
	}


def get_employee_salary_adjustments_detailed(employee, salary_month, company=None):
	"""Get all submitted salary adjustments (detailed, excluding absence and additional salary)"""
	company_condition = "AND sa.company = %(company)s" if company else ""
	adjustments = frappe.db.sql("""
		SELECT
			sa.adjustment_type, sa.type, sa.amount,
			sa.amount_type, sa.days, sa.daily_rate,
			sa.posting_date, sa.remarks,
			sat.description as type_description
		FROM `tabPOS Salary Adjustment` sa
		LEFT JOIN `tabPOS Salary Adjustment Type` sat ON sat.name = sa.adjustment_type
		INNER JOIN `tabPOS Employee` me ON me.name = sa.employee
		WHERE sa.employee = %(employee)s
		{company_condition}
		AND sa.salary_month = %(salary_month)s
		AND sa.docstatus = 1
		AND COALESCE(sat.is_absent, 0) = 0
		AND sa.amount_type != 'Additional Salary'
		AND (me.date_of_joining IS NULL OR sa.posting_date >= me.date_of_joining)
		AND (me.status != 'Left' OR me.exit_date IS NULL OR sa.posting_date <= me.exit_date)
	""".format(company_condition=company_condition), {
		"employee": employee,
		"company": company,
		"salary_month": salary_month
	}, as_dict=True)

	return adjustments


def get_additional_salary_deductions(employee, salary_month, company=None):
	"""Get additional salary deductions from POS Salary Adjustments"""
	company_condition = "AND sa.company = %(company)s" if company else ""
	adjustments = frappe.db.sql("""
		SELECT sa.additional_salary_type, sa.amount
		FROM `tabPOS Salary Adjustment` sa
		INNER JOIN `tabPOS Additional Salary Type` ast ON ast.name = sa.additional_salary_type
		INNER JOIN `tabPOS Employee` me ON me.name = sa.employee
		WHERE sa.employee = %(employee)s
		{company_condition}
		AND sa.salary_month = %(salary_month)s
		AND sa.docstatus = 1
		AND sa.amount_type = 'Additional Salary'
		AND (me.date_of_joining IS NULL OR sa.posting_date >= me.date_of_joining)
		AND (me.status != 'Left' OR me.exit_date IS NULL OR sa.posting_date <= me.exit_date)
	""".format(company_condition=company_condition), {
		"employee": employee,
		"company": company,
		"salary_month": salary_month
	}, as_dict=True)

	deductions_by_type = {}
	total_allowance_deduction = 0
	total_deduction_reduction = 0

	for adj in adjustments:
		salary_type = adj.additional_salary_type
		amount = flt(adj.amount or 0)

		if salary_type in deductions_by_type:
			deductions_by_type[salary_type] += amount
		else:
			deductions_by_type[salary_type] = amount

		ast_type = frappe.db.get_value("POS Additional Salary Type", salary_type, "type")
		if ast_type == "Allowance":
			total_allowance_deduction += amount
		else:
			total_deduction_reduction += amount

	return {
		"deductions_by_type": deductions_by_type,
		"total_allowance_deduction": total_allowance_deduction,
		"total_deduction_reduction": total_deduction_reduction
	}


def get_penalty_daily_att_deduction(employee, salary_month, company=None):
	"""Calculate deduction based on penalty adjustments and daily_att additional salaries"""
	company_condition = "AND sa.company = %(company)s" if company else ""
	penalty_count = frappe.db.sql("""
		SELECT COUNT(*) as count
		FROM `tabPOS Salary Adjustment` sa
		INNER JOIN `tabPOS Salary Adjustment Type` sat ON sat.name = sa.adjustment_type
		INNER JOIN `tabPOS Employee` me ON me.name = sa.employee
		WHERE sa.employee = %(employee)s
		{company_condition}
		AND sa.salary_month = %(salary_month)s
		AND sa.docstatus = 1
		AND sat.deduct = 1
		AND (me.date_of_joining IS NULL OR sa.posting_date >= me.date_of_joining)
	""".format(company_condition=company_condition), {
		"employee": employee,
		"company": company,
		"salary_month": salary_month
	}, as_dict=True)[0].count or 0

	if penalty_count == 0:
		return {
			"penalty_count": 0,
			"daily_att_deduction": 0,
			"deductions_detail": []
		}

	employee_doc = frappe.get_doc("POS Employee", employee)
	fixed_salary = flt(employee_doc.fixed_salary or 0)

	deductions_detail = []
	total_deduction = 0

	for salary_row in employee_doc.additional_salaries:
		daily_att = frappe.db.get_value("POS Additional Salary Type", salary_row.salary_type, "daily_attt")

		is_daily_att_deduction = (
			daily_att == "Deduction" or
			daily_att == 1 or
			daily_att == "1" or
			(daily_att and str(daily_att).lower() not in ("0", "allowance", "false", ""))
		)

		if is_daily_att_deduction:
			if salary_row.calculation_type == "Fixed Amount":
				value = flt(salary_row.amount or 0)
			else:
				value = fixed_salary * flt(salary_row.percent or 0) / 100

			if penalty_count == 1:
				deduction_amount = flt(value / 2, 2)
				is_half = True
			else:
				deduction_amount = value
				is_half = False

			if deduction_amount > 0:
				deductions_detail.append({
					"salary_type": salary_row.salary_type,
					"original_amount": value,
					"deduction_amount": deduction_amount,
					"is_half": is_half
				})
				total_deduction += deduction_amount

	return {
		"penalty_count": penalty_count,
		"daily_att_deduction": total_deduction,
		"deductions_detail": deductions_detail
	}


@frappe.whitelist()
def load_active_employees(salary_month=None, company=None):
	"""Load employees eligible for salary payout"""
	from frappe.utils import nowdate

	current_date = getdate(nowdate())
	current_year = current_date.year

	month_num = None
	year = current_year
	if salary_month:
		month_num = MONTH_MAP.get(salary_month)
		if month_num and month_num > current_date.month:
			year -= 1

	if salary_month and month_num:
		first_day_of_month = f"{year}-{month_num:02d}-01"
		company_condition = "AND company = %(company)s" if company else ""
		employees = frappe.db.sql("""
			SELECT
				name, employee_name, employee_type,
				fixed_salary, allowed_leave_days, status, exit_date,
				date_of_joining
			FROM `tabPOS Employee`
			WHERE (
				status IN ('Active', 'Inactive')
				OR (
					status = 'Left'
					AND exit_date IS NOT NULL
					AND exit_date >= %(first_day)s
				)
			)
			{company_condition}
			ORDER BY employee_name
		""".format(company_condition=company_condition), {
			"first_day": first_day_of_month,
			"company": company
		}, as_dict=True)
	else:
		filters = {"status": "Active"}
		if company:
			filters["company"] = company

		employees = frappe.get_all(
			"POS Employee",
			filters=filters,
			fields=[
				"name", "employee_name", "employee_type",
				"fixed_salary", "allowed_leave_days", "status", "exit_date",
				"date_of_joining"
			],
			order_by="employee_name"
		)

	result = []
	for emp in employees:
		employee_doc = frappe.get_doc("POS Employee", emp.name)

		additional_earnings = 0
		additional_deductions = 0

		for salary_row in employee_doc.additional_salaries:
			if salary_row.calculation_type == "Fixed Amount":
				value = salary_row.amount or 0
			else:
				value = (emp.fixed_salary or 0) * (salary_row.percent or 0) / 100

			if salary_row.type == "Allowance":
				additional_earnings += value
			elif salary_row.type == "Deduction":
				additional_deductions += value

		if salary_month:
			add_sal_deductions = get_additional_salary_deductions(emp.name, salary_month, company)
			additional_earnings -= flt(add_sal_deductions.get("total_allowance_deduction", 0))
			additional_deductions -= flt(add_sal_deductions.get("total_deduction_reduction", 0))

			penalty_deduction = get_penalty_daily_att_deduction(emp.name, salary_month, company)
			additional_deductions += flt(penalty_deduction.get("daily_att_deduction", 0))

			additional_earnings = max(0, additional_earnings)
			additional_deductions = max(0, additional_deductions)

		from mobile_pos.mobile_pos.doctype.pos_employee_loan.pos_employee_loan import (
			get_employee_outstanding_short_term_loans,
			get_employee_next_long_term_installment,
		)
		total_loan = get_employee_outstanding_short_term_loans(emp.name, company)
		long_term_data = get_employee_next_long_term_installment(emp.name, company)
		long_term_loan_installment = long_term_data.get("total", 0)

		employee_sales = get_employee_pending_sales(emp.name, salary_month, company)

		daily_additions = 0
		daily_deductions = 0
		if salary_month:
			salary_adj = get_employee_salary_adjustments(emp.name, salary_month, company)
			daily_additions = salary_adj.get("total_additions", 0)
			daily_deductions = salary_adj.get("total_deductions", 0)

		allowed_leave_days = emp.allowed_leave_days or 0

		absent_days = get_employee_absent_days_from_adjustments(
			emp.name, salary_month, year, company
		)

		# Calculate prorated salary
		base_fixed_salary = emp.fixed_salary or 0
		prorated_salary = base_fixed_salary
		worked_days = None
		salary_remarks = ""
		is_late_joiner = False

		if month_num:
			first_day = getdate(f"{year}-{month_num:02d}-01")
			last_day = get_last_day(first_day)
			total_days_in_month = (last_day - first_day).days + 1

			if emp.date_of_joining:
				joining_date = getdate(emp.date_of_joining)
				if first_day <= joining_date <= last_day:
					if joining_date.day == 5:
						is_late_joiner = True
						salary_remarks = "تعيين يوم 5 - الإجازات محسوبة"
					elif joining_date.day > 5:
						is_late_joiner = True
						remaining_days = (last_day - joining_date).days + 1
						daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0
						prorated_salary = flt(daily_rate * remaining_days, 2)
						worked_days = remaining_days
						salary_remarks = f"تعيين بتاريخ {joining_date.strftime('%d-%m-%Y')} | أيام العمل: {remaining_days} من {total_days_in_month}"

			if emp.get("status") == "Left" and emp.get("exit_date"):
				exit_date = getdate(emp.exit_date)

				if first_day <= exit_date <= last_day:
					if emp.date_of_joining:
						joining_date = getdate(emp.date_of_joining)
						if first_day <= joining_date <= last_day and joining_date.day >= 5:
							start_date = joining_date
							is_late_joiner = True
						else:
							start_date = first_day
					else:
						start_date = first_day

					worked_days = (exit_date - start_date).days + 1
					daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0
					prorated_salary = flt(daily_rate * worked_days, 2)

					if start_date != first_day:
						salary_remarks = f"تعيين {start_date.strftime('%d-%m-%Y')} | استقالة {exit_date.strftime('%d-%m-%Y')} | أيام العمل: {worked_days}"
					else:
						salary_remarks = f"استقالة بتاريخ {exit_date.strftime('%d-%m-%Y')} | أيام العمل: {worked_days} من {total_days_in_month}"
				elif exit_date < first_day:
					prorated_salary = 0
					worked_days = 0
					salary_remarks = f"استقال قبل بداية الشهر ({exit_date.strftime('%d-%m-%Y')})"

		daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0

		no_leaves_bonus = 0
		if is_late_joiner:
			overtime_days = 0
			overtime_bonus = 0
			absence_deduction = flt(absent_days * daily_rate) if absent_days > 0 else 0
		else:
			day_difference = absent_days - allowed_leave_days

			if day_difference > 0:
				overtime_days = 0
				overtime_bonus = 0
				absence_deduction = flt(day_difference * daily_rate)
			elif day_difference < 0:
				overtime_days = abs(day_difference)
				overtime_bonus = flt(abs(day_difference) * daily_rate)
				absence_deduction = 0
				if absent_days == 0:
					no_leaves_bonus = flt(2 * daily_rate)
			else:
				overtime_days = 0
				overtime_bonus = 0
				absence_deduction = 0

		total_emp_earnings = (
			flt(prorated_salary)
			+ additional_earnings
			+ daily_additions
			+ overtime_bonus
			+ no_leaves_bonus
		)
		total_emp_deductions = (
			additional_deductions
			+ daily_deductions
			+ total_loan
			+ long_term_loan_installment
			+ employee_sales
			+ absence_deduction
		)
		net_salary = max(0, total_emp_earnings - total_emp_deductions)

		result.append({
			"employee": emp.name,
			"employee_name": emp.employee_name,
			"employee_type": emp.employee_type,
			"fixed_salary": prorated_salary,
			"worked_days": worked_days,
			"salary_remarks": salary_remarks,
			"additional_earnings": additional_earnings,
			"additional_deductions": additional_deductions,
			"over_salary": 0,
			"daily_additions": daily_additions,
			"daily_deductions": daily_deductions,
			"total_loan": total_loan,
			"long_term_loan_installment": long_term_loan_installment,
			"employee_sales": employee_sales,
			"avg_protein": 0,
			"allowed_leave_days": allowed_leave_days,
			"absent_days": absent_days,
			"overtime_days": overtime_days,
			"overtime_bonus": overtime_bonus,
			"no_leaves_bonus": no_leaves_bonus,
			"absence_deduction": absence_deduction,
			"net_salary": net_salary
		})

	return result


def get_employee_absent_days_from_adjustments(employee, salary_month, fiscal_year, company=None):
	"""Get total absent days from POS Salary Adjustments with is_absent flag"""
	if not employee or not salary_month or not fiscal_year:
		return 0

	company_condition = "AND sa.company = %(company)s" if company else ""
	result = frappe.db.sql("""
		SELECT COALESCE(SUM(sa.days), 0) as total_days
		FROM `tabPOS Salary Adjustment` sa
		INNER JOIN `tabPOS Salary Adjustment Type` sat ON sat.name = sa.adjustment_type
		INNER JOIN `tabPOS Employee` me ON me.name = sa.employee
		WHERE sa.employee = %(employee)s
		{company_condition}
		AND sa.salary_month = %(salary_month)s
		AND YEAR(sa.posting_date) = %(fiscal_year)s
		AND sa.docstatus = 1
		AND sat.is_absent = 1
		AND (me.date_of_joining IS NULL OR sa.posting_date >= me.date_of_joining)
		AND (me.status != 'Left' OR me.exit_date IS NULL OR sa.posting_date <= me.exit_date)
	""".format(company_condition=company_condition), {
		"employee": employee,
		"company": company,
		"salary_month": salary_month,
		"fiscal_year": fiscal_year
	}, as_dict=True)

	return flt(result[0].total_days) if result else 0
