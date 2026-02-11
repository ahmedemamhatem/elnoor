# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, formatdate


def execute(filters=None):
    if not filters:
        filters = {}

    if not filters.get("customer"):
        return [], []

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():
    return [
        {
            "fieldname": "posting_date",
            "label": _("Date"),
            "fieldtype": "Date",
            "width": 100
        },
        {
            "fieldname": "voucher_type",
            "label": _("Voucher Type"),
            "fieldtype": "Data",
            "width": 120
        },
        {
            "fieldname": "voucher_no",
            "label": _("Voucher No"),
            "fieldtype": "Dynamic Link",
            "options": "voucher_type",
            "width": 150
        },
        {
            "fieldname": "remarks",
            "label": _("Remarks"),
            "fieldtype": "Data",
            "width": 200
        },
        {
            "fieldname": "debit",
            "label": _("Debit"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "credit",
            "label": _("Credit"),
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "fieldname": "balance",
            "label": _("Balance"),
            "fieldtype": "Currency",
            "width": 130
        }
    ]


def get_data(filters):
    customer = filters.get("customer")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    voucher_type = filters.get("voucher_type")
    company = filters.get("company")

    data = []

    # Get opening balance if from_date is specified
    opening_balance = 0
    company_filter = ""
    company_values = [customer, from_date]
    if company:
        company_filter = "AND company = %s"
        company_values.append(company)

    if from_date:
        opening_result = frappe.db.sql("""
            SELECT COALESCE(SUM(debit) - SUM(credit), 0) as opening
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND posting_date < %s
            AND docstatus = 1
            {company_filter}
        """.format(company_filter=company_filter), tuple(company_values), as_dict=True)
        opening_balance = flt(opening_result[0].opening) if opening_result else 0

        # Add opening balance row
        data.append({
            "posting_date": from_date,
            "voucher_type": _("Opening Balance"),
            "voucher_no": "",
            "remarks": _("Balance brought forward / رصيد مرحل"),
            "debit": opening_balance if opening_balance > 0 else 0,
            "credit": abs(opening_balance) if opening_balance < 0 else 0,
            "balance": opening_balance,
            "is_opening": True
        })

    # Build conditions
    conditions = ["party_type = 'Customer'", "party = %(customer)s", "docstatus = 1"]
    values = {"customer": customer}

    if company:
        conditions.append("company = %(company)s")
        values["company"] = company

    if from_date:
        conditions.append("posting_date >= %(from_date)s")
        values["from_date"] = from_date

    if to_date:
        conditions.append("posting_date <= %(to_date)s")
        values["to_date"] = to_date

    if voucher_type:
        conditions.append("voucher_type = %(voucher_type)s")
        values["voucher_type"] = voucher_type

    # Get GL entries
    entries = frappe.db.sql("""
        SELECT
            posting_date,
            voucher_type,
            voucher_no,
            remarks,
            debit,
            credit
        FROM `tabGL Entry`
        WHERE {conditions}
        ORDER BY posting_date, creation
    """.format(conditions=" AND ".join(conditions)), values, as_dict=True)

    # Calculate running balance
    balance = opening_balance
    for entry in entries:
        balance += flt(entry.debit) - flt(entry.credit)
        entry["balance"] = balance
        data.append(entry)

    # Add closing balance row
    if data:
        data.append({
            "posting_date": to_date or frappe.utils.today(),
            "voucher_type": _("Closing Balance"),
            "voucher_no": "",
            "remarks": _("Current Balance / الرصيد الحالي"),
            "debit": balance if balance > 0 else 0,
            "credit": abs(balance) if balance < 0 else 0,
            "balance": balance,
            "is_opening": True
        })

    return data


@frappe.whitelist()
def get_print_statement(filters):
    """Generate printable customer statement"""
    import json
    if isinstance(filters, str):
        filters = json.loads(filters)

    customer = filters.get("customer")
    if not customer:
        return ""

    # Get customer info
    customer_doc = frappe.get_doc("Customer", customer)

    # Get ledger data
    data = get_data(filters)

    from_date = formatdate(filters.get("from_date")) if filters.get("from_date") else ""
    to_date = formatdate(filters.get("to_date")) if filters.get("to_date") else formatdate(frappe.utils.today())

    # Calculate totals
    total_debit = sum(flt(d.get("debit", 0)) for d in data if not d.get("is_opening"))
    total_credit = sum(flt(d.get("credit", 0)) for d in data if not d.get("is_opening"))
    closing_balance = data[-1].get("balance", 0) if data else 0

    rows_html = ""
    for row in data:
        style = "background: #f3f4f6; font-style: italic;" if row.get("is_opening") else ""
        balance_color = "#dc2626" if flt(row.get("balance", 0)) > 0 else "#16a34a" if flt(row.get("balance", 0)) < 0 else "#000"
        rows_html += f"""
        <tr style="{style}">
            <td>{formatdate(row.get('posting_date')) if row.get('posting_date') else ''}</td>
            <td>{row.get('voucher_type', '')}</td>
            <td>{row.get('voucher_no', '')}</td>
            <td>{row.get('remarks', '') or ''}</td>
            <td class="amount">{frappe.format_value(row.get('debit', 0), {'fieldtype': 'Currency'})}</td>
            <td class="amount">{frappe.format_value(row.get('credit', 0), {'fieldtype': 'Currency'})}</td>
            <td class="amount" style="color: {balance_color};">{frappe.format_value(row.get('balance', 0), {'fieldtype': 'Currency'})}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
        <meta charset="utf-8">
        <title>كشف حساب عميل - {customer_doc.customer_name}</title>
        <style>
            body {{
                font-family: 'Arial', sans-serif;
                direction: rtl;
                padding: 20px;
                max-width: 1000px;
                margin: 0 auto;
                font-size: 12px;
            }}
            .header {{
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            .header h1 {{
                margin: 0 0 10px 0;
                font-size: 22px;
            }}
            .customer-info {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                padding: 10px;
                background: #f9fafb;
                border-radius: 8px;
            }}
            .customer-info div {{
                text-align: right;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th, td {{
                padding: 8px 10px;
                text-align: right;
                border: 1px solid #ddd;
            }}
            th {{
                background: #1e40af;
                color: white;
                font-weight: bold;
            }}
            .amount {{
                text-align: left;
                font-family: monospace;
            }}
            .totals {{
                margin-top: 20px;
                padding: 15px;
                background: #f0f9ff;
                border-radius: 8px;
            }}
            .totals table {{
                border: none;
                width: auto;
                margin: 0 auto;
            }}
            .totals td {{
                border: none;
                padding: 5px 20px;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px dashed #ccc;
                color: #666;
                font-size: 11px;
            }}
            @media print {{
                body {{ padding: 10px; }}
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>كشف حساب عميل</h1>
            <div>Customer Statement</div>
        </div>

        <div class="customer-info">
            <div>
                <strong>العميل:</strong> {customer_doc.customer_name}<br>
                <strong>كود العميل:</strong> {customer}
            </div>
            <div>
                <strong>الهاتف:</strong> {customer_doc.custom_phone or '-'}<br>
                <strong>الفترة:</strong> {from_date} - {to_date}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>نوع المستند</th>
                    <th>رقم المستند</th>
                    <th>البيان</th>
                    <th>مدين</th>
                    <th>دائن</th>
                    <th>الرصيد</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr>
                    <td><strong>إجمالي المدين:</strong></td>
                    <td style="color: #dc2626;">{frappe.format_value(total_debit, {'fieldtype': 'Currency'})}</td>
                </tr>
                <tr>
                    <td><strong>إجمالي الدائن:</strong></td>
                    <td style="color: #16a34a;">{frappe.format_value(total_credit, {'fieldtype': 'Currency'})}</td>
                </tr>
                <tr>
                    <td><strong>الرصيد الختامي:</strong></td>
                    <td style="color: {'#dc2626' if closing_balance > 0 else '#16a34a'}; font-size: 14px; font-weight: bold;">
                        {frappe.format_value(closing_balance, {'fieldtype': 'Currency'})}
                        {'(مدين)' if closing_balance > 0 else '(دائن)' if closing_balance < 0 else ''}
                    </td>
                </tr>
            </table>
        </div>

        <div class="footer">
            تم إنشاء الكشف بتاريخ: {frappe.utils.now_datetime().strftime('%Y-%m-%d %H:%M:%S')}
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
