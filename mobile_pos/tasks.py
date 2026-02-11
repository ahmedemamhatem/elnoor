# Copyright (c) 2025, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt, today, add_days


def auto_reconcile_payments():
    """
    Hourly task to auto-reconcile payments for all customers
    who have invoices with outstanding amount > 0
    Only reconciles when invoice amount exactly matches payment amount
    Only processes invoices and payments from today and yesterday
    """
    # Get all companies
    companies = frappe.get_all("Company", filters={"is_group": 0}, pluck="name")

    for company in companies:
        try:
            reconcile_payments_for_company(company)
        except Exception as e:
            frappe.log_error(
                message=f"Error in auto payment reconciliation for company {company}: {str(e)}",
                title="Auto Payment Reconciliation Error"
            )


def reconcile_payments_for_company(company):
    """Reconcile payments for all customers with outstanding invoices in a company"""

    # Get default receivable account for the company
    receivable_account = frappe.db.get_value(
        "Company", company, "default_receivable_account"
    )

    if not receivable_account:
        return

    # Date range: yesterday and today
    yesterday = add_days(today(), -1)
    today_date = today()

    # Get all customers who have outstanding invoices from today or yesterday
    customers_with_outstanding = frappe.db.sql("""
        SELECT DISTINCT si.customer
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
        AND si.outstanding_amount > 0
        AND si.company = %(company)s
        AND si.posting_date >= %(yesterday)s
        AND si.posting_date <= %(today)s
    """, {"company": company, "yesterday": yesterday, "today": today_date}, as_dict=True)

    for row in customers_with_outstanding:
        customer = row.customer
        try:
            reconcile_customer_payments(company, customer, receivable_account, yesterday, today_date)
            frappe.db.commit()
        except Exception as e:
            frappe.db.rollback()
            # Only log if it's not a common reconciliation issue
            error_msg = str(e)
            if "Debit and Credit not equal" not in error_msg and "has been modified" not in error_msg:
                frappe.log_error(
                    message=f"Error reconciling payments for customer {customer} in company {company}: {error_msg}",
                    title="Auto Payment Reconciliation Error"
                )


def reconcile_customer_payments(company, customer, receivable_account, from_date, to_date):
    """
    Reconcile payments against invoices for a customer
    Only reconciles when invoice outstanding amount exactly matches payment amount
    Only processes entries from the specified date range
    """

    # Create Payment Reconciliation instance
    pr = frappe.new_doc("Payment Reconciliation")
    pr.company = company
    pr.party_type = "Customer"
    pr.party = customer
    pr.receivable_payable_account = receivable_account
    pr.from_invoice_date = from_date
    pr.to_invoice_date = to_date
    pr.from_payment_date = from_date
    pr.to_payment_date = to_date

    # Get unreconciled entries
    pr.get_unreconciled_entries()

    # Check if there are both payments and invoices to reconcile
    if not pr.invoices or not pr.payments:
        return

    # Build a map of payment amounts for quick lookup
    # Key: rounded amount, Value: list of payments with that amount
    payment_amount_map = {}
    for pay in pr.payments:
        amount = flt(pay.amount, 2)
        if amount > 0:
            if amount not in payment_amount_map:
                payment_amount_map[amount] = []
            payment_amount_map[amount].append({
                "reference_type": pay.reference_type,
                "reference_name": pay.reference_name,
                "amount": pay.amount,
                "posting_date": pay.posting_date,
                "exchange_rate": pay.exchange_rate if hasattr(pay, 'exchange_rate') else 1,
                "currency": pay.currency if hasattr(pay, 'currency') else None
            })

    if not payment_amount_map:
        return

    # Find invoices that have matching payment amounts
    invoices_to_reconcile = []
    payments_to_allocate = []
    used_payments = set()

    for inv in pr.invoices:
        outstanding = flt(inv.outstanding_amount, 2)
        if outstanding <= 0:
            continue

        # Check if there's a payment with exactly the same amount
        if outstanding in payment_amount_map:
            # Find an unused payment with this amount
            for pay in payment_amount_map[outstanding]:
                pay_key = f"{pay['reference_type']}:{pay['reference_name']}"
                if pay_key not in used_payments:
                    # Found a matching payment
                    invoices_to_reconcile.append({
                        "invoice_type": inv.invoice_type,
                        "invoice_number": inv.invoice_number,
                        "invoice_date": inv.invoice_date,
                        "amount": inv.amount,
                        "outstanding_amount": inv.outstanding_amount,
                        "exchange_rate": inv.exchange_rate,
                        "currency": inv.currency
                    })
                    payments_to_allocate.append(pay)
                    used_payments.add(pay_key)
                    break

    if not invoices_to_reconcile or not payments_to_allocate:
        return

    # Allocate payments to invoices
    pr.allocate_entries({
        "payments": payments_to_allocate,
        "invoices": invoices_to_reconcile
    })

    # If there are allocations, reconcile them
    if pr.allocation:
        pr.reconcile()
        frappe.logger().info(
            f"Auto-reconciled {len(pr.allocation)} exact-match entries for customer {customer} in company {company}"
        )
