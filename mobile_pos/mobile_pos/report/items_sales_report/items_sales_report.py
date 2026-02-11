# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    if not filters:
        filters = {}

    report_view = filters.get("report_view", "Summary by Item")

    if report_view == "Summary by Item":
        return get_summary_by_item(filters)
    elif report_view == "Summary by Item Group":
        return get_summary_by_group(filters)
    elif report_view == "Detailed":
        return get_detailed(filters)
    elif report_view == "Top Selling Items":
        return get_top_selling(filters)
    elif report_view == "Low Selling Items":
        return get_low_selling(filters)
    else:
        return get_summary_by_item(filters)


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
        conditions.append("c.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("item_group"):
        conditions.append("i.item_group = %(item_group)s")
        values["item_group"] = filters.get("item_group")

    if filters.get("item_code"):
        conditions.append("sii.item_code = %(item_code)s")
        values["item_code"] = filters.get("item_code")

    if filters.get("customer"):
        conditions.append("si.customer = %(customer)s")
        values["customer"] = filters.get("customer")

    if filters.get("warehouse"):
        conditions.append("sii.warehouse = %(warehouse)s")
        values["warehouse"] = filters.get("warehouse")

    if not filters.get("include_returns"):
        conditions.append("si.is_return = 0")

    return " AND ".join(conditions), values


def get_summary_by_item(filters):
    columns = [
        {"fieldname": "item_code", "label": _("Item Code"), "fieldtype": "Link", "options": "Item", "width": 120},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 180},
        {"fieldname": "item_group", "label": _("Item Group"), "fieldtype": "Link", "options": "Item Group", "width": 120},
        {"fieldname": "uom", "label": _("UOM"), "fieldtype": "Data", "width": 70},
        {"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Float", "width": 100},
        {"fieldname": "avg_rate", "label": _("Avg Rate"), "fieldtype": "Currency", "width": 100},
        {"fieldname": "total_amount", "label": _("Total Amount"), "fieldtype": "Currency", "width": 130},
        {"fieldname": "invoice_count", "label": _("Invoices"), "fieldtype": "Int", "width": 80},
        {"fieldname": "customer_count", "label": _("Customers"), "fieldtype": "Int", "width": 90},
        {"fieldname": "return_qty", "label": _("Return Qty"), "fieldtype": "Float", "width": 90},
        {"fieldname": "net_qty", "label": _("Net Qty"), "fieldtype": "Float", "width": 90}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            sii.item_code,
            i.item_name,
            i.item_group,
            sii.uom,
            SUM(CASE WHEN si.is_return = 0 THEN sii.qty ELSE 0 END) as total_qty,
            AVG(CASE WHEN si.is_return = 0 THEN sii.rate ELSE NULL END) as avg_rate,
            SUM(CASE WHEN si.is_return = 0 THEN sii.amount ELSE 0 END) as total_amount,
            COUNT(DISTINCT CASE WHEN si.is_return = 0 THEN si.name END) as invoice_count,
            COUNT(DISTINCT CASE WHEN si.is_return = 0 THEN si.customer END) as customer_count,
            SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.qty) ELSE 0 END) as return_qty
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {conditions}
        GROUP BY sii.item_code, sii.uom
        ORDER BY total_amount DESC
    """.format(conditions=conditions), values, as_dict=True)

    for row in data:
        row["net_qty"] = flt(row["total_qty"]) - flt(row["return_qty"])

    return columns, data


def get_summary_by_group(filters):
    columns = [
        {"fieldname": "item_group", "label": _("Item Group"), "fieldtype": "Link", "options": "Item Group", "width": 180},
        {"fieldname": "item_count", "label": _("Items"), "fieldtype": "Int", "width": 80},
        {"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Float", "width": 110},
        {"fieldname": "total_amount", "label": _("Total Amount"), "fieldtype": "Currency", "width": 140},
        {"fieldname": "invoice_count", "label": _("Invoices"), "fieldtype": "Int", "width": 90},
        {"fieldname": "customer_count", "label": _("Customers"), "fieldtype": "Int", "width": 100},
        {"fieldname": "avg_invoice_value", "label": _("Avg Invoice"), "fieldtype": "Currency", "width": 120},
        {"fieldname": "return_amount", "label": _("Returns"), "fieldtype": "Currency", "width": 110},
        {"fieldname": "net_amount", "label": _("Net Amount"), "fieldtype": "Currency", "width": 130}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            i.item_group,
            COUNT(DISTINCT sii.item_code) as item_count,
            SUM(CASE WHEN si.is_return = 0 THEN sii.qty ELSE 0 END) as total_qty,
            SUM(CASE WHEN si.is_return = 0 THEN sii.amount ELSE 0 END) as total_amount,
            COUNT(DISTINCT CASE WHEN si.is_return = 0 THEN si.name END) as invoice_count,
            COUNT(DISTINCT CASE WHEN si.is_return = 0 THEN si.customer END) as customer_count,
            SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.amount) ELSE 0 END) as return_amount
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {conditions}
        GROUP BY i.item_group
        ORDER BY total_amount DESC
    """.format(conditions=conditions), values, as_dict=True)

    for row in data:
        row["avg_invoice_value"] = flt(row["total_amount"]) / flt(row["invoice_count"]) if row["invoice_count"] else 0
        row["net_amount"] = flt(row["total_amount"]) - flt(row["return_amount"])

    return columns, data


def get_detailed(filters):
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 90},
        {"fieldname": "invoice", "label": _("Invoice"), "fieldtype": "Link", "options": "Sales Invoice", "width": 130},
        {"fieldname": "customer_name", "label": _("Customer"), "fieldtype": "Data", "width": 150},
        {"fieldname": "item_code", "label": _("Item Code"), "fieldtype": "Link", "options": "Item", "width": 100},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 150},
        {"fieldname": "item_group", "label": _("Group"), "fieldtype": "Data", "width": 100},
        {"fieldname": "qty", "label": _("Qty"), "fieldtype": "Float", "width": 70},
        {"fieldname": "uom", "label": _("UOM"), "fieldtype": "Data", "width": 60},
        {"fieldname": "rate", "label": _("Rate"), "fieldtype": "Currency", "width": 90},
        {"fieldname": "amount", "label": _("Amount"), "fieldtype": "Currency", "width": 100},
        {"fieldname": "warehouse", "label": _("Warehouse"), "fieldtype": "Link", "options": "Warehouse", "width": 120},
        {"fieldname": "is_return", "label": _("Return"), "fieldtype": "Check", "width": 60}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            si.posting_date,
            si.name as invoice,
            si.customer_name,
            sii.item_code,
            sii.item_name,
            i.item_group,
            sii.qty,
            sii.uom,
            sii.rate,
            sii.amount,
            sii.warehouse,
            si.is_return
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {conditions}
        ORDER BY si.posting_date DESC, si.name
    """.format(conditions=conditions), values, as_dict=True)

    return columns, data


def get_top_selling(filters):
    columns = [
        {"fieldname": "rank", "label": _("#"), "fieldtype": "Int", "width": 50},
        {"fieldname": "item_code", "label": _("Item Code"), "fieldtype": "Link", "options": "Item", "width": 120},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 200},
        {"fieldname": "item_group", "label": _("Item Group"), "fieldtype": "Link", "options": "Item Group", "width": 120},
        {"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Float", "width": 100},
        {"fieldname": "total_amount", "label": _("Total Amount"), "fieldtype": "Currency", "width": 140},
        {"fieldname": "invoice_count", "label": _("Invoices"), "fieldtype": "Int", "width": 90},
        {"fieldname": "customer_count", "label": _("Customers"), "fieldtype": "Int", "width": 100},
        {"fieldname": "percentage", "label": _("% of Sales"), "fieldtype": "Percent", "width": 100}
    ]

    conditions, values = get_conditions(filters)

    # Get total sales
    total_sales = frappe.db.sql("""
        SELECT COALESCE(SUM(sii.amount), 0) as total
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {conditions} AND si.is_return = 0
    """.format(conditions=conditions), values, as_dict=True)[0].total or 1

    data = frappe.db.sql("""
        SELECT
            sii.item_code,
            i.item_name,
            i.item_group,
            SUM(sii.qty) as total_qty,
            SUM(sii.amount) as total_amount,
            COUNT(DISTINCT si.name) as invoice_count,
            COUNT(DISTINCT si.customer) as customer_count
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {conditions} AND si.is_return = 0
        GROUP BY sii.item_code
        ORDER BY total_amount DESC
        LIMIT 20
    """.format(conditions=conditions), values, as_dict=True)

    for i, row in enumerate(data):
        row["rank"] = i + 1
        row["percentage"] = (flt(row["total_amount"]) / flt(total_sales)) * 100

    return columns, data


def get_low_selling(filters):
    columns = [
        {"fieldname": "rank", "label": _("#"), "fieldtype": "Int", "width": 50},
        {"fieldname": "item_code", "label": _("Item Code"), "fieldtype": "Link", "options": "Item", "width": 120},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 200},
        {"fieldname": "item_group", "label": _("Item Group"), "fieldtype": "Link", "options": "Item Group", "width": 120},
        {"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Float", "width": 100},
        {"fieldname": "total_amount", "label": _("Total Amount"), "fieldtype": "Currency", "width": 140},
        {"fieldname": "last_sale_date", "label": _("Last Sale"), "fieldtype": "Date", "width": 100},
        {"fieldname": "days_since_sale", "label": _("Days Since Sale"), "fieldtype": "Int", "width": 120}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            sii.item_code,
            i.item_name,
            i.item_group,
            SUM(sii.qty) as total_qty,
            SUM(sii.amount) as total_amount,
            MAX(si.posting_date) as last_sale_date
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {conditions} AND si.is_return = 0
        GROUP BY sii.item_code
        ORDER BY total_amount ASC
        LIMIT 20
    """.format(conditions=conditions), values, as_dict=True)

    today = frappe.utils.today()
    for i, row in enumerate(data):
        row["rank"] = i + 1
        if row["last_sale_date"]:
            row["days_since_sale"] = (frappe.utils.getdate(today) - frappe.utils.getdate(row["last_sale_date"])).days
        else:
            row["days_since_sale"] = 0

    return columns, data
