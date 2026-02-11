# Copyright (c) 2026, Anthropic and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate


def execute(filters=None):
    if not filters:
        filters = {}

    report_view = filters.get("report_view", "Detailed")

    if report_view == "Detailed":
        return get_detailed(filters)
    elif report_view == "Summary by Item":
        return get_summary_by_item(filters)
    elif report_view == "Summary by Item and Period":
        return get_summary_by_item_period(filters)
    else:
        return get_detailed(filters)


def get_conditions(filters):
    conditions = ["si.docstatus = 1"]
    values = {}

    if filters.get("company"):
        conditions.append("si.company = %(company)s")
        values["company"] = filters.get("company")

    if filters.get("from_date"):
        conditions.append("si.posting_date >= %(from_date)s")
        values["from_date"] = filters.get("from_date")

    if filters.get("to_date"):
        conditions.append("si.posting_date <= %(to_date)s")
        values["to_date"] = filters.get("to_date")

    if filters.get("mini_pos_profile"):
        conditions.append("si.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("item_code"):
        conditions.append("sii.item_code = %(item_code)s")
        values["item_code"] = filters.get("item_code")

    if filters.get("invoice"):
        conditions.append("si.name = %(invoice)s")
        values["invoice"] = filters.get("invoice")

    if filters.get("customer"):
        conditions.append("si.customer = %(customer)s")
        values["customer"] = filters.get("customer")

    if not filters.get("include_returns"):
        conditions.append("si.is_return = 0")

    return " AND ".join(conditions), values


def get_detailed(filters):
    """Detailed view with all transactions"""
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 100},
        {"fieldname": "invoice", "label": _("Invoice"), "fieldtype": "Link", "options": "Sales Invoice", "width": 140},
        {"fieldname": "customer", "label": _("Customer"), "fieldtype": "Link", "options": "Customer", "width": 120},
        {"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 150},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 200},
        {"fieldname": "qty", "label": _("Qty"), "fieldtype": "Float", "width": 80},
        {"fieldname": "uom", "label": _("UOM"), "fieldtype": "Data", "width": 70},
        {"fieldname": "valuation_rate", "label": _("Valuation Rate"), "fieldtype": "Float", "width": 120},
        {"fieldname": "selling_rate", "label": _("Selling Rate"), "fieldtype": "Float", "width": 110},
        {"fieldname": "valuation_amount", "label": _("Valuation Amount"), "fieldtype": "Float", "width": 130},
        {"fieldname": "selling_amount", "label": _("Selling Amount"), "fieldtype": "Float", "width": 120},
        {"fieldname": "profit", "label": _("Profit"), "fieldtype": "Float", "width": 100},
        {"fieldname": "profit_percent", "label": _("Profit %"), "fieldtype": "Percent", "width": 80},
        {"fieldname": "mini_pos_profile", "label": _("POS Profile"), "fieldtype": "Link", "options": "Mini POS Profile", "width": 120},
        {"fieldname": "is_return", "label": _("Return"), "fieldtype": "Check", "width": 60}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            si.posting_date,
            si.name as invoice,
            si.customer,
            si.customer_name,
            sii.item_code,
            sii.item_name,
            sii.qty,
            sii.uom,
            sii.stock_qty,
            sii.stock_uom,
            sii.conversion_factor,
            sii.incoming_rate as valuation_rate,
            sii.rate as selling_rate,
            (sii.incoming_rate * ABS(sii.stock_qty)) as valuation_amount,
            sii.amount as selling_amount,
            si.custom_mini_pos_profile as mini_pos_profile,
            si.is_return
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE {conditions}
        ORDER BY si.posting_date DESC, si.name, sii.idx
    """.format(conditions=conditions), values, as_dict=True)

    for row in data:
        # Calculate profit
        if row.is_return:
            # For returns, profit is negative (we lose the margin)
            row["profit"] = -(flt(row["selling_amount"]) - flt(row["valuation_amount"]))
        else:
            row["profit"] = flt(row["selling_amount"]) - flt(row["valuation_amount"])

        # Calculate profit percentage
        if flt(row["valuation_amount"]) > 0:
            row["profit_percent"] = (flt(row["profit"]) / flt(row["valuation_amount"])) * 100
        else:
            row["profit_percent"] = 0

    return columns, data


def get_summary_by_item(filters):
    """Summary grouped by item"""
    columns = [
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 220},
        {"fieldname": "uom", "label": _("UOM"), "fieldtype": "Data", "width": 70},
        {"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Float", "width": 100},
        {"fieldname": "return_qty", "label": _("Return Qty"), "fieldtype": "Float", "width": 100},
        {"fieldname": "net_qty", "label": _("Net Qty"), "fieldtype": "Float", "width": 90},
        {"fieldname": "avg_valuation", "label": _("Avg Valuation"), "fieldtype": "Float", "width": 120},
        {"fieldname": "avg_selling", "label": _("Avg Selling"), "fieldtype": "Float", "width": 110},
        {"fieldname": "total_valuation", "label": _("Total Valuation"), "fieldtype": "Float", "width": 130},
        {"fieldname": "total_selling", "label": _("Total Selling"), "fieldtype": "Float", "width": 120},
        {"fieldname": "total_profit", "label": _("Total Profit"), "fieldtype": "Float", "width": 110},
        {"fieldname": "profit_percent", "label": _("Profit %"), "fieldtype": "Percent", "width": 80},
        {"fieldname": "invoice_count", "label": _("Invoices"), "fieldtype": "Int", "width": 80},
        {"fieldname": "customer_count", "label": _("Customers"), "fieldtype": "Int", "width": 90}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            sii.item_code,
            i.item_name,
            sii.uom,
            SUM(CASE WHEN si.is_return = 0 THEN sii.qty ELSE 0 END) as total_qty,
            SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.qty) ELSE 0 END) as return_qty,
            AVG(CASE WHEN si.is_return = 0 THEN sii.incoming_rate ELSE NULL END) as avg_valuation,
            AVG(CASE WHEN si.is_return = 0 THEN sii.rate ELSE NULL END) as avg_selling,
            SUM(CASE WHEN si.is_return = 0 THEN (sii.incoming_rate * sii.stock_qty) ELSE 0 END) as total_valuation,
            SUM(CASE WHEN si.is_return = 0 THEN sii.amount ELSE 0 END) as total_selling,
            SUM(CASE WHEN si.is_return = 1 THEN (sii.incoming_rate * ABS(sii.stock_qty)) ELSE 0 END) as return_valuation,
            SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.amount) ELSE 0 END) as return_selling,
            COUNT(DISTINCT si.name) as invoice_count,
            COUNT(DISTINCT si.customer) as customer_count
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        WHERE {conditions}
        GROUP BY sii.item_code, sii.uom
        ORDER BY total_selling DESC
    """.format(conditions=conditions), values, as_dict=True)

    for row in data:
        row["net_qty"] = flt(row["total_qty"]) - flt(row["return_qty"])

        # Adjust for returns
        net_valuation = flt(row["total_valuation"]) - flt(row.get("return_valuation", 0))
        net_selling = flt(row["total_selling"]) - flt(row.get("return_selling", 0))

        row["total_valuation"] = net_valuation
        row["total_selling"] = net_selling
        row["total_profit"] = net_selling - net_valuation

        if net_valuation > 0:
            row["profit_percent"] = (flt(row["total_profit"]) / net_valuation) * 100
        else:
            row["profit_percent"] = 0

    return columns, data


def get_summary_by_item_period(filters):
    """Summary grouped by item and period"""
    group_by = filters.get("group_by_period", "Daily")

    if group_by == "Weekly":
        date_format = "YEARWEEK(si.posting_date, 1)"
        period_label = _("Week")
    elif group_by == "Monthly":
        date_format = "DATE_FORMAT(si.posting_date, '%Y-%m')"
        period_label = _("Month")
    else:  # Daily
        date_format = "si.posting_date"
        period_label = _("Date")

    columns = [
        {"fieldname": "period", "label": period_label, "fieldtype": "Data", "width": 100},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 200},
        {"fieldname": "uom", "label": _("UOM"), "fieldtype": "Data", "width": 70},
        {"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Float", "width": 90},
        {"fieldname": "return_qty", "label": _("Return Qty"), "fieldtype": "Float", "width": 90},
        {"fieldname": "net_qty", "label": _("Net Qty"), "fieldtype": "Float", "width": 80},
        {"fieldname": "avg_valuation", "label": _("Avg Valuation"), "fieldtype": "Float", "width": 110},
        {"fieldname": "avg_selling", "label": _("Avg Selling"), "fieldtype": "Float", "width": 100},
        {"fieldname": "total_valuation", "label": _("Total Valuation"), "fieldtype": "Float", "width": 120},
        {"fieldname": "total_selling", "label": _("Total Selling"), "fieldtype": "Float", "width": 110},
        {"fieldname": "total_profit", "label": _("Total Profit"), "fieldtype": "Float", "width": 100},
        {"fieldname": "profit_percent", "label": _("Profit %"), "fieldtype": "Percent", "width": 80},
        {"fieldname": "invoice_count", "label": _("Invoices"), "fieldtype": "Int", "width": 80}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            {date_format} as period,
            sii.item_code,
            i.item_name,
            sii.uom,
            SUM(CASE WHEN si.is_return = 0 THEN sii.qty ELSE 0 END) as total_qty,
            SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.qty) ELSE 0 END) as return_qty,
            AVG(CASE WHEN si.is_return = 0 THEN sii.incoming_rate ELSE NULL END) as avg_valuation,
            AVG(CASE WHEN si.is_return = 0 THEN sii.rate ELSE NULL END) as avg_selling,
            SUM(CASE WHEN si.is_return = 0 THEN (sii.incoming_rate * sii.stock_qty) ELSE 0 END) as total_valuation,
            SUM(CASE WHEN si.is_return = 0 THEN sii.amount ELSE 0 END) as total_selling,
            SUM(CASE WHEN si.is_return = 1 THEN (sii.incoming_rate * ABS(sii.stock_qty)) ELSE 0 END) as return_valuation,
            SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.amount) ELSE 0 END) as return_selling,
            COUNT(DISTINCT si.name) as invoice_count
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        WHERE {conditions}
        GROUP BY period, sii.item_code, sii.uom
        ORDER BY period DESC, sii.item_code
    """.format(date_format=date_format, conditions=conditions), values, as_dict=True)

    for row in data:
        row["net_qty"] = flt(row["total_qty"]) - flt(row["return_qty"])

        # Adjust for returns
        net_valuation = flt(row["total_valuation"]) - flt(row.get("return_valuation", 0))
        net_selling = flt(row["total_selling"]) - flt(row.get("return_selling", 0))

        row["total_valuation"] = net_valuation
        row["total_selling"] = net_selling
        row["total_profit"] = net_selling - net_valuation

        if net_valuation > 0:
            row["profit_percent"] = (flt(row["total_profit"]) / net_valuation) * 100
        else:
            row["profit_percent"] = 0

        # Format period for display
        if group_by == "Weekly":
            row["period"] = f"Week {str(row['period'])[-2:]}/{str(row['period'])[:4]}"
        elif group_by == "Monthly":
            row["period"] = str(row["period"])

    return columns, data
