"""
Fix Share Ledger entries - Revenue = (rate * qty) - (incoming_rate * stock_qty)
Correctly accounts for UOM conversion factor.
rate is per Sales UOM, incoming_rate is per Stock UOM.
"""

import frappe
from frappe.utils import flt


def fix_all():
    """Fix all Share Ledger entries using correct UOM-aware margin calculation"""

    share_ledgers = frappe.get_all(
        "Share Ledger",
        filters={
            "voucher_type": "Sales Invoice",
            "docstatus": ["in", [0, 1]]
        },
        fields=["name", "voucher_no", "revenue_amount", "expense_amount", "percentage", "docstatus"]
    )

    print(f"Found {len(share_ledgers)} Share Ledger entries to process")

    updated_count = 0
    error_count = 0
    skipped_count = 0

    for sl in share_ledgers:
        try:
            if not frappe.db.exists("Sales Invoice", sl.voucher_no):
                skipped_count += 1
                continue

            doc = frappe.get_doc("Sales Invoice", sl.voucher_no)

            # Calculate margin = (rate * qty) - (incoming_rate * stock_qty)
            # rate is per Sales UOM, incoming_rate is per Stock UOM
            if doc.is_return:
                # For returns, margin is an expense (profit lost)
                total_margin = sum(
                    (flt(item.rate) * abs(flt(item.qty))) - (flt(item.incoming_rate) * abs(flt(item.stock_qty)))
                    for item in doc.items
                )
                new_revenue = 0
                new_expense = total_margin
            else:
                # For normal sales, margin is revenue
                total_margin = sum(
                    (flt(item.rate) * flt(item.qty)) - (flt(item.incoming_rate) * flt(item.stock_qty))
                    for item in doc.items
                )
                new_revenue = total_margin
                new_expense = 0

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

                print(f"  Updated {sl.name} ({sl.voucher_no}): revenue {old_revenue:.2f} -> {new_revenue:.2f}, share {share_amount:.2f}")
                updated_count += 1
            else:
                skipped_count += 1

        except Exception as e:
            print(f"  Error {sl.name}: {str(e)[:80]}")
            error_count += 1

    frappe.db.commit()
    print(f"\nCompleted: {updated_count} updated, {skipped_count} skipped, {error_count} errors")
    return {"updated": updated_count, "skipped": skipped_count, "errors": error_count}
