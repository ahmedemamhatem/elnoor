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
    elif report_view == "By Customer":
        return get_by_customer_report(filters)
    elif report_view == "By Date":
        return get_by_date_report(filters)
    elif report_view == "Detailed":
        return get_detailed_report(filters)
    else:
        return get_summary_report(filters)


def get_summary_report(filters):
    """Get overall summary of sales, payments, and outstanding"""
    columns = [
        {
            "fieldname": "label",
            "label": _("Description"),
            "fieldtype": "Data",
            "width": 250
        },
        {
            "fieldname": "count",
            "label": _("Count"),
            "fieldtype": "Int",
            "width": 100
        },
        {
            "fieldname": "amount",
            "label": _("Amount"),
            "fieldtype": "Currency",
            "width": 150
        }
    ]

    conditions, values = get_conditions(filters)
    show_returns = filters.get("show_returns", 1)

    # Get sales data
    sales_data = frappe.db.sql("""
        SELECT
            COUNT(*) as invoice_count,
            COALESCE(SUM(si.grand_total), 0) as total_sales,
            COALESCE(SUM(si.base_paid_amount), 0) as total_paid,
            COALESCE(SUM(si.outstanding_amount), 0) as total_outstanding
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 0
        {conditions}
    """.format(conditions=conditions), values, as_dict=True)[0]

    # Get returns data
    returns_data = frappe.db.sql("""
        SELECT
            COUNT(*) as return_count,
            COALESCE(SUM(ABS(si.grand_total)), 0) as total_returns
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 1
        {conditions}
    """.format(conditions=conditions), values, as_dict=True)[0]

    # Get payment breakdown by mode from Payment Entry
    payment_conditions, payment_values = get_payment_entry_conditions(filters)
    payment_breakdown = frappe.db.sql("""
        SELECT
            pe.mode_of_payment,
            COALESCE(SUM(pe.paid_amount), 0) as amount
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        AND pe.payment_type = 'Receive'
        AND pe.party_type = 'Customer'
        {conditions}
        GROUP BY pe.mode_of_payment
        ORDER BY amount DESC
    """.format(conditions=payment_conditions), payment_values, as_dict=True)

    # Get customer count
    customer_count = frappe.db.sql("""
        SELECT COUNT(DISTINCT si.customer) as count
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 0
        {conditions}
    """.format(conditions=conditions), values, as_dict=True)[0].count

    # Build data
    data = [
        {"label": _("Total Invoices / إجمالي الفواتير"), "count": sales_data.invoice_count, "amount": sales_data.total_sales},
        {"label": _("Total Paid / إجمالي المدفوع"), "count": "", "amount": sales_data.total_paid},
        {"label": _("Total Outstanding / إجمالي المستحق"), "count": "", "amount": sales_data.total_outstanding},
        {"label": "", "count": "", "amount": ""},
    ]

    if show_returns:
        data.append({"label": _("Returns / المرتجعات"), "count": returns_data.return_count, "amount": -returns_data.total_returns})
        net_sales = sales_data.total_sales - returns_data.total_returns
        data.append({"label": _("Net Sales / صافي المبيعات"), "count": "", "amount": net_sales})
        data.append({"label": "", "count": "", "amount": ""})

    data.append({"label": _("Number of Customers / عدد العملاء"), "count": customer_count, "amount": ""})
    data.append({"label": "", "count": "", "amount": ""})

    # Add payment breakdown
    data.append({"label": _("--- Payment Breakdown / تفصيل المدفوعات ---"), "count": "", "amount": ""})
    for payment in payment_breakdown:
        data.append({
            "label": payment.mode_of_payment,
            "count": "",
            "amount": payment.amount
        })

    return columns, data


def get_by_customer_report(filters):
    """Get sales grouped by customer with payment and outstanding details"""
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
            "width": 180
        },
        {
            "fieldname": "mini_pos_profile",
            "label": _("Mini POS Profile"),
            "fieldtype": "Link",
            "options": "Mini POS Profile",
            "width": 130
        },
        {
            "fieldname": "invoice_count",
            "label": _("Invoices"),
            "fieldtype": "Int",
            "width": 80
        },
        {
            "fieldname": "total_sales",
            "label": _("Total Sales"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "total_paid",
            "label": _("Paid"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "total_outstanding",
            "label": _("Outstanding"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "return_count",
            "label": _("Returns"),
            "fieldtype": "Int",
            "width": 80
        },
        {
            "fieldname": "return_amount",
            "label": _("Return Amount"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "net_sales",
            "label": _("Net Sales"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "customer_balance",
            "label": _("Customer Balance"),
            "fieldtype": "Currency",
            "width": 130
        }
    ]

    conditions, values = get_conditions(filters)
    show_returns = filters.get("show_returns", 1)

    # Get sales by customer
    data = frappe.db.sql("""
        SELECT
            si.customer,
            si.customer_name,
            si.custom_mini_pos_profile as mini_pos_profile,
            COUNT(CASE WHEN si.is_return = 0 THEN 1 END) as invoice_count,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.grand_total ELSE 0 END), 0) as total_sales,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.base_paid_amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.outstanding_amount ELSE 0 END), 0) as total_outstanding,
            COUNT(CASE WHEN si.is_return = 1 THEN 1 END) as return_count,
            COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(si.grand_total) ELSE 0 END), 0) as return_amount
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY si.customer
        ORDER BY total_sales DESC
    """.format(conditions=conditions), values, as_dict=True)

    # Calculate net sales and get customer balance
    for row in data:
        row["net_sales"] = flt(row["total_sales"]) - flt(row["return_amount"])
        # Get customer balance from GL Entry
        balance = frappe.db.sql("""
            SELECT COALESCE(SUM(debit) - SUM(credit), 0) as balance
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND docstatus = 1
        """, row["customer"], as_dict=True)
        row["customer_balance"] = balance[0].balance if balance else 0

    return columns, data


def get_by_date_report(filters):
    """Get sales grouped by date"""
    columns = [
        {
            "fieldname": "posting_date",
            "label": _("Date"),
            "fieldtype": "Date",
            "width": 120
        },
        {
            "fieldname": "invoice_count",
            "label": _("Invoices"),
            "fieldtype": "Int",
            "width": 90
        },
        {
            "fieldname": "customer_count",
            "label": _("Customers"),
            "fieldtype": "Int",
            "width": 90
        },
        {
            "fieldname": "total_sales",
            "label": _("Total Sales"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "total_paid",
            "label": _("Paid"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "total_outstanding",
            "label": _("Outstanding"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "return_count",
            "label": _("Returns"),
            "fieldtype": "Int",
            "width": 80
        },
        {
            "fieldname": "return_amount",
            "label": _("Return Amount"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "net_sales",
            "label": _("Net Sales"),
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "fieldname": "cash_amount",
            "label": _("Cash"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "other_payments",
            "label": _("Other Payments"),
            "fieldtype": "Currency",
            "width": 120
        }
    ]

    conditions, values = get_conditions(filters)

    # Get sales by date
    data = frappe.db.sql("""
        SELECT
            si.posting_date,
            COUNT(CASE WHEN si.is_return = 0 THEN 1 END) as invoice_count,
            COUNT(DISTINCT CASE WHEN si.is_return = 0 THEN si.customer END) as customer_count,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.grand_total ELSE 0 END), 0) as total_sales,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.base_paid_amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.outstanding_amount ELSE 0 END), 0) as total_outstanding,
            COUNT(CASE WHEN si.is_return = 1 THEN 1 END) as return_count,
            COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(si.grand_total) ELSE 0 END), 0) as return_amount
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        {conditions}
        GROUP BY si.posting_date
        ORDER BY si.posting_date DESC
    """.format(conditions=conditions), values, as_dict=True)

    # Get payment breakdown per date from Payment Entry
    for row in data:
        row["net_sales"] = flt(row["total_sales"]) - flt(row["return_amount"])

        # Get cash payments for this date from Payment Entry
        date_values = {"posting_date": row["posting_date"]}
        if filters.get("mini_pos_profile"):
            date_values["mini_pos_profile"] = filters.get("mini_pos_profile")

        cash_data = frappe.db.sql("""
            SELECT COALESCE(SUM(pe.paid_amount), 0) as cash_amount
            FROM `tabPayment Entry` pe
            WHERE pe.docstatus = 1
            AND pe.payment_type = 'Receive'
            AND pe.party_type = 'Customer'
            AND pe.posting_date = %(posting_date)s
            AND pe.mode_of_payment LIKE '%%Cash%%'
            {profile_condition}
        """.format(profile_condition="AND pe.custom_mini_pos_profile = %(mini_pos_profile)s" if filters.get("mini_pos_profile") else ""), date_values, as_dict=True)

        row["cash_amount"] = cash_data[0].cash_amount if cash_data else 0
        row["other_payments"] = flt(row["total_paid"]) - flt(row["cash_amount"])

    return columns, data


def get_detailed_report(filters):
    """Get detailed invoice-level report"""
    columns = [
        {
            "fieldname": "posting_date",
            "label": _("Date"),
            "fieldtype": "Date",
            "width": 100
        },
        {
            "fieldname": "name",
            "label": _("Invoice"),
            "fieldtype": "Link",
            "options": "Sales Invoice",
            "width": 140
        },
        {
            "fieldname": "customer",
            "label": _("Customer"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 120
        },
        {
            "fieldname": "customer_name",
            "label": _("Customer Name"),
            "fieldtype": "Data",
            "width": 150
        },
        {
            "fieldname": "mini_pos_profile",
            "label": _("Profile"),
            "fieldtype": "Link",
            "options": "Mini POS Profile",
            "width": 100
        },
        {
            "fieldname": "is_return",
            "label": _("Return"),
            "fieldtype": "Check",
            "width": 60
        },
        {
            "fieldname": "items_count",
            "label": _("Items"),
            "fieldtype": "Int",
            "width": 60
        },
        {
            "fieldname": "total_qty",
            "label": _("Qty"),
            "fieldtype": "Float",
            "width": 70
        },
        {
            "fieldname": "grand_total",
            "label": _("Grand Total"),
            "fieldtype": "Currency",
            "width": 110
        },
        {
            "fieldname": "paid_amount",
            "label": _("Paid"),
            "fieldtype": "Currency",
            "width": 100
        },
        {
            "fieldname": "outstanding_amount",
            "label": _("Outstanding"),
            "fieldtype": "Currency",
            "width": 100
        },
        {
            "fieldname": "mode_of_payment",
            "label": _("Payment Mode"),
            "fieldtype": "Data",
            "width": 120
        },
        {
            "fieldname": "status",
            "label": _("Status"),
            "fieldtype": "Data",
            "width": 90
        }
    ]

    conditions, values = get_conditions(filters)
    show_returns = filters.get("show_returns", 1)

    return_condition = ""
    if not show_returns:
        return_condition = "AND si.is_return = 0"

    data = frappe.db.sql("""
        SELECT
            si.posting_date,
            si.name,
            si.customer,
            si.customer_name,
            si.custom_mini_pos_profile as mini_pos_profile,
            si.is_return,
            (SELECT COUNT(*) FROM `tabSales Invoice Item` WHERE parent = si.name) as items_count,
            (SELECT COALESCE(SUM(qty), 0) FROM `tabSales Invoice Item` WHERE parent = si.name) as total_qty,
            si.grand_total,
            si.base_paid_amount as paid_amount,
            si.outstanding_amount,
            (SELECT GROUP_CONCAT(DISTINCT pe.mode_of_payment SEPARATOR ', ')
             FROM `tabPayment Entry` pe
             INNER JOIN `tabPayment Entry Reference` per ON per.parent = pe.name
             WHERE per.reference_name = si.name AND pe.docstatus = 1) as mode_of_payment,
            si.status
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        {conditions}
        {return_condition}
        ORDER BY si.posting_date DESC, si.creation DESC
    """.format(conditions=conditions, return_condition=return_condition), values, as_dict=True)

    return columns, data


def get_conditions(filters):
    """Build SQL conditions based on filters"""
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

    if filters.get("customer"):
        conditions.append("si.customer = %(customer)s")
        values["customer"] = filters.get("customer")

    if filters.get("mini_pos_profile"):
        conditions.append("si.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("mode_of_payment"):
        conditions.append("""
            EXISTS (
                SELECT 1 FROM `tabPayment Entry` pe2
                INNER JOIN `tabPayment Entry Reference` per2 ON per2.parent = pe2.name
                WHERE per2.reference_name = si.name
                AND pe2.mode_of_payment = %(mode_of_payment)s
                AND pe2.docstatus = 1
            )
        """)
        values["mode_of_payment"] = filters.get("mode_of_payment")

    return (" AND " + " AND ".join(conditions)) if conditions else "", values


def get_profile_condition(filters):
    """Get profile condition for sub-queries"""
    if filters.get("mini_pos_profile"):
        return "AND si.custom_mini_pos_profile = %(mini_pos_profile)s"
    return ""


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

    if filters.get("customer"):
        conditions.append("pe.party = %(customer)s")
        values["customer"] = filters.get("customer")

    if filters.get("mini_pos_profile"):
        conditions.append("pe.custom_mini_pos_profile = %(mini_pos_profile)s")
        values["mini_pos_profile"] = filters.get("mini_pos_profile")

    if filters.get("mode_of_payment"):
        conditions.append("pe.mode_of_payment = %(mode_of_payment)s")
        values["mode_of_payment"] = filters.get("mode_of_payment")

    return (" AND " + " AND ".join(conditions)) if conditions else "", values


@frappe.whitelist()
def get_print_summary(filters):
    """Generate printable HTML summary"""
    import json
    if isinstance(filters, str):
        filters = json.loads(filters)

    conditions, values = get_conditions(filters)
    show_returns = filters.get("show_returns", 1)

    # Get summary data
    sales_data = frappe.db.sql("""
        SELECT
            COUNT(*) as invoice_count,
            COALESCE(SUM(grand_total), 0) as total_sales,
            COALESCE(SUM(base_paid_amount), 0) as total_paid,
            COALESCE(SUM(outstanding_amount), 0) as total_outstanding
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 0
        {conditions}
    """.format(conditions=conditions), values, as_dict=True)[0]

    returns_data = frappe.db.sql("""
        SELECT
            COUNT(*) as return_count,
            COALESCE(SUM(ABS(grand_total)), 0) as total_returns
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 1
        {conditions}
    """.format(conditions=conditions), values, as_dict=True)[0]

    # Get payment breakdown from Payment Entry
    payment_conditions, payment_values = get_payment_entry_conditions(filters)
    payment_breakdown = frappe.db.sql("""
        SELECT
            pe.mode_of_payment,
            COALESCE(SUM(pe.paid_amount), 0) as amount
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
        AND pe.payment_type = 'Receive'
        AND pe.party_type = 'Customer'
        {conditions}
        GROUP BY pe.mode_of_payment
        ORDER BY amount DESC
    """.format(conditions=payment_conditions), payment_values, as_dict=True)

    # Get top customers
    top_customers = frappe.db.sql("""
        SELECT
            si.customer,
            si.customer_name,
            COALESCE(SUM(si.grand_total), 0) as total_sales
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.is_return = 0
        {conditions}
        GROUP BY si.customer
        ORDER BY total_sales DESC
        LIMIT 10
    """.format(conditions=conditions), values, as_dict=True)

    net_sales = sales_data.total_sales - returns_data.total_returns

    from_date = formatdate(filters.get("from_date"))
    to_date = formatdate(filters.get("to_date"))

    html = f"""
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
        <meta charset="utf-8">
        <title>تقرير المبيعات اليومي</title>
        <style>
            body {{
                font-family: 'Arial', sans-serif;
                direction: rtl;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
            }}
            .date-range {{
                color: #666;
                margin-top: 5px;
            }}
            .section {{
                margin-bottom: 25px;
            }}
            .section-title {{
                font-size: 16px;
                font-weight: bold;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
                margin-bottom: 10px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            th, td {{
                padding: 8px 12px;
                text-align: right;
                border-bottom: 1px solid #eee;
            }}
            th {{
                background: #f5f5f5;
                font-weight: bold;
            }}
            .amount {{
                font-weight: bold;
            }}
            .positive {{
                color: #16a34a;
            }}
            .negative {{
                color: #dc2626;
            }}
            .total-row {{
                background: #f0f9ff;
                font-weight: bold;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px dashed #ccc;
                color: #666;
                font-size: 12px;
            }}
            @media print {{
                body {{ padding: 0; }}
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>تقرير المبيعات اليومي</h1>
            <div class="date-range">الفترة: {from_date} - {to_date}</div>
        </div>

        <div class="section">
            <div class="section-title">ملخص المبيعات</div>
            <table>
                <tr>
                    <td>إجمالي الفواتير</td>
                    <td class="amount">{sales_data.invoice_count}</td>
                </tr>
                <tr>
                    <td>إجمالي المبيعات</td>
                    <td class="amount">{frappe.format_value(sales_data.total_sales, {'fieldtype': 'Currency'})}</td>
                </tr>
                <tr>
                    <td>إجمالي المدفوع</td>
                    <td class="amount positive">{frappe.format_value(sales_data.total_paid, {'fieldtype': 'Currency'})}</td>
                </tr>
                <tr>
                    <td>إجمالي المستحق</td>
                    <td class="amount negative">{frappe.format_value(sales_data.total_outstanding, {'fieldtype': 'Currency'})}</td>
                </tr>
                <tr>
                    <td>المرتجعات ({returns_data.return_count})</td>
                    <td class="amount">-{frappe.format_value(returns_data.total_returns, {'fieldtype': 'Currency'})}</td>
                </tr>
                <tr class="total-row">
                    <td>صافي المبيعات</td>
                    <td class="amount">{frappe.format_value(net_sales, {'fieldtype': 'Currency'})}</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <div class="section-title">تفصيل المدفوعات</div>
            <table>
                <tr>
                    <th>طريقة الدفع</th>
                    <th>المبلغ</th>
                </tr>
                {''.join([f"<tr><td>{p.mode_of_payment}</td><td class='amount'>{frappe.format_value(p.amount, {'fieldtype': 'Currency'})}</td></tr>" for p in payment_breakdown])}
            </table>
        </div>

        <div class="section">
            <div class="section-title">أعلى 10 عملاء</div>
            <table>
                <tr>
                    <th>#</th>
                    <th>العميل</th>
                    <th>المبيعات</th>
                </tr>
                {''.join([f"<tr><td>{i+1}</td><td>{c.customer_name or c.customer}</td><td class='amount'>{frappe.format_value(c.total_sales, {'fieldtype': 'Currency'})}</td></tr>" for i, c in enumerate(top_customers)])}
            </table>
        </div>

        <div class="footer">
            تم إنشاء التقرير بتاريخ: {frappe.utils.now_datetime().strftime('%Y-%m-%d %H:%M:%S')}
        </div>

        <script>
            window.onload = function() {{
                window.print();
            }};
        </script>
    </body>
    </html>
    """

    return html
