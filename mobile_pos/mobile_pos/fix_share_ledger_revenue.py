"""
Script to fix all existing Share Ledger entries by recalculating revenue_amount
Revenue = (rate * qty) - (incoming_rate * stock_qty)
Correctly accounts for UOM conversion factor.

Run with: bench --site [sitename] execute mobile_pos.mobile_pos.fix_share_ledger_revenue.fix_all_share_ledgers
"""

import frappe
from frappe.utils import flt


def fix_all_share_ledgers():
    """Fix all Share Ledger entries from Sales Invoices"""

    # Get all Share Ledger entries linked to Sales Invoice
    share_ledgers = frappe.get_all(
        "Share Ledger",
        filters={
            "voucher_type": "Sales Invoice",
            "docstatus": ["in", [0, 1]]
        },
        fields=["name", "voucher_no", "transaction_type", "revenue_amount", "expense_amount", "percentage", "docstatus"]
    )

    print(f"Found {len(share_ledgers)} Share Ledger entries to process")

    updated_count = 0
    error_count = 0

    for sl in share_ledgers:
        try:
            # Get the linked Sales Invoice
            if not frappe.db.exists("Sales Invoice", sl.voucher_no):
                print(f"  Skipping {sl.name}: Sales Invoice {sl.voucher_no} not found")
                continue

            doc = frappe.get_doc("Sales Invoice", sl.voucher_no)

            # Calculate margin = (rate * qty) - (incoming_rate * stock_qty)
            # rate is per Sales UOM, incoming_rate is per Stock UOM
            if doc.is_return:
                total_margin = sum(
                    (flt(item.rate) * abs(flt(item.qty))) - (flt(item.incoming_rate) * abs(flt(item.stock_qty)))
                    for item in doc.items
                )
                new_revenue = 0
                new_expense = total_margin
            else:
                total_margin = sum(
                    (flt(item.rate) * flt(item.qty)) - (flt(item.incoming_rate) * flt(item.stock_qty))
                    for item in doc.items
                )
                new_revenue = total_margin
                new_expense = 0

            # Check if values need updating
            old_revenue = flt(sl.revenue_amount)
            old_expense = flt(sl.expense_amount)

            if abs(old_revenue - new_revenue) > 0.01 or abs(old_expense - new_expense) > 0.01:
                # Recalculate net_amount and share_amount
                net_amount = flt(new_revenue) - flt(new_expense)
                share_amount = flt(net_amount) * flt(sl.percentage) / 100

                frappe.db.set_value("Share Ledger", sl.name, {
                    "revenue_amount": new_revenue,
                    "expense_amount": new_expense,
                    "net_amount": net_amount,
                    "share_amount": share_amount
                }, update_modified=False)

                print(f"  Updated {sl.name}: revenue {old_revenue:.2f} -> {new_revenue:.2f}, net {net_amount:.2f}, share {share_amount:.2f}")
                updated_count += 1
            else:
                print(f"  Skipped {sl.name}: values already correct")

        except Exception as e:
            print(f"  Error processing {sl.name}: {str(e)}")
            error_count += 1

    frappe.db.commit()

    print(f"\nCompleted: {updated_count} updated, {error_count} errors, {len(share_ledgers) - updated_count - error_count} skipped")
    return {"updated": updated_count, "errors": error_count, "total": len(share_ledgers)}


def fix_single_share_ledger(share_ledger_name):
    """Fix a single Share Ledger entry"""

    sl = frappe.get_doc("Share Ledger", share_ledger_name)

    if sl.voucher_type != "Sales Invoice":
        print(f"Share Ledger {share_ledger_name} is not linked to a Sales Invoice")
        return

    if not frappe.db.exists("Sales Invoice", sl.voucher_no):
        print(f"Sales Invoice {sl.voucher_no} not found")
        return

    doc = frappe.get_doc("Sales Invoice", sl.voucher_no)

    # Calculate margin = (rate * qty) - (incoming_rate * stock_qty)
    if doc.is_return:
        total_margin = sum(
            (flt(item.rate) * abs(flt(item.qty))) - (flt(item.incoming_rate) * abs(flt(item.stock_qty)))
            for item in doc.items
        )
        new_revenue = 0
        new_expense = total_margin
    else:
        total_margin = sum(
            (flt(item.rate) * flt(item.qty)) - (flt(item.incoming_rate) * flt(item.stock_qty))
            for item in doc.items
        )
        new_revenue = total_margin
        new_expense = 0

    # Recalculate
    net_amount = flt(new_revenue) - flt(new_expense)
    share_amount = flt(net_amount) * flt(sl.percentage) / 100

    frappe.db.set_value("Share Ledger", share_ledger_name, {
        "revenue_amount": new_revenue,
        "expense_amount": new_expense,
        "net_amount": net_amount,
        "share_amount": share_amount
    }, update_modified=False)

    frappe.db.commit()

    print(f"Updated {share_ledger_name}: revenue={new_revenue:.2f}, expense={new_expense:.2f}, net={net_amount:.2f}, share={share_amount:.2f}")


if __name__ == "__main__":
    fix_all_share_ledgers()
