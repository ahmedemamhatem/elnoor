"""
Fix incoming_rate on Sales Invoice Items where it was stored per Sales UOM (box)
instead of per Stock UOM (piece).

Also recalculates Share Ledger entries after fixing.

Run with: bench --site [sitename] execute mobile_pos.mobile_pos.fix_incoming_rate.fix_all
"""

import frappe
from frappe.utils import flt


def fix_all():
    """Fix incoming_rate on Sales Invoice Items and recalculate Share Ledger"""

    # Get all invoice items with CF > 1 that have Share Ledger entries
    items = frappe.db.sql("""
        SELECT sii.name as item_row_name, sii.parent, sii.item_code, sii.item_name,
               sii.qty, sii.uom, sii.stock_qty, sii.stock_uom,
               sii.conversion_factor, sii.rate, sii.incoming_rate,
               sle.valuation_rate as sle_val_rate
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabStock Ledger Entry` sle ON sle.item_code = sii.item_code 
            AND sle.voucher_no = sii.parent 
            AND sle.voucher_type = 'Sales Invoice'
            AND sle.is_cancelled = 0
        WHERE si.docstatus = 1 
        AND si.custom_mini_pos_profile IS NOT NULL
        AND si.custom_mini_pos_profile != ''
        AND sii.conversion_factor > 1
    """, as_dict=1)

    fixed_items = 0
    fixed_invoices = set()

    for item in items:
        sle_val = flt(item.sle_val_rate)
        inc = flt(item.incoming_rate)
        cf = flt(item.conversion_factor)

        if sle_val == 0:
            continue

        # Check if incoming_rate is wrong (stored per box = val * CF)
        is_per_box = abs(inc - sle_val * cf) < 5 and abs(inc - sle_val) >= 1

        if is_per_box:
            # Fix: set incoming_rate to the correct SLE valuation rate (per stock UOM)
            frappe.db.set_value("Sales Invoice Item", item.item_row_name,
                "incoming_rate", sle_val, update_modified=False)
            fixed_items += 1
            fixed_invoices.add(item.parent)
            print(f"  Fixed {item.parent} | {item.item_name}: incoming_rate {inc:.2f} -> {sle_val:.2f} (CF={cf})")

    frappe.db.commit()
    print(f"\nFixed {fixed_items} items in {len(fixed_invoices)} invoices")

    # Now recalculate all Share Ledger entries
    print("\n--- Recalculating Share Ledger entries ---")
    from mobile_pos.mobile_pos.fix_share_ledger_margin import fix_all as fix_share_ledger
    result = fix_share_ledger()

    return {"fixed_items": fixed_items, "fixed_invoices": len(fixed_invoices), "share_ledger": result}
