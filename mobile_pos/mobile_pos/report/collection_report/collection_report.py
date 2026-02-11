# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    if not filters:
        filters = {}

    report_view = filters.get("report_view", "Summary")

    if report_view == "Summary":
        return get_summary(filters)
    elif report_view == "By Customer":
        return get_by_customer(filters)
    elif report_view == "By Date":
        return get_by_date(filters)
    elif report_view == "By Mode of Payment":
        return get_by_mode(filters)
    elif report_view == "Detailed":
        return get_detailed(filters)
    else:
        return get_summary(filters)


def get_conditions(filters):
    conditions = ["pe.docstatus = 1", "pe.party_type = 'Customer'", "pe.payment_type = 'Receive'"]
    values = {}

    if filters.get("company"):
        conditions.append("pe.company = %(company)s")
        values["company"] = filters.get("company")

    if filters.get("from_date"):
        conditions.append("pe.posting_date >= %(from_date)s")
        values["from_date"] = filters.get("from_date")

    if filters.get("to_date"):
        conditions.append("pe.posting_date <= %(to_date)s")
        values["to_date"] = filters.get("to_date")

    if filters.get("mini_pos_profile"):
        conditions.append("pe.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("customer"):
        conditions.append("pe.party = %(customer)s")
        values["customer"] = filters.get("customer")

    if filters.get("mode_of_payment"):
        conditions.append("pe.mode_of_payment = %(mode_of_payment)s")
        values["mode_of_payment"] = filters.get("mode_of_payment")

    return " AND ".join(conditions), values


def get_summary(filters):
    columns = [
        {"fieldname": "label", "label": _("Description"), "fieldtype": "Data", "width": 250},
        {"fieldname": "count", "label": _("Count"), "fieldtype": "Int", "width": 100},
        {"fieldname": "amount", "label": _("Amount"), "fieldtype": "Currency", "width": 150}
    ]

    conditions, values = get_conditions(filters)

    # Get totals
    totals = frappe.db.sql("""
        SELECT
            COALESCE(SUM(pe.paid_amount), 0) as total_received,
            COUNT(*) as receive_count,
            COUNT(DISTINCT pe.party) as customer_count
        FROM `tabPayment Entry` pe
        WHERE {conditions}
    """.format(conditions=conditions), values, as_dict=True)[0]

    # Get mode breakdown
    mode_breakdown = frappe.db.sql("""
        SELECT
            pe.mode_of_payment,
            COALESCE(SUM(pe.paid_amount), 0) as amount
        FROM `tabPayment Entry` pe
        WHERE {conditions}
        GROUP BY pe.mode_of_payment
        ORDER BY amount DESC
    """.format(conditions=conditions), values, as_dict=True)

    data = [
        {"label": _("Total Collection / إجمالي التحصيل"), "count": totals.receive_count, "amount": totals.total_received},
        {"label": "", "count": "", "amount": ""},
        {"label": _("Number of Customers / عدد العملاء"), "count": totals.customer_count, "amount": ""},
        {"label": "", "count": "", "amount": ""},
        {"label": _("--- By Mode of Payment / حسب طريقة الدفع ---"), "count": "", "amount": ""}
    ]

    for mode in mode_breakdown:
        data.append({
            "label": mode.mode_of_payment,
            "count": "",
            "amount": mode.amount
        })

    return columns, data


def get_by_customer(filters):
    columns = [
        {"fieldname": "customer", "label": _("Customer"), "fieldtype": "Link", "options": "Customer", "width": 120},
        {"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 180},
        {"fieldname": "mini_pos_profile", "label": _("Profile"), "fieldtype": "Link", "options": "Mini POS Profile", "width": 120},
        {"fieldname": "payment_count", "label": _("Payments"), "fieldtype": "Int", "width": 90},
        {"fieldname": "total_collection", "label": _("Collection"), "fieldtype": "Currency", "width": 130},
        {"fieldname": "last_payment_date", "label": _("Last Payment"), "fieldtype": "Date", "width": 110}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            pe.party as customer,
            pe.party_name as customer_name,
            pe.custom_mini_pos_profile as mini_pos_profile,
            COUNT(*) as payment_count,
            COALESCE(SUM(pe.paid_amount), 0) as total_collection,
            MAX(pe.posting_date) as last_payment_date
        FROM `tabPayment Entry` pe
        WHERE {conditions}
        GROUP BY pe.party
        ORDER BY total_collection DESC
    """.format(conditions=conditions), values, as_dict=True)

    return columns, data


def get_by_date(filters):
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 110},
        {"fieldname": "payment_count", "label": _("Payments"), "fieldtype": "Int", "width": 90},
        {"fieldname": "customer_count", "label": _("Customers"), "fieldtype": "Int", "width": 100},
        {"fieldname": "total_collection", "label": _("Collection"), "fieldtype": "Currency", "width": 130},
        {"fieldname": "cash_amount", "label": _("Cash"), "fieldtype": "Currency", "width": 120},
        {"fieldname": "other_amount", "label": _("Other"), "fieldtype": "Currency", "width": 120}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            pe.posting_date,
            COUNT(*) as payment_count,
            COUNT(DISTINCT pe.party) as customer_count,
            COALESCE(SUM(pe.paid_amount), 0) as total_collection,
            COALESCE(SUM(CASE WHEN pe.mode_of_payment LIKE '%%Cash%%' OR pe.mode_of_payment LIKE '%%نقد%%' THEN pe.paid_amount ELSE 0 END), 0) as cash_amount
        FROM `tabPayment Entry` pe
        WHERE {conditions}
        GROUP BY pe.posting_date
        ORDER BY pe.posting_date DESC
    """.format(conditions=conditions), values, as_dict=True)

    for row in data:
        row["other_amount"] = flt(row["total_collection"]) - flt(row["cash_amount"])

    return columns, data


def get_by_mode(filters):
    columns = [
        {"fieldname": "mode_of_payment", "label": _("Mode of Payment"), "fieldtype": "Link", "options": "Mode of Payment", "width": 200},
        {"fieldname": "payment_count", "label": _("Payments"), "fieldtype": "Int", "width": 100},
        {"fieldname": "total_collection", "label": _("Collection"), "fieldtype": "Currency", "width": 140},
        {"fieldname": "percentage", "label": _("% of Total"), "fieldtype": "Percent", "width": 100}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            pe.mode_of_payment,
            COUNT(*) as payment_count,
            COALESCE(SUM(pe.paid_amount), 0) as total_collection
        FROM `tabPayment Entry` pe
        WHERE {conditions}
        GROUP BY pe.mode_of_payment
        ORDER BY total_collection DESC
    """.format(conditions=conditions), values, as_dict=True)

    total_all = sum(flt(d["total_collection"]) for d in data) or 1

    for row in data:
        row["percentage"] = (flt(row["total_collection"]) / total_all) * 100

    return columns, data


def get_detailed(filters):
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 100},
        {"fieldname": "name", "label": _("Payment Entry"), "fieldtype": "Link", "options": "Payment Entry", "width": 140},
        {"fieldname": "party", "label": _("Customer"), "fieldtype": "Link", "options": "Customer", "width": 120},
        {"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 150},
        {"fieldname": "mode_of_payment", "label": _("Mode"), "fieldtype": "Link", "options": "Mode of Payment", "width": 120},
        {"fieldname": "paid_amount", "label": _("Amount"), "fieldtype": "Currency", "width": 120},
        {"fieldname": "reference_no", "label": _("Reference"), "fieldtype": "Data", "width": 120},
        {"fieldname": "remarks", "label": _("Remarks"), "fieldtype": "Data", "width": 150}
    ]

    conditions, values = get_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            pe.posting_date,
            pe.name,
            pe.party,
            pe.party_name as customer_name,
            pe.mode_of_payment,
            pe.paid_amount,
            pe.reference_no,
            pe.remarks
        FROM `tabPayment Entry` pe
        WHERE {conditions}
        ORDER BY pe.posting_date DESC, pe.creation DESC
    """.format(conditions=conditions), values, as_dict=True)

    return columns, data
