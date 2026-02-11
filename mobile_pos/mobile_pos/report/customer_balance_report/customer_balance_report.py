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
    return [
        {
            "fieldname": "customer",
            "label": _("Customer"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 200
        },
        {
            "fieldname": "mini_pos_profile",
            "label": _("Mini POS Profile"),
            "fieldtype": "Link",
            "options": "Mini POS Profile",
            "width": 130
        },
        {
            "fieldname": "total_invoiced",
            "label": _("Total Invoiced"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "total_paid",
            "label": _("Total Paid"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "total_returns",
            "label": _("Returns"),
            "fieldtype": "Currency",
            "width": 110
        },
        {
            "fieldname": "total_discounts",
            "label": _("Discounts"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "balance",
            "label": _("Balance"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "last_invoice_date",
            "label": _("Last Invoice"),
            "fieldtype": "Date",
            "width": 100
        },
        {
            "fieldname": "last_payment_date",
            "label": _("Last Payment"),
            "fieldtype": "Date",
            "width": 100
        },
        {
            "fieldname": "invoice_count",
            "label": _("Invoices"),
            "fieldtype": "Int",
            "width": 80
        }
    ]


def get_data(filters):
    conditions = []
    values = {}
    company = filters.get("company")

    if filters.get("mini_pos_profile"):
        conditions.append("c.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("customer"):
        conditions.append("c.name = %(customer)s")
        values["customer"] = filters.get("customer")

    if filters.get("customer_group"):
        conditions.append("c.customer_group = %(customer_group)s")
        values["customer_group"] = filters.get("customer_group")

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    date_filter_si = ""
    date_filter_gl = ""
    date_filter_pe = ""
    date_filter_je = ""

    if from_date:
        date_filter_si += f" AND posting_date >= '{from_date}'"
        date_filter_gl += f" AND posting_date >= '{from_date}'"
        date_filter_pe += f" AND posting_date >= '{from_date}'"
        date_filter_je += f" AND je.posting_date >= '{from_date}'"

    if to_date:
        date_filter_si += f" AND posting_date <= '{to_date}'"
        date_filter_gl += f" AND posting_date <= '{to_date}'"
        date_filter_pe += f" AND posting_date <= '{to_date}'"
        date_filter_je += f" AND je.posting_date <= '{to_date}'"

    where_clause = " AND " + " AND ".join(conditions) if conditions else ""
    company_filter_si = f"AND company = '{company}'" if company else ""
    company_filter_gl = f"AND company = '{company}'" if company else ""
    company_filter_pe = f"AND company = '{company}'" if company else ""
    company_filter_je = f"AND je.company = '{company}'" if company else ""

    # Get customer data with balance from GL Entry
    data = frappe.db.sql("""
        SELECT
            c.name as customer,
            c.custom_mini_pos_profile as mini_pos_profile,
            COALESCE((
                SELECT SUM(grand_total)
                FROM `tabSales Invoice`
                WHERE customer = c.name AND docstatus = 1 AND is_return = 0 {company_filter_si} {date_filter_si}
            ), 0) as total_invoiced,
            COALESCE((
                SELECT SUM(ABS(grand_total))
                FROM `tabSales Invoice`
                WHERE customer = c.name AND docstatus = 1 AND is_return = 1 {company_filter_si} {date_filter_si}
            ), 0) as total_returns,
            COALESCE((
                SELECT SUM(jea.credit_in_account_currency)
                FROM `tabJournal Entry Account` jea
                INNER JOIN `tabJournal Entry` je ON je.name = jea.parent
                WHERE jea.party_type = 'Customer' AND jea.party = c.name
                  AND je.docstatus = 1
                  AND jea.credit_in_account_currency > 0
                  {company_filter_je} {date_filter_je}
            ), 0) as total_discounts,
            COALESCE((
                SELECT SUM(debit) - SUM(credit)
                FROM `tabGL Entry`
                WHERE party_type = 'Customer' AND party = c.name AND docstatus = 1 {company_filter_gl} {date_filter_gl}
            ), 0) as balance,
            (
                SELECT MAX(posting_date)
                FROM `tabSales Invoice`
                WHERE customer = c.name AND docstatus = 1 AND is_return = 0 {company_filter_si} {date_filter_si}
            ) as last_invoice_date,
            (
                SELECT MAX(posting_date)
                FROM `tabPayment Entry`
                WHERE party_type = 'Customer' AND party = c.name AND docstatus = 1 {company_filter_pe} {date_filter_pe}
            ) as last_payment_date,
            (
                SELECT COUNT(*)
                FROM `tabSales Invoice`
                WHERE customer = c.name AND docstatus = 1 AND is_return = 0 {company_filter_si} {date_filter_si}
            ) as invoice_count
        FROM `tabCustomer` c
        WHERE c.disabled = 0
        {where_clause}
        ORDER BY balance DESC
    """.format(
        company_filter_si=company_filter_si,
        company_filter_gl=company_filter_gl,
        company_filter_pe=company_filter_pe,
        company_filter_je=company_filter_je,
        date_filter_si=date_filter_si,
        date_filter_gl=date_filter_gl,
        date_filter_pe=date_filter_pe,
        date_filter_je=date_filter_je,
        where_clause=where_clause
    ), values, as_dict=True)

    # Calculate total paid
    for row in data:
        row["total_paid"] = flt(row["total_invoiced"]) - flt(row["total_returns"]) - flt(row["balance"])

    # Apply balance type filter
    balance_type = filters.get("balance_type", "All")
    min_balance = flt(filters.get("min_balance", 0))

    if balance_type == "With Balance Only":
        data = [d for d in data if flt(d["balance"]) != 0]
    elif balance_type == "Credit Balance":
        data = [d for d in data if flt(d["balance"]) < 0]
    elif balance_type == "Debit Balance":
        data = [d for d in data if flt(d["balance"]) > 0]

    if min_balance:
        data = [d for d in data if abs(flt(d["balance"])) >= min_balance]

    return data
