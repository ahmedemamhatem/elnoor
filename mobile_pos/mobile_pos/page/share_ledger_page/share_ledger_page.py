import frappe
from frappe import _
from frappe.utils import flt


def _get_profile_company():
	"""Get company from current user's Mini POS Profile"""
	user = frappe.session.user
	profile_name = frappe.db.get_value("Mini POS Profile", {"user": user}, "name")
	if not profile_name:
		frappe.throw(_("No POS Profile configured for this user ({0})").format(user), frappe.PermissionError)
	return frappe.db.get_value("Mini POS Profile", profile_name, "company")


@frappe.whitelist()
def get_share_ledger_data(filters=None):
	"""Get share ledger data for the page"""
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)

	filters = frappe._dict(filters or {})

	# Ensure company is always set from profile if not provided
	if not filters.get("company"):
		filters["company"] = _get_profile_company()

	# Build conditions
	conditions = ["sl.docstatus = 1"]

	if filters.get("company"):
		conditions.append("sl.company = %(company)s")

	if filters.get("mini_pos_profile"):
		conditions.append("sl.mini_pos_profile = %(mini_pos_profile)s")

	if filters.get("from_date"):
		conditions.append("sl.posting_date >= %(from_date)s")

	if filters.get("to_date"):
		conditions.append("sl.posting_date <= %(to_date)s")

	if filters.get("transaction_type"):
		conditions.append("sl.transaction_type = %(transaction_type)s")

	if filters.get("is_settled") == "Yes":
		conditions.append("sl.is_settled = 1")
	elif filters.get("is_settled") == "No":
		conditions.append("sl.is_settled = 0")

	where_clause = " AND ".join(conditions)

	# Get data
	data = frappe.db.sql("""
		SELECT
			sl.name,
			sl.posting_date,
			sl.transaction_type,
			sl.voucher_type,
			sl.voucher_no,
			sl.revenue_amount,
			sl.expense_amount,
			sl.net_amount,
			sl.is_settled,
			sl.settlement_reference
		FROM `tabShare Ledger` sl
		WHERE {where_clause}
		ORDER BY sl.posting_date DESC, sl.creation DESC
	""".format(where_clause=where_clause), filters, as_dict=1)

	# Calculate summary
	total_revenue = sum(flt(row.revenue_amount) for row in data)
	total_expense = sum(flt(row.expense_amount) for row in data)
	net_profit = total_revenue - total_expense
	settled_count = sum(1 for row in data if row.is_settled)
	unsettled_count = len(data) - settled_count

	summary = {
		"total_revenue": total_revenue,
		"total_expense": total_expense,
		"net_profit": net_profit,
		"total_count": len(data),
		"settled_count": settled_count,
		"unsettled_count": unsettled_count
	}

	# Get shareholders if profile selected
	shareholders = []
	if filters.get("mini_pos_profile"):
		shareholders = get_shareholders_data(
			filters.mini_pos_profile,
			filters.get("from_date"),
			filters.get("to_date"),
			filters.get("company")
		)

	return {
		"data": data,
		"summary": summary,
		"shareholders": shareholders
	}


def get_shareholders_data(mini_pos_profile, from_date, to_date, company=None):
	"""Get shareholders and their share amounts"""
	# Get unsettled totals
	conditions = [
		"docstatus = 1",
		"mini_pos_profile = %(mini_pos_profile)s",
		"is_settled = 0"
	]

	params = {"mini_pos_profile": mini_pos_profile}

	if from_date:
		conditions.append("posting_date >= %(from_date)s")
		params["from_date"] = from_date

	if to_date:
		conditions.append("posting_date <= %(to_date)s")
		params["to_date"] = to_date

	if company:
		conditions.append("company = %(company)s")
		params["company"] = company

	totals = frappe.db.sql("""
		SELECT SUM(net_amount) as net_profit
		FROM `tabShare Ledger`
		WHERE {conditions}
	""".format(conditions=" AND ".join(conditions)), params, as_dict=1)[0]

	net_profit = flt(totals.get("net_profit", 0))

	# Get shareholders
	shareholders = frappe.get_all("Mini POS Shareholder",
		filters={"parent": mini_pos_profile, "is_active": 1},
		fields=["shareholder_name", "percentage"]
	)

	result = []
	for sh in shareholders:
		share_amount = net_profit * flt(sh.percentage) / 100 if net_profit > 0 else 0
		result.append({
			"shareholder_name": sh.shareholder_name,
			"percentage": sh.percentage,
			"share_amount": share_amount
		})

	return result


@frappe.whitelist()
def get_shareholder_breakdown(mini_pos_profile, from_date, to_date, company=None):
	"""Get detailed breakdown for shareholders dialog"""
	# Ensure company is always set from profile if not provided
	if not company:
		company = _get_profile_company()

	params = {"mini_pos_profile": mini_pos_profile}
	conditions = [
		"docstatus = 1",
		"mini_pos_profile = %(mini_pos_profile)s",
		"is_settled = 0"
	]

	if from_date:
		conditions.append("posting_date >= %(from_date)s")
		params["from_date"] = from_date

	if to_date:
		conditions.append("posting_date <= %(to_date)s")
		params["to_date"] = to_date

	if company:
		conditions.append("company = %(company)s")
		params["company"] = company

	totals = frappe.db.sql("""
		SELECT
			SUM(revenue_amount) as total_revenue,
			SUM(expense_amount) as total_expense,
			SUM(net_amount) as net_profit
		FROM `tabShare Ledger`
		WHERE {conditions}
	""".format(conditions=" AND ".join(conditions)), params, as_dict=1)[0]

	net_profit = flt(totals.get("net_profit", 0))

	# Get shareholders
	shareholders = frappe.get_all("Mini POS Shareholder",
		filters={"parent": mini_pos_profile, "is_active": 1},
		fields=["shareholder_name", "percentage", "payable_account"]
	)

	result = {
		"total_revenue": flt(totals.get("total_revenue", 0)),
		"total_expense": flt(totals.get("total_expense", 0)),
		"net_profit": net_profit,
		"shareholders": []
	}

	for sh in shareholders:
		share_amount = net_profit * flt(sh.percentage) / 100 if net_profit > 0 else 0
		result["shareholders"].append({
			"shareholder_name": sh.shareholder_name,
			"percentage": sh.percentage,
			"share_amount": share_amount,
			"payable_account": sh.payable_account
		})

	return result
