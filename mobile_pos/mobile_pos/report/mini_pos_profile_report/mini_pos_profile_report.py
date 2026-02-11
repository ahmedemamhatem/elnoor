# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate, formatdate


def execute(filters=None):
    if not filters:
        filters = {}

    report_view = filters.get("report_view", "Summary")

    if report_view == "Summary":
        return get_summary_report(filters)
    elif report_view == "Sales Invoices":
        return get_sales_invoices_report(filters)
    elif report_view == "Payment Entries":
        return get_payment_entries_report(filters)
    elif report_view == "Expense Entries":
        return get_expense_entries_report(filters)
    elif report_view == "All Transactions":
        return get_all_transactions_report(filters)
    else:
        return get_summary_report(filters)


def get_summary_report(filters):
    """Get comprehensive summary of all transactions for the Mini POS Profile"""

    # If no Mini POS Profile selected, show all profiles side by side
    if not filters.get("mini_pos_profile"):
        return get_all_profiles_summary(filters)

    # Single profile summary
    columns = [
        {"fieldname": "label", "label": _("Description"), "fieldtype": "Data", "width": 450},
        {"fieldname": "count", "label": _("Count"), "fieldtype": "Int", "width": 120},
        {"fieldname": "amount", "label": _("Amount"), "fieldtype": "Currency", "width": 180}
    ]

    data = []

    # --- Sales Invoices Summary ---
    si_conditions, si_values = get_sales_invoice_conditions(filters)

    sales_data = frappe.db.sql("""
        SELECT
            COUNT(*) as invoice_count,
            COALESCE(SUM(si.grand_total), 0) as total_sales,
            COALESCE(SUM(si.outstanding_amount), 0) as total_outstanding
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 0
        {conditions}
    """.format(conditions=si_conditions), si_values, as_dict=True)[0]

    returns_data = frappe.db.sql("""
        SELECT
            COUNT(*) as return_count,
            COALESCE(SUM(ABS(si.grand_total)), 0) as total_returns
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 1
        {conditions}
    """.format(conditions=si_conditions), si_values, as_dict=True)[0]

    net_sales = flt(sales_data.total_sales) - flt(returns_data.total_returns)

    # --- Payment Entries Summary ---
    pe_conditions, pe_values = get_payment_entry_conditions(filters)

    # Received payments
    received_data = frappe.db.sql("""
        SELECT
            COUNT(*) as count,
            COALESCE(SUM(pe.paid_amount), 0) as amount
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        AND pe.payment_type = 'Receive'
        {conditions}
    """.format(conditions=pe_conditions), pe_values, as_dict=True)[0]

    # Paid payments (outgoing)
    paid_out_data = frappe.db.sql("""
        SELECT
            COUNT(*) as count,
            COALESCE(SUM(pe.paid_amount), 0) as amount
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        AND pe.payment_type = 'Pay'
        {conditions}
    """.format(conditions=pe_conditions), pe_values, as_dict=True)[0]

    # Calculate outstanding as: Total Invoices - Total Payments Received
    total_outstanding = flt(sales_data.total_sales) - flt(received_data.amount)

    data.append({"label": _("=== SALES INVOICES / فواتير المبيعات ==="), "count": "", "amount": ""})
    data.append({"label": _("Total Invoices / إجمالي الفواتير"), "count": sales_data.invoice_count, "amount": sales_data.total_sales})
    data.append({"label": _("Total Outstanding / إجمالي المستحق"), "count": "", "amount": total_outstanding})
    data.append({"label": _("Returns / المرتجعات"), "count": returns_data.return_count, "amount": -returns_data.total_returns})
    data.append({"label": _("Net Sales / صافي المبيعات"), "count": "", "amount": net_sales})
    data.append({"label": "", "count": "", "amount": ""})

    data.append({"label": _("=== PAYMENT ENTRIES / قيود الدفع ==="), "count": "", "amount": ""})
    data.append({"label": _("Received Payments / المدفوعات المستلمة"), "count": received_data.count, "amount": received_data.amount})
    data.append({"label": _("Paid Out / المدفوعات الصادرة"), "count": paid_out_data.count, "amount": -paid_out_data.amount})
    data.append({"label": _("Net Payment / صافي الدفع"), "count": "", "amount": flt(received_data.amount) - flt(paid_out_data.amount)})
    data.append({"label": "", "count": "", "amount": ""})

    # Payment breakdown by mode
    payment_breakdown = frappe.db.sql("""
        SELECT
            pe.mode_of_payment,
            COALESCE(SUM(CASE WHEN pe.payment_type = 'Receive' THEN pe.paid_amount ELSE 0 END), 0) as received,
            COALESCE(SUM(CASE WHEN pe.payment_type = 'Pay' THEN pe.paid_amount ELSE 0 END), 0) as paid_out
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        {conditions}
        GROUP BY pe.mode_of_payment
        ORDER BY received DESC
    """.format(conditions=pe_conditions), pe_values, as_dict=True)

    if payment_breakdown:
        data.append({"label": _("--- Payment Breakdown by Mode / تفصيل طرق الدفع ---"), "count": "", "amount": ""})
        for payment in payment_breakdown:
            net = flt(payment.received) - flt(payment.paid_out)
            data.append({"label": f"  {payment.mode_of_payment}", "count": "", "amount": net})
        data.append({"label": "", "count": "", "amount": ""})

    # --- Expense Entries Summary ---
    exp_conditions, exp_values = get_expense_entry_conditions(filters)

    expense_data = frappe.db.sql("""
        SELECT
            COUNT(*) as count,
            COALESCE(SUM(ee.amount), 0) as amount
        FROM `tabExpense Entry` ee
        WHERE ee.docstatus = 1
        {conditions}
    """.format(conditions=exp_conditions), exp_values, as_dict=True)[0]

    # Expense breakdown by type
    expense_breakdown = frappe.db.sql("""
        SELECT
            ee.expense,
            COUNT(*) as count,
            COALESCE(SUM(ee.amount), 0) as amount
        FROM `tabExpense Entry` ee
        WHERE ee.docstatus = 1
        {conditions}
        GROUP BY ee.expense
        ORDER BY amount DESC
    """.format(conditions=exp_conditions), exp_values, as_dict=True)

    data.append({"label": _("=== EXPENSE ENTRIES / قيود المصروفات ==="), "count": "", "amount": ""})
    data.append({"label": _("Total Expenses / إجمالي المصروفات"), "count": expense_data.count, "amount": -expense_data.amount})

    if expense_breakdown:
        data.append({"label": _("--- Expense Breakdown / تفصيل المصروفات ---"), "count": "", "amount": ""})
        for exp in expense_breakdown:
            data.append({"label": f"  {exp.expense}", "count": exp.count, "amount": -exp.amount})
    data.append({"label": "", "count": "", "amount": ""})

    # --- Get Cost of Goods Sold (Valuation) from invoices ---
    cogs_data = frappe.db.sql("""
        SELECT
            COALESCE(SUM(sii.qty * sii.incoming_rate), 0) as total_cost,
            COALESCE(SUM(sii.qty * sii.rate), 0) as total_revenue
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
        AND si.is_return = 0
        {conditions}
    """.format(conditions=si_conditions), si_values, as_dict=True)[0]

    # Get returns cost
    returns_cogs = frappe.db.sql("""
        SELECT
            COALESCE(SUM(ABS(sii.qty) * sii.incoming_rate), 0) as total_cost,
            COALESCE(SUM(ABS(sii.qty) * sii.rate), 0) as total_revenue
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
        AND si.is_return = 1
        {conditions}
    """.format(conditions=si_conditions), si_values, as_dict=True)[0]

    total_cogs = flt(cogs_data.total_cost) - flt(returns_cogs.total_cost)
    gross_profit = flt(net_sales) - total_cogs
    net_profit_actual = gross_profit - flt(expense_data.amount)

    # --- Overall Summary ---
    total_income = flt(net_sales)
    total_expense = flt(expense_data.amount)
    daily_income = total_income - total_expense

    data.append({"label": _("=== DAILY INCOME / الدخل اليومي ==="), "count": "", "amount": ""})
    data.append({"label": _("Net Sales / صافي المبيعات"), "count": "", "amount": total_income})
    data.append({"label": _("Total Expenses / إجمالي المصروفات"), "count": "", "amount": -total_expense})
    data.append({"label": _("Daily Income / الدخل اليومي"), "count": "", "amount": daily_income})
    data.append({"label": "", "count": "", "amount": ""})

    data.append({"label": _("=== NET PROFIT / صافي الربح ==="), "count": "", "amount": ""})
    data.append({"label": _("Total Revenue / إجمالي الإيرادات"), "count": "", "amount": total_income})
    data.append({"label": _("Cost of Goods Sold / تكلفة البضاعة المباعة"), "count": "", "amount": -total_cogs})
    data.append({"label": _("Gross Profit / إجمالي الربح"), "count": "", "amount": gross_profit})
    data.append({"label": _("Operating Expenses / مصروفات التشغيل"), "count": "", "amount": -total_expense})
    data.append({"label": _("Net Profit / صافي الربح"), "count": "", "amount": net_profit_actual})
    data.append({"label": "", "count": "", "amount": ""})

    data.append({"label": _("=== CASH BALANCE / رصيد النقدية ==="), "count": "", "amount": ""})
    data.append({"label": _("Cash Balance (Received - Paid - Expenses)"), "count": "", "amount": flt(received_data.amount) - flt(paid_out_data.amount) - flt(expense_data.amount)})

    return columns, data


def get_all_profiles_summary(filters):
    """Get summary for all Mini POS Profiles side by side - Optimized version"""

    # Get all active Mini POS Profiles
    company_filter = ""
    company_values = {}
    if filters.get("company"):
        company_filter = "AND company = %(company)s"
        company_values["company"] = filters.get("company")

    profiles = frappe.db.sql("""
        SELECT name, full_name
        FROM `tabMini POS Profile`
        WHERE disabled = 0 {company_filter}
        ORDER BY name
    """.format(company_filter=company_filter), company_values, as_dict=True)

    if not profiles:
        return [{"fieldname": "label", "label": _("Description"), "fieldtype": "Data", "width": 400}], []

    # Build columns - Description + one column per profile
    columns = [
        {"fieldname": "label", "label": _("Description"), "fieldtype": "Data", "width": 450}
    ]

    for profile in profiles:
        columns.append({
            "fieldname": profile.name,
            "label": profile.full_name or profile.name,
            "fieldtype": "Currency",
            "width": 180
        })

    # Add Total column
    columns.append({
        "fieldname": "total",
        "label": _("Total"),
        "fieldtype": "Currency",
        "width": 180
    })

    # Get date conditions
    date_conditions_si = ""
    date_conditions_pe = ""
    date_conditions_exp = ""
    date_values = {}

    if filters.get("company"):
        date_conditions_si = " AND si.company = %(company)s"
        date_conditions_pe = " AND pe.company = %(company)s"
        date_conditions_exp = " AND ee.company = %(company)s"
        date_values["company"] = filters.get("company")

    if filters.get("from_date"):
        date_conditions_si += " AND si.posting_date >= %(from_date)s"
        date_conditions_pe += " AND pe.posting_date >= %(from_date)s"
        date_conditions_exp += " AND ee.posting_date >= %(from_date)s"
        date_values["from_date"] = filters.get("from_date")

    if filters.get("to_date"):
        date_conditions_si += " AND si.posting_date <= %(to_date)s"
        date_conditions_pe += " AND pe.posting_date <= %(to_date)s"
        date_conditions_exp += " AND ee.posting_date <= %(to_date)s"
        date_values["to_date"] = filters.get("to_date")

    # Fetch all data in bulk queries instead of per-profile queries
    # Sales data by profile
    sales_by_profile = {}
    sales_data = frappe.db.sql("""
        SELECT
            si.custom_mini_pos_profile as profile,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.grand_total ELSE 0 END), 0) as total_sales,
            COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(si.grand_total) ELSE 0 END), 0) as total_returns
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY si.custom_mini_pos_profile
    """.format(conditions=date_conditions_si), date_values, as_dict=True)

    for row in sales_data:
        sales_by_profile[row.profile] = row

    # COGS data by profile
    cogs_by_profile = {}
    cogs_data = frappe.db.sql("""
        SELECT
            si.custom_mini_pos_profile as profile,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN sii.qty * sii.incoming_rate ELSE 0 END), 0) as cogs,
            COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(sii.qty) * sii.incoming_rate ELSE 0 END), 0) as returns_cogs
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY si.custom_mini_pos_profile
    """.format(conditions=date_conditions_si), date_values, as_dict=True)

    for row in cogs_data:
        cogs_by_profile[row.profile] = row

    # Payments data by profile
    payments_by_profile = {}
    payments_data = frappe.db.sql("""
        SELECT
            pe.custom_mini_pos_profile as profile,
            COALESCE(SUM(CASE WHEN pe.payment_type = 'Receive' THEN pe.paid_amount ELSE 0 END), 0) as received,
            COALESCE(SUM(CASE WHEN pe.payment_type = 'Pay' THEN pe.paid_amount ELSE 0 END), 0) as paid_out
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        {conditions}
        GROUP BY pe.custom_mini_pos_profile
    """.format(conditions=date_conditions_pe), date_values, as_dict=True)

    for row in payments_data:
        payments_by_profile[row.profile] = row

    # Expenses data by profile
    expenses_by_profile = {}
    expenses_data = frappe.db.sql("""
        SELECT
            ee.mini_pos_profile as profile,
            COALESCE(SUM(ee.amount), 0) as amount
        FROM `tabExpense Entry` ee
        WHERE ee.docstatus = 1
        {conditions}
        GROUP BY ee.mini_pos_profile
    """.format(conditions=date_conditions_exp), date_values, as_dict=True)

    for row in expenses_data:
        expenses_by_profile[row.profile] = row

    data = []

    # --- SALES INVOICES SECTION ---
    data.append({"label": _("=== SALES INVOICES / فواتير المبيعات ===")})

    # Total Invoices
    row = {"label": _("Total Invoices / إجمالي الفواتير")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        amount = flt(sales.get("total_sales", 0))
        row[profile.name] = amount
        total += amount
    row["total"] = total
    data.append(row)

    # Total Outstanding (Invoices - Payments Received)
    row = {"label": _("Total Outstanding / إجمالي المستحق")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        payments = payments_by_profile.get(profile.name, {})
        outstanding = flt(sales.get("total_sales", 0)) - flt(payments.get("received", 0))
        row[profile.name] = outstanding
        total += outstanding
    row["total"] = total
    data.append(row)

    # Returns
    row = {"label": _("Returns / المرتجعات")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        amount = flt(sales.get("total_returns", 0))
        row[profile.name] = -amount
        total += amount
    row["total"] = -total
    data.append(row)

    # Net Sales
    row = {"label": _("Net Sales / صافي المبيعات")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        net = flt(sales.get("total_sales", 0)) - flt(sales.get("total_returns", 0))
        row[profile.name] = net
        total += net
    row["total"] = total
    data.append(row)

    data.append({"label": ""})

    # --- PAYMENT ENTRIES SECTION ---
    data.append({"label": _("=== PAYMENT ENTRIES / قيود الدفع ===")})

    # Received Payments
    row = {"label": _("Received Payments / المدفوعات المستلمة")}
    total = 0
    for profile in profiles:
        payments = payments_by_profile.get(profile.name, {})
        amount = flt(payments.get("received", 0))
        row[profile.name] = amount
        total += amount
    row["total"] = total
    data.append(row)

    # Paid Out
    row = {"label": _("Paid Out / المدفوعات الصادرة")}
    total = 0
    for profile in profiles:
        payments = payments_by_profile.get(profile.name, {})
        amount = flt(payments.get("paid_out", 0))
        row[profile.name] = -amount
        total += amount
    row["total"] = -total
    data.append(row)

    # Net Payment
    row = {"label": _("Net Payment / صافي الدفع")}
    total = 0
    for profile in profiles:
        payments = payments_by_profile.get(profile.name, {})
        net = flt(payments.get("received", 0)) - flt(payments.get("paid_out", 0))
        row[profile.name] = net
        total += net
    row["total"] = total
    data.append(row)

    data.append({"label": ""})

    # --- EXPENSE ENTRIES SECTION ---
    data.append({"label": _("=== EXPENSE ENTRIES / قيود المصروفات ===")})

    # Total Expenses
    row = {"label": _("Total Expenses / إجمالي المصروفات")}
    total = 0
    for profile in profiles:
        expenses = expenses_by_profile.get(profile.name, {})
        amount = flt(expenses.get("amount", 0))
        row[profile.name] = -amount
        total += amount
    row["total"] = -total
    data.append(row)

    data.append({"label": ""})

    # --- OVERALL SUMMARY SECTION ---
    data.append({"label": _("=== OVERALL SUMMARY / الملخص العام ===")})

    # Net Sales Income
    row = {"label": _("Net Sales Income / صافي دخل المبيعات")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        net = flt(sales.get("total_sales", 0)) - flt(sales.get("total_returns", 0))
        row[profile.name] = net
        total += net
    row["total"] = total
    data.append(row)

    # Total Expenses (negative)
    row = {"label": _("Total Expenses / إجمالي المصروفات")}
    total = 0
    for profile in profiles:
        expenses = expenses_by_profile.get(profile.name, {})
        amount = flt(expenses.get("amount", 0))
        row[profile.name] = -amount
        total += amount
    row["total"] = -total
    data.append(row)

    # Daily Income (Net Sales - Expenses)
    row = {"label": _("Daily Income / الدخل اليومي")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        expenses = expenses_by_profile.get(profile.name, {})
        net_sales_val = flt(sales.get("total_sales", 0)) - flt(sales.get("total_returns", 0))
        daily_income = net_sales_val - flt(expenses.get("amount", 0))
        row[profile.name] = daily_income
        total += daily_income
    row["total"] = total
    data.append(row)

    data.append({"label": ""})

    # --- NET PROFIT SECTION ---
    data.append({"label": _("=== NET PROFIT / صافي الربح ===")})

    # Cost of Goods Sold
    row = {"label": _("Cost of Goods Sold / تكلفة البضاعة المباعة")}
    total = 0
    for profile in profiles:
        cogs = cogs_by_profile.get(profile.name, {})
        total_cogs = flt(cogs.get("cogs", 0)) - flt(cogs.get("returns_cogs", 0))
        row[profile.name] = -total_cogs
        total += total_cogs
    row["total"] = -total
    data.append(row)

    # Gross Profit
    row = {"label": _("Gross Profit / إجمالي الربح")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        cogs = cogs_by_profile.get(profile.name, {})
        net_sales_val = flt(sales.get("total_sales", 0)) - flt(sales.get("total_returns", 0))
        total_cogs = flt(cogs.get("cogs", 0)) - flt(cogs.get("returns_cogs", 0))
        gross_profit = net_sales_val - total_cogs
        row[profile.name] = gross_profit
        total += gross_profit
    row["total"] = total
    data.append(row)

    # Net Profit (Gross Profit - Expenses)
    row = {"label": _("Net Profit / صافي الربح")}
    total = 0
    for profile in profiles:
        sales = sales_by_profile.get(profile.name, {})
        cogs = cogs_by_profile.get(profile.name, {})
        expenses = expenses_by_profile.get(profile.name, {})
        net_sales_val = flt(sales.get("total_sales", 0)) - flt(sales.get("total_returns", 0))
        total_cogs = flt(cogs.get("cogs", 0)) - flt(cogs.get("returns_cogs", 0))
        gross_profit = net_sales_val - total_cogs
        net_profit = gross_profit - flt(expenses.get("amount", 0))
        row[profile.name] = net_profit
        total += net_profit
    row["total"] = total
    data.append(row)

    data.append({"label": ""})

    # --- CASH BALANCE SECTION ---
    data.append({"label": _("=== CASH BALANCE / رصيد النقدية ===")})

    # Cash Balance
    row = {"label": _("Cash Balance (Received - Paid - Expenses)")}
    total = 0
    for profile in profiles:
        payments = payments_by_profile.get(profile.name, {})
        expenses = expenses_by_profile.get(profile.name, {})
        cash_balance = flt(payments.get("received", 0)) - flt(payments.get("paid_out", 0)) - flt(expenses.get("amount", 0))
        row[profile.name] = cash_balance
        total += cash_balance
    row["total"] = total
    data.append(row)

    return columns, data


def get_sales_invoices_report(filters):
    """Get detailed Sales Invoices for the Mini POS Profile"""
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 120},
        {"fieldname": "name", "label": _("Invoice"), "fieldtype": "Link", "options": "Sales Invoice", "width": 160},
        {"fieldname": "customer", "label": _("Customer"), "fieldtype": "Link", "options": "Customer", "width": 150},
        {"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 180},
        {"fieldname": "mini_pos_profile", "label": _("POS Profile"), "fieldtype": "Link", "options": "Mini POS Profile", "width": 130},
        {"fieldname": "is_return", "label": _("Return"), "fieldtype": "Check", "width": 80},
        {"fieldname": "total_qty", "label": _("Qty"), "fieldtype": "Float", "width": 90},
        {"fieldname": "grand_total", "label": _("Grand Total"), "fieldtype": "Currency", "width": 150},
        {"fieldname": "paid_amount", "label": _("Paid"), "fieldtype": "Currency", "width": 130},
        {"fieldname": "outstanding_amount", "label": _("Outstanding"), "fieldtype": "Currency", "width": 130},
        {"fieldname": "status", "label": _("Status"), "fieldtype": "Data", "width": 110}
    ]

    conditions, values = get_sales_invoice_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            si.posting_date,
            si.name,
            si.customer,
            si.customer_name,
            si.custom_mini_pos_profile as mini_pos_profile,
            si.is_return,
            (SELECT COALESCE(SUM(qty), 0) FROM `tabSales Invoice Item` WHERE parent = si.name) as total_qty,
            si.grand_total,
            si.base_paid_amount as paid_amount,
            si.outstanding_amount,
            si.status
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        {conditions}
        ORDER BY si.posting_date DESC, si.creation DESC
    """.format(conditions=conditions), values, as_dict=True)

    return columns, data


def get_payment_entries_report(filters):
    """Get detailed Payment Entries for the Mini POS Profile"""
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 120},
        {"fieldname": "name", "label": _("Payment Entry"), "fieldtype": "Link", "options": "Payment Entry", "width": 170},
        {"fieldname": "payment_type", "label": _("Type"), "fieldtype": "Data", "width": 100},
        {"fieldname": "mini_pos_profile", "label": _("POS Profile"), "fieldtype": "Link", "options": "Mini POS Profile", "width": 130},
        {"fieldname": "party_type", "label": _("Party Type"), "fieldtype": "Data", "width": 110},
        {"fieldname": "party", "label": _("Party"), "fieldtype": "Dynamic Link", "options": "party_type", "width": 150},
        {"fieldname": "party_name", "label": _("Party Name"), "fieldtype": "Data", "width": 180},
        {"fieldname": "mode_of_payment", "label": _("Mode of Payment"), "fieldtype": "Link", "options": "Mode of Payment", "width": 150},
        {"fieldname": "paid_amount", "label": _("Amount"), "fieldtype": "Currency", "width": 150},
        {"fieldname": "unallocated_amount", "label": _("Unallocated"), "fieldtype": "Currency", "width": 130},
        {"fieldname": "reference_no", "label": _("Reference"), "fieldtype": "Data", "width": 130}
    ]

    conditions, values = get_payment_entry_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            pe.posting_date,
            pe.name,
            pe.payment_type,
            pe.custom_mini_pos_profile as mini_pos_profile,
            pe.party_type,
            pe.party,
            pe.party_name,
            pe.mode_of_payment,
            pe.paid_amount,
            pe.unallocated_amount,
            pe.reference_no
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        {conditions}
        ORDER BY pe.posting_date DESC, pe.creation DESC
    """.format(conditions=conditions), values, as_dict=True)

    return columns, data


def get_expense_entries_report(filters):
    """Get detailed Expense Entries for the Mini POS Profile"""
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 120},
        {"fieldname": "name", "label": _("Expense Entry"), "fieldtype": "Link", "options": "Expense Entry", "width": 170},
        {"fieldname": "mini_pos_profile", "label": _("POS Profile"), "fieldtype": "Link", "options": "Mini POS Profile", "width": 130},
        {"fieldname": "expense", "label": _("Expense Type"), "fieldtype": "Link", "options": "Expense", "width": 180},
        {"fieldname": "expense_account", "label": _("Expense Account"), "fieldtype": "Link", "options": "Account", "width": 220},
        {"fieldname": "mode_of_payment", "label": _("Mode of Payment"), "fieldtype": "Link", "options": "Mode of Payment", "width": 150},
        {"fieldname": "amount", "label": _("Amount"), "fieldtype": "Currency", "width": 150},
        {"fieldname": "journal_entry", "label": _("Journal Entry"), "fieldtype": "Link", "options": "Journal Entry", "width": 170},
        {"fieldname": "remarks", "label": _("Remarks"), "fieldtype": "Data", "width": 250}
    ]

    conditions, values = get_expense_entry_conditions(filters)

    data = frappe.db.sql("""
        SELECT
            ee.posting_date,
            ee.name,
            ee.mini_pos_profile,
            ee.expense,
            ee.expense_account,
            ee.mode_of_payment,
            ee.amount,
            ee.journal_entry,
            ee.remarks
        FROM `tabExpense Entry` ee
        WHERE ee.docstatus = 1
        {conditions}
        ORDER BY ee.posting_date DESC, ee.creation DESC
    """.format(conditions=conditions), values, as_dict=True)

    return columns, data


def get_all_transactions_report(filters):
    """Get all transactions in a unified view"""
    columns = [
        {"fieldname": "posting_date", "label": _("Date"), "fieldtype": "Date", "width": 120},
        {"fieldname": "transaction_type", "label": _("Type"), "fieldtype": "Data", "width": 140},
        {"fieldname": "voucher_no", "label": _("Voucher No"), "fieldtype": "Dynamic Link", "options": "transaction_type", "width": 180},
        {"fieldname": "mini_pos_profile", "label": _("POS Profile"), "fieldtype": "Link", "options": "Mini POS Profile", "width": 130},
        {"fieldname": "party", "label": _("Party"), "fieldtype": "Data", "width": 180},
        {"fieldname": "description", "label": _("Description"), "fieldtype": "Data", "width": 250},
        {"fieldname": "debit", "label": _("Debit / Income"), "fieldtype": "Currency", "width": 150},
        {"fieldname": "credit", "label": _("Credit / Expense"), "fieldtype": "Currency", "width": 150},
        {"fieldname": "balance", "label": _("Running Balance"), "fieldtype": "Currency", "width": 150}
    ]

    data = []

    # Get Sales Invoices
    si_conditions, si_values = get_sales_invoice_conditions(filters)
    sales_invoices = frappe.db.sql("""
        SELECT
            si.posting_date,
            'Sales Invoice' as transaction_type,
            si.name as voucher_no,
            si.custom_mini_pos_profile as mini_pos_profile,
            si.customer_name as party,
            CASE WHEN si.is_return = 1 THEN 'Sales Return' ELSE 'Sales' END as description,
            CASE WHEN si.is_return = 0 THEN si.grand_total ELSE 0 END as debit,
            CASE WHEN si.is_return = 1 THEN ABS(si.grand_total) ELSE 0 END as credit,
            si.creation
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        {conditions}
    """.format(conditions=si_conditions), si_values, as_dict=True)
    data.extend(sales_invoices)

    # Get Payment Entries (Receive)
    pe_conditions, pe_values = get_payment_entry_conditions(filters)
    payment_entries = frappe.db.sql("""
        SELECT
            pe.posting_date,
            'Payment Entry' as transaction_type,
            pe.name as voucher_no,
            pe.custom_mini_pos_profile as mini_pos_profile,
            pe.party_name as party,
            CONCAT(pe.payment_type, ' - ', pe.mode_of_payment) as description,
            CASE WHEN pe.payment_type = 'Receive' THEN pe.paid_amount ELSE 0 END as debit,
            CASE WHEN pe.payment_type = 'Pay' THEN pe.paid_amount ELSE 0 END as credit,
            pe.creation
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        {conditions}
    """.format(conditions=pe_conditions), pe_values, as_dict=True)
    data.extend(payment_entries)

    # Get Expense Entries
    exp_conditions, exp_values = get_expense_entry_conditions(filters)
    expense_entries = frappe.db.sql("""
        SELECT
            ee.posting_date,
            'Expense Entry' as transaction_type,
            ee.name as voucher_no,
            ee.mini_pos_profile,
            ee.expense as party,
            CONCAT('Expense - ', ee.mode_of_payment) as description,
            0 as debit,
            ee.amount as credit,
            ee.creation
        FROM `tabExpense Entry` ee
        WHERE ee.docstatus = 1
        {conditions}
    """.format(conditions=exp_conditions), exp_values, as_dict=True)
    data.extend(expense_entries)

    # Sort by date and creation
    data.sort(key=lambda x: (x.get("posting_date"), x.get("creation")))

    # Calculate running balance
    balance = 0
    for row in data:
        balance += flt(row.get("debit", 0)) - flt(row.get("credit", 0))
        row["balance"] = balance
        # Remove creation field from output
        if "creation" in row:
            del row["creation"]

    return columns, data


# --- Helper Functions for Conditions ---

def get_sales_invoice_conditions(filters):
    """Build SQL conditions for Sales Invoice queries"""
    conditions = []
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

    return (" AND " + " AND ".join(conditions)) if conditions else "", values


def get_payment_entry_conditions(filters):
    """Build SQL conditions for Payment Entry queries"""
    conditions = []
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

    return (" AND " + " AND ".join(conditions)) if conditions else "", values


def get_expense_entry_conditions(filters):
    """Build SQL conditions for Expense Entry queries"""
    conditions = []
    values = {}

    if filters.get("company"):
        conditions.append("ee.company = %(company)s")
        values["company"] = filters.get("company")

    if filters.get("from_date"):
        conditions.append("ee.posting_date >= %(from_date)s")
        values["from_date"] = filters.get("from_date")

    if filters.get("to_date"):
        conditions.append("ee.posting_date <= %(to_date)s")
        values["to_date"] = filters.get("to_date")

    if filters.get("mini_pos_profile"):
        conditions.append("ee.mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    return (" AND " + " AND ".join(conditions)) if conditions else "", values
