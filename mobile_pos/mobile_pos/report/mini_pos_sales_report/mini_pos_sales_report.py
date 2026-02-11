# Copyright (c) 2024, Your Company and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    if not filters:
        filters = {}

    report_type = filters.get("report_type", "Sales Summary")

    if report_type == "Sales Summary":
        return get_sales_summary(filters)
    elif report_type == "Customer Orders":
        return get_customer_orders(filters)
    elif report_type == "Sales by Item":
        return get_sales_by_item(filters)
    elif report_type == "Sales by Customer":
        return get_sales_by_customer(filters)
    else:
        return get_sales_summary(filters)


def get_sales_summary(filters):
    """Get overall sales summary grouped by date"""
    columns = [
        {
            "fieldname": "posting_date",
            "label": _("Date"),
            "fieldtype": "Date",
            "width": 120
        },
        {
            "fieldname": "total_invoices",
            "label": _("Total Invoices"),
            "fieldtype": "Int",
            "width": 120
        },
        {
            "fieldname": "total_qty",
            "label": _("Total Qty"),
            "fieldtype": "Float",
            "width": 120
        },
        {
            "fieldname": "total_amount",
            "label": _("Total Amount"),
            "fieldtype": "Currency",
            "width": 150
        },
        {
            "fieldname": "warehouse",
            "label": _("Warehouse"),
            "fieldtype": "Link",
            "options": "Warehouse",
            "width": 150
        }
    ]

    conditions = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            si.posting_date,
            COUNT(DISTINCT si.name) AS total_invoices,
            SUM(sii.qty) AS total_qty,
            SUM(sii.amount) AS total_amount,
            sii.warehouse
        FROM `tabSales Invoice` si
        INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY si.posting_date, sii.warehouse
        ORDER BY si.posting_date DESC
    """.format(conditions=conditions), filters, as_dict=True)

    return columns, data


def get_customer_orders(filters):
    """Get customer orders (Sales Orders) summary"""
    columns = [
        {
            "fieldname": "delivery_date",
            "label": _("Delivery Date"),
            "fieldtype": "Date",
            "width": 120
        },
        {
            "fieldname": "customer",
            "label": _("Customer"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 180
        },
        {
            "fieldname": "customer_name",
            "label": _("Customer Name"),
            "fieldtype": "Data",
            "width": 180
        },
        {
            "fieldname": "item_code",
            "label": _("Item Code"),
            "fieldtype": "Link",
            "options": "Item",
            "width": 150
        },
        {
            "fieldname": "item_name",
            "label": _("Item Name"),
            "fieldtype": "Data",
            "width": 180
        },
        {
            "fieldname": "qty",
            "label": _("Qty"),
            "fieldtype": "Float",
            "width": 100
        },
        {
            "fieldname": "uom",
            "label": _("UOM"),
            "fieldtype": "Data",
            "width": 80
        },
        {
            "fieldname": "rate",
            "label": _("Rate"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "amount",
            "label": _("Amount"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "status",
            "label": _("Status"),
            "fieldtype": "Data",
            "width": 100
        }
    ]

    conditions = get_order_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            so.delivery_date,
            so.customer,
            so.customer_name,
            soi.item_code,
            soi.item_name,
            soi.qty,
            soi.uom,
            soi.rate,
            soi.amount,
            so.status
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
        INNER JOIN `tabCustomer` c ON c.name = so.customer
        WHERE so.docstatus IN (0, 1)
        {conditions}
        ORDER BY so.delivery_date DESC, so.customer
    """.format(conditions=conditions), filters, as_dict=True)

    return columns, data


def get_sales_by_item(filters):
    """Get sales grouped by item"""
    columns = [
        {
            "fieldname": "item_code",
            "label": _("Item Code"),
            "fieldtype": "Link",
            "options": "Item",
            "width": 150
        },
        {
            "fieldname": "item_name",
            "label": _("Item Name"),
            "fieldtype": "Data",
            "width": 200
        },
        {
            "fieldname": "total_qty",
            "label": _("Total Qty"),
            "fieldtype": "Float",
            "width": 120
        },
        {
            "fieldname": "uom",
            "label": _("UOM"),
            "fieldtype": "Data",
            "width": 80
        },
        {
            "fieldname": "total_amount",
            "label": _("Total Amount"),
            "fieldtype": "Currency",
            "width": 150
        },
        {
            "fieldname": "avg_rate",
            "label": _("Avg Rate"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "warehouse",
            "label": _("Warehouse"),
            "fieldtype": "Link",
            "options": "Warehouse",
            "width": 150
        }
    ]

    conditions = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            sii.item_code,
            sii.item_name,
            SUM(sii.qty) AS total_qty,
            sii.uom,
            SUM(sii.amount) AS total_amount,
            AVG(sii.rate) AS avg_rate,
            sii.warehouse
        FROM `tabSales Invoice` si
        INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY sii.item_code, sii.warehouse
        ORDER BY total_amount DESC
    """.format(conditions=conditions), filters, as_dict=True)

    return columns, data


def get_sales_by_customer(filters):
    """Get sales grouped by customer"""
    columns = [
        {
            "fieldname": "customer",
            "label": _("Customer"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 150
        },
        {
            "fieldname": "customer_name",
            "label": _("Customer Name"),
            "fieldtype": "Data",
            "width": 200
        },
        {
            "fieldname": "total_invoices",
            "label": _("Total Invoices"),
            "fieldtype": "Int",
            "width": 120
        },
        {
            "fieldname": "total_qty",
            "label": _("Total Qty"),
            "fieldtype": "Float",
            "width": 120
        },
        {
            "fieldname": "total_amount",
            "label": _("Total Amount"),
            "fieldtype": "Currency",
            "width": 150
        },
        {
            "fieldname": "mini_pos_profile",
            "label": _("Mini POS Profile"),
            "fieldtype": "Link",
            "options": "Mini POS Profile",
            "width": 150
        }
    ]

    conditions = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            si.customer,
            si.customer_name,
            COUNT(DISTINCT si.name) AS total_invoices,
            SUM(sii.qty) AS total_qty,
            SUM(sii.amount) AS total_amount,
            c.custom_mini_pos_profile AS mini_pos_profile
        FROM `tabSales Invoice` si
        INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY si.customer
        ORDER BY total_amount DESC
    """.format(conditions=conditions), filters, as_dict=True)

    return columns, data


def get_conditions(filters):
    """Build SQL conditions for Sales Invoice queries"""
    conditions = []

    if filters.get("company"):
        conditions.append("si.company = %(company)s")

    if filters.get("from_date"):
        conditions.append("si.posting_date >= %(from_date)s")

    if filters.get("to_date"):
        conditions.append("si.posting_date <= %(to_date)s")

    if filters.get("customer"):
        conditions.append("si.customer = %(customer)s")

    if filters.get("item_code"):
        conditions.append("sii.item_code = %(item_code)s")

    if filters.get("warehouse"):
        conditions.append("sii.warehouse = %(warehouse)s")

    if filters.get("mini_pos_profile"):
        conditions.append("""
            EXISTS (
                SELECT 1 FROM `tabCustomer` c2
                WHERE c2.name = si.customer
                AND c2.custom_mini_pos_profile = %(mini_pos_profile)s
            )
        """)

    return " AND " + " AND ".join(conditions) if conditions else ""


def get_order_conditions(filters):
    """Build SQL conditions for Sales Order queries"""
    conditions = []

    if filters.get("company"):
        conditions.append("so.company = %(company)s")

    if filters.get("from_date"):
        conditions.append("so.delivery_date >= %(from_date)s")

    if filters.get("to_date"):
        conditions.append("so.delivery_date <= %(to_date)s")

    if filters.get("customer"):
        conditions.append("so.customer = %(customer)s")

    if filters.get("item_code"):
        conditions.append("soi.item_code = %(item_code)s")

    if filters.get("mini_pos_profile"):
        conditions.append("c.custom_mini_pos_profile = %(mini_pos_profile)s")

    return " AND " + " AND ".join(conditions) if conditions else ""
