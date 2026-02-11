"""
Script to update incoming_rate for ALL items in Sales Invoice based on actual Stock Ledger Entry rates
and recalculate ALL Share Ledger entries.

This script:
1. Gets the incoming rate for each item from Item Price (with UOM conversion)
2. Updates ALL Sales Invoice Items incoming_rate (without touching selling rate)
3. Updates Bin valuation_rate for all items
4. Recalculates ALL Share Ledger entries based on new costs

Usage:
    bench --site elnoors.com execute mobile_pos.mobile_pos.utils.update_all_incoming_rates.run_update

For dry run (preview changes without applying):
    bench --site elnoors.com execute mobile_pos.mobile_pos.utils.update_all_incoming_rates.run_update --kwargs "{'dry_run': True}"
"""

import frappe
from frappe import _
from frappe.utils import flt, nowdate, cstr
from collections import defaultdict


def get_all_item_rates_from_item_price():
    """
    Get purchase price for ALL items from Item Price, converting to stock UOM rate.
    Returns dict: {item_code: rate_in_stock_uom}
    """
    item_rates = {}

    # Get all items with their UOMs
    items = frappe.db.sql("""
        SELECT
            name as item_code,
            stock_uom,
            purchase_uom
        FROM `tabItem`
        WHERE is_stock_item = 1 AND disabled = 0
    """, as_dict=True)

    for item in items:
        item_code = item.item_code
        stock_uom = item.stock_uom
        purchase_uom = item.purchase_uom or stock_uom

        # Get the default buying price from Item Price
        # Priority: valid price with buying=1, most recent
        price_data = frappe.db.sql("""
            SELECT
                ip.price_list_rate,
                ip.uom as price_uom,
                ip.currency
            FROM `tabItem Price` ip
            WHERE ip.item_code = %s
                AND ip.buying = 1
                AND (ip.valid_from IS NULL OR ip.valid_from <= %s)
                AND (ip.valid_upto IS NULL OR ip.valid_upto >= %s)
            ORDER BY ip.valid_from DESC, ip.creation DESC
            LIMIT 1
        """, (item_code, nowdate(), nowdate()), as_dict=True)

        if not price_data:
            continue

        price = price_data[0]
        price_list_rate = flt(price.price_list_rate)
        price_uom = price.price_uom or stock_uom

        if price_list_rate <= 0:
            continue

        # Convert price to stock UOM if needed
        rate_in_stock_uom = price_list_rate

        if price_uom and price_uom != stock_uom:
            # Get conversion factor from UOM Conversion Detail in Item
            conversion_factor = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "uom": price_uom},
                "conversion_factor"
            )

            if conversion_factor and flt(conversion_factor) > 0:
                # price_list_rate is per price_uom
                # rate_in_stock_uom = price_list_rate / conversion_factor
                rate_in_stock_uom = price_list_rate / flt(conversion_factor)
            else:
                # Try global UOM conversion
                global_conversion = frappe.db.get_value(
                    "UOM Conversion Factor",
                    {"from_uom": price_uom, "to_uom": stock_uom},
                    "value"
                )
                if global_conversion:
                    rate_in_stock_uom = price_list_rate * flt(global_conversion)

        item_rates[item_code] = rate_in_stock_uom

    return item_rates


def update_all_sales_invoice_items(item_rates, dry_run=False):
    """
    Update ALL Sales Invoice Items incoming_rate based on Item Price rates
    WITHOUT touching rate or amount - preserves selling price and grand_total
    """
    updated_count = 0
    changes = []

    # Get ALL Sales Invoice Items from submitted invoices
    all_si_items = frappe.db.sql("""
        SELECT
            sii.name,
            sii.item_code,
            sii.incoming_rate,
            sii.parent,
            sii.qty,
            sii.stock_qty,
            sii.rate,
            sii.conversion_factor
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
        ORDER BY si.posting_date, si.creation
    """, as_dict=True)

    print(f"    Found {len(all_si_items)} total Sales Invoice Items")

    for sii in all_si_items:
        item_code = sii.item_code

        # Get rate from Item Price
        if item_code not in item_rates:
            continue

        new_rate = item_rates[item_code]
        old_rate = flt(sii.incoming_rate)

        # Apply conversion factor if exists (for different UOM in invoice)
        conversion_factor = flt(sii.conversion_factor) or 1
        if conversion_factor != 1:
            new_rate = new_rate * conversion_factor

        if abs(old_rate - new_rate) > 0.01:
            changes.append({
                "doctype": "Sales Invoice Item",
                "name": sii.name,
                "item_code": item_code,
                "voucher": f"Sales Invoice: {sii.parent}",
                "field": "incoming_rate",
                "old_value": old_rate,
                "new_value": new_rate,
                "qty": sii.stock_qty or sii.qty,
                "selling_rate": sii.rate
            })

            if not dry_run:
                frappe.db.sql("""
                    UPDATE `tabSales Invoice Item`
                    SET incoming_rate = %s
                    WHERE name = %s
                """, (new_rate, sii.name))

            updated_count += 1

    return updated_count, changes


def update_bin_valuation_rates(item_rates, dry_run=False):
    """
    Update Bin valuation_rate for all items based on Item Price
    """
    updated_count = 0
    changes = []

    for item_code, new_rate in item_rates.items():
        # Get all Bins for this item
        bins = frappe.db.sql("""
            SELECT name, warehouse, valuation_rate, actual_qty, stock_value
            FROM `tabBin`
            WHERE item_code = %s
        """, (item_code,), as_dict=True)

        for bin_doc in bins:
            old_rate = flt(bin_doc.valuation_rate)
            if abs(old_rate - new_rate) > 0.01:
                new_stock_value = flt(bin_doc.actual_qty) * new_rate

                changes.append({
                    "doctype": "Bin",
                    "name": bin_doc.name,
                    "item_code": item_code,
                    "warehouse": bin_doc.warehouse,
                    "field": "valuation_rate",
                    "old_value": old_rate,
                    "new_value": new_rate,
                    "qty": bin_doc.actual_qty,
                    "old_stock_value": bin_doc.stock_value,
                    "new_stock_value": new_stock_value
                })

                if not dry_run:
                    frappe.db.sql("""
                        UPDATE `tabBin`
                        SET valuation_rate = %s,
                            stock_value = %s
                        WHERE name = %s
                    """, (new_rate, new_stock_value, bin_doc.name))

                updated_count += 1

    return updated_count, changes


def recalculate_all_share_ledger(dry_run=False):
    """
    Recalculate ALL Share Ledger entries based on current incoming_rate in Sales Invoices
    Share amount = sum((rate - incoming_rate) * qty) * percentage / 100
    """
    updated_count = 0
    changes = []

    # Get ALL submitted Share Ledger entries from Sales Invoices
    share_ledgers = frappe.db.sql("""
        SELECT sl.name, sl.voucher_type, sl.voucher_no, sl.percentage,
               sl.revenue_amount, sl.expense_amount, sl.net_amount, sl.share_amount,
               sl.transaction_type
        FROM `tabShare Ledger` sl
        WHERE sl.voucher_type = 'Sales Invoice'
        AND sl.docstatus = 1
    """, as_dict=True)

    print(f"    Found {len(share_ledgers)} Share Ledger entries to process")

    for sl in share_ledgers:
        # Get Sales Invoice items with current incoming rates
        si_items = frappe.db.sql("""
            SELECT sii.rate, sii.incoming_rate, sii.qty
            FROM `tabSales Invoice Item` sii
            WHERE sii.parent = %s
        """, (sl.voucher_no,), as_dict=True)

        if not si_items:
            continue

        # Calculate new margin based on transaction type
        if sl.transaction_type == "Sales Return":
            # For returns, the margin is negative (expense)
            total_margin = sum((flt(item.rate) - flt(item.incoming_rate)) * abs(flt(item.qty)) for item in si_items)
            new_revenue = 0
            new_expense = total_margin
        else:  # Sales
            total_margin = sum((flt(item.rate) - flt(item.incoming_rate)) * flt(item.qty) for item in si_items)
            new_revenue = total_margin
            new_expense = 0

        new_net_amount = new_revenue - new_expense
        new_share_amount = new_net_amount * flt(sl.percentage) / 100

        # Always update to ensure consistency
        if abs(flt(sl.revenue_amount) - new_revenue) > 0.001 or \
           abs(flt(sl.expense_amount) - new_expense) > 0.001 or \
           abs(flt(sl.share_amount) - new_share_amount) > 0.001:

            changes.append({
                "doctype": "Share Ledger",
                "name": sl.name,
                "voucher": f"Sales Invoice: {sl.voucher_no}",
                "transaction_type": sl.transaction_type,
                "percentage": sl.percentage,
                "old_revenue": sl.revenue_amount,
                "new_revenue": new_revenue,
                "old_expense": sl.expense_amount,
                "new_expense": new_expense,
                "old_share_amount": sl.share_amount,
                "new_share_amount": new_share_amount
            })

            if not dry_run:
                frappe.db.sql("""
                    UPDATE `tabShare Ledger`
                    SET revenue_amount = %s,
                        expense_amount = %s,
                        net_amount = %s,
                        share_amount = %s
                    WHERE name = %s
                """, (new_revenue, new_expense, new_net_amount, new_share_amount, sl.name))

            updated_count += 1

    return updated_count, changes


def run_update(dry_run=False):
    """
    Main function to update ALL items incoming rates and recalculate Share Ledger

    Args:
        dry_run: If True, only shows what would be changed without making changes
    """
    print("\n" + "="*80)
    print("UPDATE ALL INCOMING RATES & SHARE LEDGER")
    print("="*80)

    if dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***\n")

    all_changes = []

    # Step 1: Get item rates from Item Price
    print("\n[1/4] Getting item purchase prices with UOM conversion...")
    item_rates = get_all_item_rates_from_item_price()
    print(f"    Found {len(item_rates)} items with valid purchase prices")

    if not item_rates:
        print("\nNo items with valid purchase prices found. Exiting.")
        return

    # Print sample of rates
    print("\n    Sample rates (first 15):")
    for i, (item, rate) in enumerate(list(item_rates.items())[:15]):
        print(f"      {item}: {rate:.4f}")

    # Step 2: Update ALL Sales Invoice Items
    print("\n[2/4] Updating ALL Sales Invoice Items incoming_rate...")
    si_count, si_changes = update_all_sales_invoice_items(item_rates, dry_run)
    print(f"    Updated {si_count} Sales Invoice Items")
    all_changes.extend(si_changes)

    # Step 3: Update Bin valuation rates
    print("\n[3/4] Updating Bin valuation rates...")
    bin_count, bin_changes = update_bin_valuation_rates(item_rates, dry_run)
    print(f"    Updated {bin_count} Bin records")
    all_changes.extend(bin_changes)

    # Step 4: Recalculate ALL Share Ledger
    print("\n[4/4] Recalculating ALL Share Ledger entries...")
    sl_count, sl_changes = recalculate_all_share_ledger(dry_run)
    print(f"    Updated {sl_count} Share Ledger entries")
    all_changes.extend(sl_changes)

    # Summary
    total_updates = si_count + bin_count + sl_count

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"  Items with Purchase Prices: {len(item_rates)}")
    print(f"  Sales Invoice Items:        {si_count}")
    print(f"  Bin records:                {bin_count}")
    print(f"  Share Ledger entries:       {sl_count}")
    print(f"  --------------------------")
    print(f"  TOTAL UPDATES:              {total_updates}")

    if not dry_run:
        frappe.db.commit()
        print("\n*** All changes have been committed to database ***")
    else:
        print("\n*** DRY RUN COMPLETE - No changes were made ***")
        print("    Run without dry_run=True to apply changes")

    # Save detailed changes to file for review
    if all_changes:
        log_file = f"/tmp/all_incoming_rates_update_log_{nowdate()}.txt"
        with open(log_file, "w") as f:
            f.write(f"All Incoming Rates Update Log - {nowdate()}\n")
            f.write(f"Dry Run: {dry_run}\n")
            f.write(f"Items with prices: {len(item_rates)}\n")
            f.write("="*80 + "\n\n")

            for change in all_changes:
                f.write(str(change) + "\n")

        print(f"\n    Detailed changes logged to: {log_file}")

    return {
        "total_updates": total_updates,
        "items_with_prices": len(item_rates),
        "si_count": si_count,
        "bin_count": bin_count,
        "sl_count": sl_count,
        "dry_run": dry_run
    }


def show_items_without_prices():
    """
    Utility function to show items that don't have a valid purchase price
    Usage:
        bench --site elnoors.com execute mobile_pos.mobile_pos.utils.update_all_incoming_rates.show_items_without_prices
    """
    # Get all stock items
    all_items = frappe.db.sql_list("""
        SELECT name FROM `tabItem`
        WHERE is_stock_item = 1 AND disabled = 0
    """)

    # Get items with prices
    item_rates = get_all_item_rates_from_item_price()

    # Find items without prices
    items_without_prices = [item for item in all_items if item not in item_rates]

    print(f"\n{'='*80}")
    print(f"ITEMS WITHOUT VALID PURCHASE PRICE")
    print(f"{'='*80}")
    print(f"Total stock items: {len(all_items)}")
    print(f"Items with prices: {len(item_rates)}")
    print(f"Items without prices: {len(items_without_prices)}")
    print(f"\nItems without valid purchase price:")

    for item in items_without_prices:
        print(f"  - {item}")

    return items_without_prices
