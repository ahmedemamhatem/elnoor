# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    if not filters:
        filters = {}

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():
    """Define report columns"""
    return [
        {
            "fieldname": "mode_of_payment",
            "label": _("Mode of Payment"),
            "fieldtype": "Link",
            "options": "Mode of Payment",
            "width": 180
        },
        {
            "fieldname": "mini_pos_profile",
            "label": _("Mini POS Profile"),
            "fieldtype": "Link",
            "options": "Mini POS Profile",
            "width": 180
        },
        {
            "fieldname": "total_received",
            "label": _("Total Received"),
            "fieldtype": "Currency",
            "width": 150
        },
        {
            "fieldname": "total_paid",
            "label": _("Total Paid"),
            "fieldtype": "Currency",
            "width": 150
        },
        {
            "fieldname": "balance",
            "label": _("Balance"),
            "fieldtype": "Currency",
            "width": 150
        },
        {
            "fieldname": "transaction_count",
            "label": _("Transaction Count"),
            "fieldtype": "Int",
            "width": 130
        }
    ]


def get_data(filters):
    """Get mode of payment balance data"""
    conditions = []
    values = {}

    # Filter by Company
    if filters.get("company"):
        conditions.append("pe.company = %(company)s")
        values["company"] = filters.get("company")

    # Filter by Mini POS Profile
    if filters.get("mini_pos_profile"):
        conditions.append("mop.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    # Filter by Mode of Payment
    if filters.get("mode_of_payment"):
        conditions.append("pe.mode_of_payment = %(mode_of_payment)s")
        values["mode_of_payment"] = filters.get("mode_of_payment")

    # Date filters
    if filters.get("from_date"):
        conditions.append("pe.posting_date >= %(from_date)s")
        values["from_date"] = filters.get("from_date")

    if filters.get("to_date"):
        conditions.append("pe.posting_date <= %(to_date)s")
        values["to_date"] = filters.get("to_date")

    where_clause = " AND " + " AND ".join(conditions) if conditions else ""

    # Query Payment Entry data grouped by Mode of Payment and Mini POS Profile
    data = frappe.db.sql("""
        SELECT
            pe.mode_of_payment,
            mop.custom_mini_pos_profile as mini_pos_profile,
            SUM(CASE WHEN pe.payment_type = 'Receive' THEN pe.paid_amount ELSE 0 END) as total_received,
            SUM(CASE WHEN pe.payment_type = 'Pay' THEN pe.paid_amount ELSE 0 END) as total_paid,
            SUM(CASE
                WHEN pe.payment_type = 'Receive' THEN pe.paid_amount
                WHEN pe.payment_type = 'Pay' THEN -pe.paid_amount
                ELSE 0
            END) as balance,
            COUNT(pe.name) as transaction_count
        FROM `tabPayment Entry` pe
        LEFT JOIN `tabMode of Payment` mop ON mop.name = pe.mode_of_payment
        WHERE pe.docstatus = 1
        {where_clause}
        GROUP BY pe.mode_of_payment, mop.custom_mini_pos_profile
        ORDER BY mop.custom_mini_pos_profile, pe.mode_of_payment
    """.format(where_clause=where_clause), values, as_dict=True)

    # Also include Sales Invoice payments (if paid via mode of payment)
    si_data = frappe.db.sql("""
        SELECT
            sip.mode_of_payment,
            mop.custom_mini_pos_profile as mini_pos_profile,
            SUM(sip.amount) as total_received,
            0 as total_paid,
            SUM(sip.amount) as balance,
            COUNT(DISTINCT si.name) as transaction_count
        FROM `tabSales Invoice Payment` sip
        INNER JOIN `tabSales Invoice` si ON si.name = sip.parent
        LEFT JOIN `tabMode of Payment` mop ON mop.name = sip.mode_of_payment
        WHERE si.docstatus = 1
        AND si.is_pos = 1
        {where_clause_si}
        GROUP BY sip.mode_of_payment, mop.custom_mini_pos_profile
        ORDER BY mop.custom_mini_pos_profile, sip.mode_of_payment
    """.format(where_clause_si=get_si_where_clause(filters)), get_si_values(filters), as_dict=True)

    # Merge Payment Entry and Sales Invoice data
    merged_data = {}

    for row in data:
        key = (row.mode_of_payment, row.mini_pos_profile)
        merged_data[key] = row

    for row in si_data:
        key = (row.mode_of_payment, row.mini_pos_profile)
        if key in merged_data:
            merged_data[key]["total_received"] = flt(merged_data[key]["total_received"]) + flt(row.total_received)
            merged_data[key]["balance"] = flt(merged_data[key]["balance"]) + flt(row.balance)
            merged_data[key]["transaction_count"] = int(merged_data[key]["transaction_count"]) + int(row.transaction_count)
        else:
            merged_data[key] = row

    return list(merged_data.values())


def get_si_where_clause(filters):
    """Build WHERE clause for Sales Invoice query"""
    conditions = []

    if filters.get("mini_pos_profile"):
        conditions.append("mop.custom_mini_pos_profile = %(mini_pos_profile)s")

    if filters.get("mode_of_payment"):
        conditions.append("sip.mode_of_payment = %(mode_of_payment)s")

    if filters.get("from_date"):
        conditions.append("si.posting_date >= %(from_date)s")

    if filters.get("to_date"):
        conditions.append("si.posting_date <= %(to_date)s")

    return " AND " + " AND ".join(conditions) if conditions else ""


def get_si_values(filters):
    """Get filter values for Sales Invoice query"""
    values = {}

    if filters.get("mini_pos_profile"):
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("mode_of_payment"):
        values["mode_of_payment"] = filters.get("mode_of_payment")

    if filters.get("from_date"):
        values["from_date"] = filters.get("from_date")

    if filters.get("to_date"):
        values["to_date"] = filters.get("to_date")

    return values
