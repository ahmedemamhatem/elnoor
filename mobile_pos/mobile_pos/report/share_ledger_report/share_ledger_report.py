# Copyright (c) 2025, Anthropic and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
	filters = frappe._dict(filters or {})

	if filters.get("group_by") == "item":
		columns = get_item_columns()
		data = get_item_data(filters)
	elif filters.get("group_by"):
		columns = get_grouped_columns(filters)
		data = get_grouped_data(filters)
	else:
		columns = get_columns()
		data = get_data(filters)

	report_summary = get_report_summary(data, filters)

	return columns, data, None, None, report_summary


def get_columns():
	return [
		{"label": _("الرقم"), "fieldname": "name", "fieldtype": "Link", "options": "Share Ledger", "width": 140},
		{"label": _("التاريخ"), "fieldname": "posting_date", "fieldtype": "Date", "width": 100},
		{"label": _("الشريك"), "fieldname": "shareholder", "fieldtype": "Link", "options": "Shareholder", "width": 120},
		{"label": _("نقطة البيع"), "fieldname": "pos_profile_name", "fieldtype": "Data", "width": 150},
		{"label": _("النوع"), "fieldname": "transaction_type", "fieldtype": "Data", "width": 80},
		{"label": _("المستند"), "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 130},
		{"label": _("صافي المبلغ"), "fieldname": "net_amount", "fieldtype": "Currency", "width": 110},
		{"label": _("النسبة"), "fieldname": "percentage", "fieldtype": "Percent", "width": 70},
		{"label": _("الحصة"), "fieldname": "share_amount", "fieldtype": "Currency", "width": 110},
		{"label": _("التسوية"), "fieldname": "is_settled", "fieldtype": "Check", "width": 80}
	]


def get_item_columns():
	return [
		{"label": _("الفاتورة"), "fieldname": "voucher_no", "fieldtype": "Link", "options": "Sales Invoice", "width": 140},
		{"label": _("التاريخ"), "fieldname": "posting_date", "fieldtype": "Date", "width": 100},
		{"label": _("نقطة البيع"), "fieldname": "pos_profile_name", "fieldtype": "Data", "width": 130},
		{"label": _("كود الصنف"), "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 120},
		{"label": _("اسم الصنف"), "fieldname": "item_name", "fieldtype": "Data", "width": 160},
		{"label": _("الكمية"), "fieldname": "qty", "fieldtype": "Float", "width": 70},
		{"label": _("الوحدة"), "fieldname": "uom", "fieldtype": "Data", "width": 70},
		{"label": _("سعر البيع"), "fieldname": "rate", "fieldtype": "Currency", "width": 100},
		{"label": _("إجمالي البيع"), "fieldname": "selling_total", "fieldtype": "Currency", "width": 110},
		{"label": _("سعر التكلفة"), "fieldname": "incoming_rate", "fieldtype": "Currency", "width": 100},
		{"label": _("كمية المخزون"), "fieldname": "stock_qty", "fieldtype": "Float", "width": 80},
		{"label": _("إجمالي التكلفة"), "fieldname": "cost_total", "fieldtype": "Currency", "width": 110},
		{"label": _("هامش الربح"), "fieldname": "margin", "fieldtype": "Currency", "width": 110},
		{"label": _("معامل التحويل"), "fieldname": "conversion_factor", "fieldtype": "Float", "width": 80},
	]


def get_grouped_columns(filters):
	group_by = filters.get("group_by")

	if group_by == "shareholder":
		return [
			{"label": _("الشريك"), "fieldname": "shareholder", "fieldtype": "Link", "options": "Shareholder", "width": 150},
			{"label": _("النسبة"), "fieldname": "percentage", "fieldtype": "Percent", "width": 80},
			{"label": _("العمليات"), "fieldname": "transaction_count", "fieldtype": "Int", "width": 80},
			{"label": _("الإيرادات"), "fieldname": "total_revenue", "fieldtype": "Currency", "width": 150},
			{"label": _("م.نقطة البيع"), "fieldname": "pos_expense", "fieldtype": "Currency", "width": 150},
			{"label": _("م.عامة"), "fieldname": "general_expense", "fieldtype": "Currency", "width": 150},
			{"label": _("صافي الربح"), "fieldname": "net_profit", "fieldtype": "Currency", "width": 150},
			{"label": _("الحصة"), "fieldname": "share_amount", "fieldtype": "Currency", "width": 150},
			{"label": _("التسوية"), "fieldname": "settled_amount", "fieldtype": "Currency", "width": 150},
			{"label": _("المدفوع"), "fieldname": "paid_amount", "fieldtype": "Currency", "width": 150},
			{"label": _("المقدم المستخدم"), "fieldname": "advance_used", "fieldtype": "Currency", "width": 150},
			{"label": _("معلق السداد"), "fieldname": "pending_payment", "fieldtype": "Currency", "width": 150},
			{"label": _("المقدم"), "fieldname": "advance_balance", "fieldtype": "Currency", "width": 150}
		]
	else:  # mini_pos_profile
		return [
			{"label": _("نقطة البيع"), "fieldname": "pos_profile_name", "fieldtype": "Data", "width": 180},
			{"label": _("العمليات"), "fieldname": "transaction_count", "fieldtype": "Int", "width": 90},
			{"label": _("الإيرادات"), "fieldname": "total_revenue", "fieldtype": "Currency", "width": 150},
			{"label": _("م.نقطة البيع"), "fieldname": "pos_expense", "fieldtype": "Currency", "width": 150},
			{"label": _("م.عامة"), "fieldname": "general_expense", "fieldtype": "Currency", "width": 150},
			{"label": _("صافي الربح"), "fieldname": "net_profit", "fieldtype": "Currency", "width": 150},
			{"label": _("الحصص"), "fieldname": "share_amount", "fieldtype": "Currency", "width": 150},
			{"label": _("التسوية"), "fieldname": "settled_amount", "fieldtype": "Currency", "width": 150},
			{"label": _("معلق"), "fieldname": "pending_amount", "fieldtype": "Currency", "width": 150}
		]


def get_data(filters):
	conditions = get_conditions(filters)

	data = frappe.db.sql("""
		SELECT
			sl.name,
			sl.posting_date,
			sl.shareholder,
			sl.shareholder_name,
			sl.mini_pos_profile,
			p.full_name as pos_profile_name,
			sl.transaction_type,
			sl.voucher_type,
			sl.voucher_no,
			sl.revenue_amount,
			sl.expense_amount,
			sl.net_amount,
			sl.percentage,
			sl.share_amount,
			sl.is_settled,
			sl.settlement_reference
		FROM `tabShare Ledger` sl
		LEFT JOIN `tabMini POS Profile` p ON p.name = sl.mini_pos_profile
		WHERE sl.docstatus = 1
		{conditions}
		ORDER BY sl.posting_date DESC, sl.creation DESC
	""".format(conditions=conditions), filters, as_dict=1)

	# Translate values to Arabic
	transaction_type_map = {
		"Sales": _("مبيعات"),
		"Sales Return": _("مرتجع"),
		"Expense": _("مصروف"),
		"General Expense": _("مصروف عام")
	}

	for row in data:
		row["transaction_type"] = transaction_type_map.get(row.get("transaction_type"), row.get("transaction_type"))

	return data


def get_item_data(filters):
	conditions = get_conditions(filters)

	data = frappe.db.sql("""
		SELECT
			sl.voucher_no,
			sl.posting_date,
			sl.mini_pos_profile,
			p.full_name as pos_profile_name,
			sii.item_code,
			sii.item_name,
			sii.qty,
			sii.uom,
			sii.rate,
			sii.incoming_rate,
			sii.stock_qty,
			sii.stock_uom,
			sii.conversion_factor,
			(sii.rate * sii.qty) as selling_total,
			(sii.incoming_rate * sii.stock_qty) as cost_total,
			((sii.rate * sii.qty) - (sii.incoming_rate * sii.stock_qty)) as margin
		FROM `tabShare Ledger` sl
		JOIN `tabSales Invoice Item` sii ON sii.parent = sl.voucher_no
		LEFT JOIN `tabMini POS Profile` p ON p.name = sl.mini_pos_profile
		WHERE sl.docstatus = 1
		AND sl.voucher_type = 'Sales Invoice'
		{conditions}
		GROUP BY sl.voucher_no, sii.name
		ORDER BY sl.posting_date DESC, sl.voucher_no, sii.idx
	""".format(conditions=conditions), filters, as_dict=1)

	return data


def get_grouped_data(filters):
	conditions = get_conditions(filters)
	group_by = filters.get("group_by")

	if group_by == "shareholder":
		data = frappe.db.sql("""
			SELECT
				sl.shareholder,
				sl.shareholder_name,
				AVG(sl.percentage) as percentage,
				COUNT(*) as transaction_count,
				SUM(sl.revenue_amount) as total_revenue,
				SUM(CASE WHEN sl.transaction_type = 'Expense' THEN sl.expense_amount ELSE 0 END) as pos_expense,
				SUM(CASE WHEN sl.transaction_type = 'General Expense' THEN sl.expense_amount ELSE 0 END) as general_expense,
				SUM(sl.net_amount) as net_profit,
				SUM(sl.share_amount) as share_amount,
				SUM(CASE WHEN sl.is_settled = 1 THEN sl.share_amount ELSE 0 END) as settled_amount,
				SUM(CASE WHEN sl.is_settled = 0 THEN sl.share_amount ELSE 0 END) as pending_amount
			FROM `tabShare Ledger` sl
			WHERE sl.docstatus = 1
			{conditions}
			GROUP BY sl.shareholder
			ORDER BY share_amount DESC
		""".format(conditions=conditions), filters, as_dict=1)

		# Fetch payment info for each shareholder
		for row in data:
			shareholder = row.get("shareholder")
			# Get paid settlements
			payment_info = frappe.db.sql("""
				SELECT
					COALESCE(SUM(ss.share_amount), 0) as paid_amount,
					COALESCE(SUM(ss.advance_used), 0) as advance_used
				FROM `tabShareholder Settlement` ss
				WHERE ss.shareholder = %s
				AND ss.docstatus = 1
				AND ss.status = 'Paid'
			""", shareholder, as_dict=1)[0]

			# Get advance balance from Shareholder
			advance_balance = frappe.db.get_value("Shareholder", shareholder, "advance_balance") or 0

			row["paid_amount"] = flt(payment_info.get("paid_amount", 0))
			row["advance_used"] = flt(payment_info.get("advance_used", 0))
			row["advance_balance"] = flt(advance_balance)
			# Pending payment = settled but not paid yet
			row["pending_payment"] = flt(row.get("settled_amount", 0)) - flt(row.get("paid_amount", 0))
	else:  # mini_pos_profile
		data = frappe.db.sql("""
			SELECT
				sl.mini_pos_profile,
				p.full_name as pos_profile_name,
				COUNT(*) as transaction_count,
				SUM(sl.revenue_amount) as total_revenue,
				SUM(CASE WHEN sl.transaction_type = 'Expense' THEN sl.expense_amount ELSE 0 END) as pos_expense,
				SUM(CASE WHEN sl.transaction_type = 'General Expense' THEN sl.expense_amount ELSE 0 END) as general_expense,
				SUM(sl.net_amount) as net_profit,
				SUM(sl.share_amount) as share_amount,
				SUM(CASE WHEN sl.is_settled = 1 THEN sl.share_amount ELSE 0 END) as settled_amount,
				SUM(CASE WHEN sl.is_settled = 0 THEN sl.share_amount ELSE 0 END) as pending_amount
			FROM `tabShare Ledger` sl
			LEFT JOIN `tabMini POS Profile` p ON p.name = sl.mini_pos_profile
			WHERE sl.docstatus = 1
			{conditions}
			GROUP BY sl.mini_pos_profile
			ORDER BY share_amount DESC
		""".format(conditions=conditions), filters, as_dict=1)

	return data


def get_conditions(filters):
	conditions = []

	if filters.get("company"):
		conditions.append("sl.company = %(company)s")

	if filters.get("shareholder"):
		conditions.append("sl.shareholder = %(shareholder)s")

	if filters.get("mini_pos_profile"):
		conditions.append("sl.mini_pos_profile = %(mini_pos_profile)s")

	if filters.get("from_date"):
		conditions.append("sl.posting_date >= %(from_date)s")

	if filters.get("to_date"):
		conditions.append("sl.posting_date <= %(to_date)s")

	if filters.get("transaction_type"):
		conditions.append("sl.transaction_type = %(transaction_type)s")

	if filters.get("voucher_type"):
		conditions.append("sl.voucher_type = %(voucher_type)s")

	if filters.get("is_settled") == "Yes":
		conditions.append("sl.is_settled = 1")
	elif filters.get("is_settled") == "No":
		conditions.append("sl.is_settled = 0")

	if filters.get("settlement_reference"):
		conditions.append("sl.settlement_reference = %(settlement_reference)s")

	return " AND " + " AND ".join(conditions) if conditions else ""


def get_report_summary(data, filters):
	if not data:
		return None

	# Handle item, grouped, and non-grouped data
	if filters.get("group_by") == "item":
		total_selling = sum(flt(row.get("selling_total", 0)) for row in data)
		total_cost = sum(flt(row.get("cost_total", 0)) for row in data)
		total_margin = sum(flt(row.get("margin", 0)) for row in data)

		currency = "EGP"
		if filters.get("company"):
			currency = frappe.get_cached_value("Company", filters.get("company"), "default_currency") or "EGP"

		return [
			{
				"value": total_selling,
				"indicator": "Blue",
				"label": _("إجمالي المبيعات"),
				"datatype": "Currency",
				"currency": currency
			},
			{
				"value": total_cost,
				"indicator": "Red",
				"label": _("إجمالي التكلفة"),
				"datatype": "Currency",
				"currency": currency
			},
			{
				"value": total_margin,
				"indicator": "Green" if total_margin >= 0 else "Red",
				"label": _("إجمالي هامش الربح"),
				"datatype": "Currency",
				"currency": currency
			},
			{
				"value": len(set(row.get("voucher_no") for row in data)),
				"indicator": "Blue",
				"label": _("عدد الفواتير"),
				"datatype": "Int"
			},
			{
				"value": len(data),
				"indicator": "Blue",
				"label": _("عدد الأصناف"),
				"datatype": "Int"
			}
		]
	elif filters.get("group_by"):
		total_revenue = sum(flt(row.get("total_revenue", 0)) for row in data)
		pos_expense = sum(flt(row.get("pos_expense", 0)) for row in data)
		general_expense = sum(flt(row.get("general_expense", 0)) for row in data)
		total_expense = pos_expense + general_expense
		total_share = sum(flt(row.get("share_amount", 0)) for row in data)
		settled_amount = sum(flt(row.get("settled_amount", 0)) for row in data)
		pending_amount = sum(flt(row.get("pending_amount", 0)) for row in data)
		net_profit = sum(flt(row.get("net_profit", 0)) for row in data)

		# Payment info for shareholder grouping
		if filters.get("group_by") == "shareholder":
			paid_amount = sum(flt(row.get("paid_amount", 0)) for row in data)
			advance_used = sum(flt(row.get("advance_used", 0)) for row in data)
			pending_payment = sum(flt(row.get("pending_payment", 0)) for row in data)
		else:
			paid_amount = 0
			advance_used = 0
			pending_payment = 0
	else:
		total_revenue = sum(flt(row.get("revenue_amount", 0)) for row in data)
		total_expense = sum(flt(row.get("expense_amount", 0)) for row in data)
		pos_expense = sum(flt(row.get("expense_amount", 0)) for row in data if row.get("transaction_type") in ["مصروف", "Expense"])
		general_expense = sum(flt(row.get("expense_amount", 0)) for row in data if row.get("transaction_type") in ["مصروف عام", "General Expense"])
		total_share = sum(flt(row.get("share_amount", 0)) for row in data)
		settled_amount = sum(flt(row.get("share_amount", 0)) for row in data if row.get("is_settled"))
		pending_amount = total_share - settled_amount
		net_profit = total_revenue - total_expense
		paid_amount = 0
		advance_used = 0
		pending_payment = 0

	currency = "EGP"
	if filters.get("company"):
		currency = frappe.get_cached_value("Company", filters.get("company"), "default_currency") or "EGP"

	summary = [
		{
			"value": total_revenue,
			"indicator": "Green",
			"label": _("إجمالي الإيرادات"),
			"datatype": "Currency",
			"currency": currency
		},
		{
			"value": pos_expense,
			"indicator": "Red",
			"label": _("م.نقطة البيع"),
			"datatype": "Currency",
			"currency": currency
		},
		{
			"value": general_expense,
			"indicator": "Orange",
			"label": _("م.عامة"),
			"datatype": "Currency",
			"currency": currency
		},
		{
			"value": net_profit,
			"indicator": "Blue" if net_profit >= 0 else "Red",
			"label": _("صافي الربح"),
			"datatype": "Currency",
			"currency": currency
		},
		{
			"value": total_share,
			"indicator": "Purple",
			"label": _("إجمالي الحصص"),
			"datatype": "Currency",
			"currency": currency
		},
		{
			"value": settled_amount,
			"indicator": "Green",
			"label": _("تمت التسوية"),
			"datatype": "Currency",
			"currency": currency
		},
		{
			"value": pending_amount,
			"indicator": "Orange",
			"label": _("معلق التسوية"),
			"datatype": "Currency",
			"currency": currency
		}
	]

	# Add payment summary for shareholder grouping
	if filters.get("group_by") == "shareholder":
		summary.extend([
			{
				"value": paid_amount,
				"indicator": "Green",
				"label": _("المدفوع"),
				"datatype": "Currency",
				"currency": currency
			},
			{
				"value": pending_payment,
				"indicator": "Red",
				"label": _("معلق السداد"),
				"datatype": "Currency",
				"currency": currency
			}
		])

	return summary


@frappe.whitelist()
def get_shareholders_summary(from_date, to_date, company=None, mini_pos_profile=None):
	"""Get summary of all shareholders' earnings"""
	conditions = ["sl.docstatus = 1"]
	params = {}

	if company:
		conditions.append("sl.company = %(company)s")
		params["company"] = company

	if mini_pos_profile:
		conditions.append("sl.mini_pos_profile = %(mini_pos_profile)s")
		params["mini_pos_profile"] = mini_pos_profile

	if from_date:
		conditions.append("sl.posting_date >= %(from_date)s")
		params["from_date"] = from_date

	if to_date:
		conditions.append("sl.posting_date <= %(to_date)s")
		params["to_date"] = to_date

	data = frappe.db.sql("""
		SELECT
			sl.shareholder,
			sh.shareholder_name,
			COUNT(*) as transaction_count,
			SUM(sl.share_amount) as share_amount,
			SUM(CASE WHEN sl.is_settled = 1 THEN sl.share_amount ELSE 0 END) as settled_amount,
			SUM(CASE WHEN sl.is_settled = 0 THEN sl.share_amount ELSE 0 END) as pending_amount,
			GROUP_CONCAT(DISTINCT sl.mini_pos_profile) as profiles_str
		FROM `tabShare Ledger` sl
		LEFT JOIN `tabShareholder` sh ON sh.name = sl.shareholder
		WHERE {conditions}
		GROUP BY sl.shareholder
		ORDER BY share_amount DESC
	""".format(conditions=" AND ".join(conditions)), params, as_dict=1)

	# Parse profiles string to list
	for row in data:
		if row.get("profiles_str"):
			row["profiles"] = row["profiles_str"].split(",")
		else:
			row["profiles"] = []
		del row["profiles_str"]

	return data


@frappe.whitelist()
def get_shareholder_breakdown(mini_pos_profile, from_date, to_date, company=None):
	"""Get detailed breakdown for shareholders of a specific POS profile"""
	params = {
		"mini_pos_profile": mini_pos_profile,
		"from_date": from_date,
		"to_date": to_date
	}

	conditions = [
		"sl.docstatus = 1",
		"sl.mini_pos_profile = %(mini_pos_profile)s",
		"sl.posting_date >= %(from_date)s",
		"sl.posting_date <= %(to_date)s",
		"sl.is_settled = 0"
	]

	if company:
		conditions.append("sl.company = %(company)s")
		params["company"] = company

	# Get totals per shareholder
	shareholders_data = frappe.db.sql("""
		SELECT
			sl.shareholder,
			sh.shareholder_name,
			sh.payable_account,
			SUM(sl.revenue_amount) as total_revenue,
			SUM(sl.expense_amount) as total_expense,
			SUM(sl.net_amount) as net_profit,
			AVG(sl.percentage) as percentage,
			SUM(sl.share_amount) as share_amount
		FROM `tabShare Ledger` sl
		LEFT JOIN `tabShareholder` sh ON sh.name = sl.shareholder
		WHERE {conditions}
		GROUP BY sl.shareholder
		ORDER BY share_amount DESC
	""".format(conditions=" AND ".join(conditions)), params, as_dict=1)

	# Get overall totals
	totals = frappe.db.sql("""
		SELECT
			SUM(revenue_amount) as total_revenue,
			SUM(expense_amount) as total_expense,
			SUM(net_amount) as net_profit
		FROM `tabShare Ledger` sl
		WHERE {conditions}
	""".format(conditions=" AND ".join(conditions)), params, as_dict=1)[0]

	return {
		"total_revenue": flt(totals.get("total_revenue", 0)),
		"total_expense": flt(totals.get("total_expense", 0)),
		"net_profit": flt(totals.get("net_profit", 0)),
		"shareholders": shareholders_data
	}
