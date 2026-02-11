# Copyright (c) 2026, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate, get_last_day


MONTH_MAP = {
	"January": 1, "February": 2, "March": 3, "April": 4,
	"May": 5, "June": 6, "July": 7, "August": 8,
	"September": 9, "October": 10, "November": 11, "December": 12
}


def execute(filters=None):
	if not filters:
		filters = {}

	validate_filters(filters)
	columns = get_columns()
	data = get_data(filters)

	return columns, data


def validate_filters(filters):
	if not filters.get("company"):
		frappe.throw(_("يرجى اختيار الشركة"))
	if not filters.get("salary_month"):
		frappe.throw(_("يرجى اختيار شهر المرتب"))
	if not filters.get("fiscal_year"):
		frappe.throw(_("يرجى اختيار السنة"))


def get_columns():
	return [
		{"fieldname": "employee_name", "label": _("الموظف"), "fieldtype": "Data", "width": 200},
		{"fieldname": "item_name", "label": _("البند"), "fieldtype": "Data", "width": 300},
		{"fieldname": "type", "label": _("النوع"), "fieldtype": "Data", "width": 120},
		{"fieldname": "days", "label": _("الأيام"), "fieldtype": "Float", "width": 80, "precision": 1},
		{"fieldname": "amount", "label": _("المبلغ"), "fieldtype": "Currency", "width": 150},
		{"fieldname": "remarks", "label": _("ملاحظات"), "fieldtype": "Data", "width": 200},
		{"fieldname": "reference", "label": _("المرجع"), "fieldtype": "Data", "width": 150},
	]


def get_data(filters):
	salary_month = filters.get("salary_month")
	company = filters.get("company")
	# Handle month name with Arabic suffix
	if " - " in salary_month:
		salary_month = salary_month.split(" - ")[0].strip()

	fiscal_year = int(filters.get("fiscal_year"))
	employee_filter = filters.get("employee")

	month_num = MONTH_MAP.get(salary_month)
	if not month_num:
		frappe.throw(_("شهر غير صالح: {0}").format(salary_month))

	first_day = getdate(f"{fiscal_year}-{month_num:02d}-01")
	last_day = get_last_day(first_day)

	# Get employees
	if employee_filter:
		emp_filters = {"name": employee_filter, "company": company}
	else:
		# Include Left employees who left during or after this month
		employees_active = frappe.get_all(
			"POS Employee",
			filters={"status": ["in", ["Active", "Inactive"]], "company": company},
			fields=["name", "employee_name", "employee_type", "fixed_salary",
					"allowed_leave_days", "date_of_joining", "exit_date", "status"],
			order_by="employee_name"
		)
		employees_left = frappe.get_all(
			"POS Employee",
			filters={
				"status": "Left",
				"exit_date": [">=", first_day],
				"company": company
			},
			fields=["name", "employee_name", "employee_type", "fixed_salary",
					"allowed_leave_days", "date_of_joining", "exit_date", "status"],
			order_by="employee_name"
		)
		employees = employees_active + employees_left

		if employee_filter:
			employees = [e for e in employees if e.name == employee_filter]

		data = []
		grand_total_earnings = 0
		grand_total_deductions = 0

		for emp in employees:
			emp_data, emp_total_earnings, emp_total_deductions = get_employee_salary_data(
				emp, salary_month, fiscal_year, month_num, first_day, last_day, company
			)
			data.extend(emp_data)
			grand_total_earnings += emp_total_earnings
			grand_total_deductions += emp_total_deductions

		# Grand total row
		if len(employees) > 1:
			grand_net = grand_total_earnings - grand_total_deductions
			data.append({
				"employee_name": "الإجمالي العام",
				"item_name": "",
				"type": "",
				"amount": grand_net,
				"is_grand_total": 1
			})

		return data

	emp_filters = {"name": employee_filter, "company": company} if employee_filter else {"status": ["in", ["Active", "Inactive"]], "company": company}
	employees = frappe.get_all(
		"POS Employee",
		filters=emp_filters,
		fields=["name", "employee_name", "employee_type", "fixed_salary",
				"allowed_leave_days", "date_of_joining", "exit_date", "status"],
		order_by="employee_name"
	)

	data = []
	grand_total_earnings = 0
	grand_total_deductions = 0

	for emp in employees:
		emp_data, emp_total_earnings, emp_total_deductions = get_employee_salary_data(
			emp, salary_month, fiscal_year, month_num, first_day, last_day, company
		)
		data.extend(emp_data)
		grand_total_earnings += emp_total_earnings
		grand_total_deductions += emp_total_deductions

	if len(employees) > 1:
		grand_net = grand_total_earnings - grand_total_deductions
		data.append({
			"employee_name": "الإجمالي العام",
			"item_name": "",
			"type": "",
			"amount": grand_net,
			"is_grand_total": 1
		})

	return data


def get_employee_salary_data(emp, salary_month, fiscal_year, month_num, first_day, last_day, company=None):
	"""Get salary breakdown for a single employee"""
	data = []
	total_earnings = 0
	total_deductions = 0

	employee_doc = frappe.get_doc("POS Employee", emp.name)

	# Header row
	data.append({
		"employee_name": emp.employee_name,
		"item_name": emp.employee_type or "",
		"type": "",
		"amount": None,
		"is_employee_header": 1
	})

	# Calculate prorated salary
	base_fixed_salary = emp.fixed_salary or 0
	prorated_salary = base_fixed_salary
	worked_days = None
	is_late_joiner = False
	total_days_in_month = (last_day - first_day).days + 1

	if emp.date_of_joining:
		joining_date = getdate(emp.date_of_joining)
		if first_day <= joining_date <= last_day:
			if joining_date.day >= 5:
				is_late_joiner = True
			if joining_date.day > 5:
				remaining_days = (last_day - joining_date).days + 1
				daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0
				prorated_salary = flt(daily_rate * remaining_days, 2)
				worked_days = remaining_days

	if emp.status == "Left" and emp.exit_date:
		exit_date = getdate(emp.exit_date)
		if first_day <= exit_date <= last_day:
			if emp.date_of_joining:
				joining_date = getdate(emp.date_of_joining)
				if first_day <= joining_date <= last_day and joining_date.day >= 5:
					start_date = joining_date
				else:
					start_date = first_day
			else:
				start_date = first_day
			worked_days = (exit_date - start_date).days + 1
			daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0
			prorated_salary = flt(daily_rate * worked_days, 2)

	# 1. Fixed Salary
	if prorated_salary:
		remarks = ""
		if worked_days:
			remarks = f"{worked_days} يوم من {total_days_in_month}"
		data.append({
			"employee_name": "",
			"item_name": "المرتب الأساسي",
			"type": "إضافة",
			"days": worked_days,
			"amount": prorated_salary,
			"remarks": remarks,
			"is_earning": 1
		})
		total_earnings += prorated_salary

	# 2. Additional Salaries (Allowances)
	for salary_row in employee_doc.additional_salaries:
		if salary_row.calculation_type == "Fixed Amount":
			value = flt(salary_row.amount or 0)
		else:
			value = flt(prorated_salary) * flt(salary_row.percent or 0) / 100

		if value > 0:
			if salary_row.type == "Allowance":
				data.append({
					"employee_name": "",
					"item_name": salary_row.salary_type,
					"type": "إضافة",
					"amount": value,
					"is_earning": 1
				})
				total_earnings += value
			else:
				data.append({
					"employee_name": "",
					"item_name": salary_row.salary_type,
					"type": "خصم",
					"amount": value,
					"is_deduction": 1
				})
				total_deductions += value

	# 3. Salary Adjustments (non-absence, non-additional-salary)
	company_condition = "AND sa.company = %(company)s" if company else ""
	adjustments = frappe.db.sql("""
		SELECT
			sa.adjustment_type, sa.type, sa.amount,
			sa.amount_type, sa.days, sa.remarks, sa.name
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
		"employee": emp.name,
		"company": company,
		"salary_month": salary_month
	}, as_dict=True)

	for adj in adjustments:
		is_earning = adj.type == "Addition"
		type_label = "إضافة" if is_earning else "خصم"
		item_name = adj.adjustment_type
		if adj.amount_type == "Days" and adj.days:
			item_name += f" ({adj.days} يوم)"

		data.append({
			"employee_name": "",
			"item_name": item_name,
			"type": type_label,
			"days": adj.days if adj.amount_type == "Days" else None,
			"amount": flt(adj.amount),
			"remarks": adj.remarks or "",
			"reference": adj.name,
			"is_earning": 1 if is_earning else 0,
			"is_deduction": 0 if is_earning else 1
		})
		if is_earning:
			total_earnings += flt(adj.amount)
		else:
			total_deductions += flt(adj.amount)

	# 4. Absence / Overtime
	allowed_leave = emp.allowed_leave_days or 0
	daily_rate = flt(base_fixed_salary) / 30 if base_fixed_salary else 0

	# Get absent days
	absent_days = 0
	absent_company_condition = "AND sa.company = %(company)s" if company else ""
	absence_result = frappe.db.sql("""
		SELECT COALESCE(SUM(sa.days), 0) as total_days
		FROM `tabPOS Salary Adjustment` sa
		INNER JOIN `tabPOS Salary Adjustment Type` sat ON sat.name = sa.adjustment_type
		WHERE sa.employee = %(employee)s
		{absent_company_condition}
		AND sa.salary_month = %(salary_month)s
		AND YEAR(sa.posting_date) = %(fiscal_year)s
		AND sa.docstatus = 1
		AND sat.is_absent = 1
	""".format(absent_company_condition=absent_company_condition), {
		"employee": emp.name, "company": company, "salary_month": salary_month, "fiscal_year": fiscal_year
	}, as_dict=True)
	if absence_result:
		absent_days = flt(absence_result[0].total_days)

	# Show absence info
	if absent_days > 0:
		data.append({
			"employee_name": "",
			"item_name": f"أيام الغياب: {absent_days} | المسموح: {allowed_leave}",
			"type": "غياب",
			"days": absent_days,
			"amount": None,
			"is_absence_info": 1
		})

	if not is_late_joiner:
		day_difference = absent_days - allowed_leave
		if day_difference > 0:
			absence_deduction = flt(day_difference * daily_rate)
			data.append({
				"employee_name": "",
				"item_name": f"خصم الغياب ({day_difference} يوم زيادة)",
				"type": "خصم",
				"days": day_difference,
				"amount": absence_deduction,
				"is_deduction": 1
			})
			total_deductions += absence_deduction
		elif day_difference < 0:
			overtime_days = abs(day_difference)
			overtime_bonus = flt(overtime_days * daily_rate)
			data.append({
				"employee_name": "",
				"item_name": f"مكافأة الإضافي ({overtime_days} يوم)",
				"type": "إضافة",
				"days": overtime_days,
				"amount": overtime_bonus,
				"is_earning": 1
			})
			total_earnings += overtime_bonus

			if absent_days == 0:
				no_leaves_bonus = flt(2 * daily_rate)
				data.append({
					"employee_name": "",
					"item_name": "مكافأة انتظام (يومين)",
					"type": "إضافة",
					"days": 2,
					"amount": no_leaves_bonus,
					"is_earning": 1
				})
				total_earnings += no_leaves_bonus
	else:
		if absent_days > 0:
			absence_deduction = flt(absent_days * daily_rate)
			data.append({
				"employee_name": "",
				"item_name": f"خصم غياب - موظف جديد ({absent_days} يوم)",
				"type": "خصم",
				"days": absent_days,
				"amount": absence_deduction,
				"is_deduction": 1
			})
			total_deductions += absence_deduction

	# 5. Short Term Loans
	from mobile_pos.mobile_pos.doctype.pos_employee_loan.pos_employee_loan import (
		get_employee_outstanding_short_term_loans,
		get_employee_next_long_term_installment,
	)
	short_term_total = get_employee_outstanding_short_term_loans(emp.name, company)
	if short_term_total > 0:
		data.append({
			"employee_name": "",
			"item_name": "سلفة قصيرة الأجل",
			"type": "خصم",
			"amount": short_term_total,
			"is_deduction": 1
		})
		total_deductions += short_term_total

	# 6. Long Term Loan Installment
	long_term_data = get_employee_next_long_term_installment(emp.name, company)
	if long_term_data.get("total", 0) > 0:
		data.append({
			"employee_name": "",
			"item_name": "قسط سلفة طويلة الأجل",
			"type": "خصم",
			"amount": long_term_data["total"],
			"is_deduction": 1
		})
		total_deductions += long_term_data["total"]

	# 7. Employee Purchases
	from mobile_pos.mobile_pos.doctype.pos_salary_payout.pos_salary_payout import get_employee_pending_sales
	employee_sales = get_employee_pending_sales(emp.name, salary_month, company)
	if employee_sales > 0:
		data.append({
			"employee_name": "",
			"item_name": "مشتريات الموظف",
			"type": "خصم",
			"amount": employee_sales,
			"is_deduction": 1
		})
		total_deductions += employee_sales

	# Employee total row
	net_salary = max(0, total_earnings - total_deductions)
	data.append({
		"employee_name": emp.employee_name,
		"item_name": "صافي المرتب",
		"type": "",
		"amount": net_salary,
		"is_employee_total": 1
	})

	# Empty separator row
	data.append({})

	return data, total_earnings, total_deductions
