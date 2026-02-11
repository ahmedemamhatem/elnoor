# Copyright (c) 2026, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class POSSalaryAdjustment(Document):
	def validate(self):
		self.calculate_amount()
		self.validate_additional_salary()

	def calculate_amount(self):
		"""Calculate daily rate and amount based on amount_type"""
		if not self.employee:
			return

		fixed_salary = frappe.db.get_value("POS Employee", self.employee, "fixed_salary") or 0
		self.daily_rate = fixed_salary / 30

		if self.amount_type == "Days":
			self.amount = (self.days or 0) * self.daily_rate
		elif self.amount_type == "Additional Salary":
			self.calculate_additional_salary_amount()

	def calculate_additional_salary_amount(self):
		"""Calculate amount based on additional salary type"""
		if not self.employee or not self.additional_salary_type:
			return

		employee = frappe.get_doc("POS Employee", self.employee)
		fixed_salary = flt(employee.fixed_salary or 0)

		salary_value = 0
		for row in employee.additional_salaries:
			if row.salary_type == self.additional_salary_type:
				if row.calculation_type == "Fixed Amount":
					salary_value = flt(row.amount or 0)
				else:
					salary_value = fixed_salary * flt(row.percent or 0) / 100
				break

		self.additional_salary_value = salary_value

		if self.deduct_full:
			self.amount = salary_value

	def validate_additional_salary(self):
		"""Validate additional salary deduction"""
		if self.amount_type != "Additional Salary":
			return

		if not self.additional_salary_type:
			frappe.throw(_("يجب تحديد نوع البدل للخصم"))

		employee = frappe.get_doc("POS Employee", self.employee)
		has_salary = False
		for row in employee.additional_salaries:
			if row.salary_type == self.additional_salary_type:
				has_salary = True
				break

		if not has_salary:
			frappe.throw(
				_("الموظف {0} ليس لديه البدل '{1}' في قائمة البدلات الإضافية")
				.format(self.employee_name, self.additional_salary_type)
			)

		if not self.deduct_full and flt(self.amount) > flt(self.additional_salary_value):
			frappe.throw(
				_("مبلغ الخصم ({0}) لا يمكن أن يتجاوز قيمة البدل الكاملة ({1})")
				.format(self.amount, self.additional_salary_value)
			)


@frappe.whitelist()
def get_daily_rate(employee):
	"""Get daily rate for an employee (fixed_salary / 30)"""
	if not employee:
		return {"daily_rate": 0}

	fixed_salary = frappe.db.get_value("POS Employee", employee, "fixed_salary") or 0
	daily_rate = fixed_salary / 30

	return {"daily_rate": daily_rate}


@frappe.whitelist()
def get_employee_additional_salaries(employee):
	"""Get employee's additional salaries for selection in Salary Adjustment"""
	if not employee:
		return []

	employee_doc = frappe.get_doc("POS Employee", employee)
	fixed_salary = flt(employee_doc.fixed_salary or 0)

	result = []
	for row in employee_doc.additional_salaries:
		if row.calculation_type == "Fixed Amount":
			value = flt(row.amount or 0)
		else:
			value = fixed_salary * flt(row.percent or 0) / 100

		result.append({
			"salary_type": row.salary_type,
			"type": row.type,
			"calculation_type": row.calculation_type,
			"value": value
		})

	return result


@frappe.whitelist()
def get_additional_salary_value(employee, additional_salary_type):
	"""Get the value of a specific additional salary for an employee"""
	if not employee or not additional_salary_type:
		return {"value": 0}

	employee_doc = frappe.get_doc("POS Employee", employee)
	fixed_salary = flt(employee_doc.fixed_salary or 0)

	for row in employee_doc.additional_salaries:
		if row.salary_type == additional_salary_type:
			if row.calculation_type == "Fixed Amount":
				value = flt(row.amount or 0)
			else:
				value = fixed_salary * flt(row.percent or 0) / 100
			return {"value": value, "type": row.type}

	return {"value": 0, "type": None}
