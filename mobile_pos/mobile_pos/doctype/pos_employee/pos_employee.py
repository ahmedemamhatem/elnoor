# Copyright (c) 2026, Ahmed Emam and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from frappe.utils import flt


class POSEmployee(Document):
	def validate(self):
		pass

	def get_total_salary(self):
		"""Calculate total salary including allowances and deductions"""
		total = self.fixed_salary or 0

		for row in self.additional_salaries:
			if row.calculation_type == "Fixed Amount":
				value = row.amount or 0
			else:
				value = (self.fixed_salary or 0) * (row.percent or 0) / 100

			if row.type == "Allowance":
				total += value
			elif row.type == "Deduction":
				total -= value

		return total
