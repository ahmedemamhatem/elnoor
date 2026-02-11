# Copyright (c) 2026, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt


def _get_styled_error(title, message, icon="⚠️", details=None):
    """Generate styled HTML error message"""
    details_html = ""
    if details:
        rows = ""
        for i, (label, value) in enumerate(details):
            bg = "#f8f9fa" if i % 2 == 0 else "white"
            rows += f'''<tr style="background: {bg};">
                <td style="padding: 6px 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">{label}</td>
                <td style="padding: 6px 12px; border-bottom: 1px solid #e9ecef; text-align: left; font-weight: 700; color: #2980b9;">{value}</td>
            </tr>'''
        details_html = f'''
        <div style="background: white; border-radius: 8px; overflow: hidden; margin-top: 12px; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                {rows}
            </table>
        </div>'''

    return f'''
    <div style="direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%); color: white; padding: 12px 15px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 24px;">{icon}</div>
                <div>
                    <div style="font-size: 14px; font-weight: 800;">{title}</div>
                    <div style="font-size: 12px; opacity: 0.9;">{message}</div>
                </div>
            </div>
        </div>
        {details_html}
    </div>
    '''


def on_submit_sales_invoice(doc, method=None):
    """Handle employee invoice on submit"""
    handle_employee_invoice_submit(doc)


def on_cancel_sales_invoice(doc, method=None):
    """Handle employee invoice on cancel"""
    handle_employee_invoice_cancel(doc)


def handle_employee_invoice_submit(doc):
    """
    On Sales Invoice submit:
    - If custom_employee_invoice is checked and employee is selected
    - Create POS Employee Sales Ledger entry
    - Create Journal Entry to transfer amount from employee purchases account to customer's receivable
    """
    if not doc.custom_employee_invoice or not doc.custom_employee:
        return

    try:
        from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings

        settings = get_mobile_pos_settings(doc.company)
        purchases_account = settings.get("employee_purchases_account") or settings.get("employee_long_term_loan_account")

        if not purchases_account:
            frappe.throw(
                _get_styled_error(
                    "حساب مشتريات الموظفين غير محدد",
                    "يرجى تحديد حساب مشتريات الموظفين في إعدادات نقطة البيع",
                    "📊"
                ),
                title="إعدادات ناقصة"
            )

        employee_name = frappe.db.get_value("POS Employee", doc.custom_employee, "employee_name")

        # Create POS Employee Sales Ledger entry
        ledger = frappe.new_doc("POS Employee Sales Ledger")
        ledger.company = doc.company
        ledger.employee = doc.custom_employee
        ledger.employee_name = employee_name
        ledger.posting_date = doc.posting_date
        ledger.due_date = doc.due_date or doc.posting_date
        ledger.amount = flt(doc.grand_total)
        ledger.sales_invoice = doc.name
        ledger.status = "Pending"
        ledger.deducted = 0
        ledger.insert(ignore_permissions=True)

        # Create Journal Entry
        company = doc.company
        debit_to = doc.debit_to

        je = frappe.new_doc("Journal Entry")
        je.voucher_type = "Journal Entry"
        je.posting_date = doc.posting_date
        je.company = company
        je.user_remark = f"سداد فاتورة موظف {doc.name} - {employee_name}"

        # Debit Employee Purchases Account (with POS Employee party)
        je.append("accounts", {
            "account": purchases_account,
            "credit_in_account_currency": 0,
            "debit_in_account_currency": flt(doc.grand_total),
            "party_type": "POS Employee",
            "party": doc.custom_employee,
        })

        # Credit Customer's Receivable Account (party)
        credit_entry = {
            "account": debit_to,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": flt(doc.grand_total),
            "party_type": "Customer",
            "party": doc.customer,
        }
        # Only add invoice reference if there is outstanding amount
        outstanding = flt(frappe.db.get_value("Sales Invoice", doc.name, "outstanding_amount"))
        if outstanding > 0:
            credit_entry["reference_type"] = "Sales Invoice"
            credit_entry["reference_name"] = doc.name
        je.append("accounts", credit_entry)

        je.flags.ignore_permissions = True
        je.insert()
        je.submit()

        # Update the ledger entry with journal entry reference
        frappe.db.set_value("POS Employee Sales Ledger", ledger.name, "journal_entry", je.name)

        frappe.msgprint(f"تم إنشاء سجل مبيعات الموظف وقيد اليومية {je.name}", alert=True)

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "POS Employee Sales Invoice Submit Error")
        frappe.throw(
            _get_styled_error(
                "خطأ في إنشاء سجل مبيعات الموظف",
                str(e),
                "❌"
            ),
            title="خطأ"
        )


def handle_employee_invoice_cancel(doc):
    """
    On Sales Invoice cancel:
    - If custom_employee_invoice is checked
    - Cancel the POS Employee Sales Ledger entry
    - Cancel the related Journal Entry
    """
    if not doc.custom_employee_invoice or not doc.custom_employee:
        return

    try:
        # Find and update POS Employee Sales Ledger entries
        ledger_entries = frappe.get_all(
            "POS Employee Sales Ledger",
            filters={
                "sales_invoice": doc.name
            },
            fields=["name", "deducted", "journal_entry", "status"]
        )

        for entry in ledger_entries:
            if entry.deducted:
                frappe.throw(
                    _get_styled_error(
                        "لا يمكن إلغاء الفاتورة",
                        "تم خصم مبلغ الفاتورة من المرتب بالفعل",
                        "🚫"
                    ),
                    title="لا يمكن الإلغاء"
                )

            if entry.status == "Cancelled":
                continue

            # Cancel the linked Journal Entry
            if entry.journal_entry:
                je = frappe.get_doc("Journal Entry", entry.journal_entry)
                if je.docstatus == 1:
                    je.flags.ignore_permissions = True
                    je.cancel()
                    frappe.msgprint(f"تم إلغاء قيد اليومية {entry.journal_entry}", alert=True)

            # Update the ledger entry status to Cancelled
            frappe.db.set_value("POS Employee Sales Ledger", entry.name, {
                "status": "Cancelled"
            })

        frappe.msgprint("تم إلغاء سجل مبيعات الموظف", alert=True)

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "POS Employee Sales Invoice Cancel Error")
        frappe.throw(
            _get_styled_error(
                "خطأ في إلغاء سجل مبيعات الموظف",
                str(e),
                "❌"
            ),
            title="خطأ"
        )
