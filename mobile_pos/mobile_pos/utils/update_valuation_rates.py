"""
Script to update all item valuation rates and incoming rates from default Purchase Item Price
This script will:
1. Get new valuation rates from Item Price (considering UOM conversion)
2. Update Stock Ledger Entry incoming_rate and valuation_rate
3. Update GL Entry amounts for stock valuation accounts
4. Update Purchase Receipt Item valuation_rate
5. Update Stock Entry Detail basic_rate and valuation_rate
6. Update Sales Invoice Item incoming_rate (without touching selling rate or grand_total)
7. Recalculate Share Ledger entries based on new costs

Usage:
    bench --site elnoors.com execute mobile_pos.mobile_pos.scripts.update_valuation_rates.run_update

For dry run (preview changes without applying):
    bench --site elnoors.com execute mobile_pos.mobile_pos.scripts.update_valuation_rates.run_update --kwargs "{'dry_run': True}"
"""

import frappe
from frappe import _
from frappe.utils import flt, nowdate, cstr
from collections import defaultdict


def get_item_purchase_price_with_uom_conversion():
    """
    Get purchase price for all items from Item Price, converting to stock UOM rate.
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
            # No valid buying price found
            continue

        price = price_data[0]
        price_list_rate = flt(price.price_list_rate)
        price_uom = price.price_uom or stock_uom

        if price_list_rate <= 0:
            continue

        # Convert price to stock UOM if needed
        rate_in_stock_uom = price_list_rate

        if price_uom != stock_uom:
            # Get conversion factor from UOM Conversion Detail in Item
            conversion_factor = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "uom": price_uom},
                "conversion_factor"
            )

            if conversion_factor:
                # price_list_rate is per price_uom
                # rate_in_stock_uom = price_list_rate / conversion_factor
                # Because: qty_in_stock_uom = qty_in_price_uom * conversion_factor
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
                else:
                    # No conversion found, assume same UOM
                    frappe.log_error(
                        f"No UOM conversion found for {item_code}: {price_uom} -> {stock_uom}",
                        "Valuation Rate Update Warning"
                    )

        item_rates[item_code] = rate_in_stock_uom

    return item_rates


def update_stock_ledger_entries(item_rates, dry_run=False):
    """Update Stock Ledger Entry incoming_rate and recalculate valuation_rate"""
    updated_count = 0
    changes = []

    for item_code, new_rate in item_rates.items():
        # Get all SLE for this item
        sles = frappe.db.sql("""
            SELECT name, incoming_rate, valuation_rate, actual_qty,
                   stock_value_difference, voucher_type, voucher_no
            FROM `tabStock Ledger Entry`
            WHERE item_code = %s AND is_cancelled = 0
            ORDER BY posting_datetime, creation
        """, (item_code,), as_dict=True)

        for sle in sles:
            if flt(sle.actual_qty) > 0:  # Incoming transaction
                old_rate = flt(sle.incoming_rate)
                if abs(old_rate - new_rate) > 0.01:  # Only update if there's a difference
                    new_stock_value_diff = flt(sle.actual_qty) * new_rate

                    changes.append({
                        "doctype": "Stock Ledger Entry",
                        "name": sle.name,
                        "item_code": item_code,
                        "voucher": f"{sle.voucher_type}: {sle.voucher_no}",
                        "field": "incoming_rate",
                        "old_value": old_rate,
                        "new_value": new_rate,
                        "qty": sle.actual_qty
                    })

                    if not dry_run:
                        frappe.db.sql("""
                            UPDATE `tabStock Ledger Entry`
                            SET incoming_rate = %s,
                                valuation_rate = %s,
                                stock_value_difference = %s
                            WHERE name = %s
                        """, (new_rate, new_rate, new_stock_value_diff, sle.name))

                    updated_count += 1

    return updated_count, changes


def update_purchase_receipt_items(item_rates, dry_run=False):
    """Update Purchase Receipt Item valuation_rate"""
    updated_count = 0
    changes = []

    for item_code, new_rate in item_rates.items():
        # Get all Purchase Receipt Items for this item
        pr_items = frappe.db.sql("""
            SELECT pri.name, pri.valuation_rate, pri.parent, pri.qty, pri.stock_qty
            FROM `tabPurchase Receipt Item` pri
            JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
            WHERE pri.item_code = %s AND pr.docstatus = 1
        """, (item_code,), as_dict=True)

        for pri in pr_items:
            old_rate = flt(pri.valuation_rate)
            if abs(old_rate - new_rate) > 0.01:
                changes.append({
                    "doctype": "Purchase Receipt Item",
                    "name": pri.name,
                    "item_code": item_code,
                    "voucher": f"Purchase Receipt: {pri.parent}",
                    "field": "valuation_rate",
                    "old_value": old_rate,
                    "new_value": new_rate,
                    "qty": pri.stock_qty or pri.qty
                })

                if not dry_run:
                    frappe.db.sql("""
                        UPDATE `tabPurchase Receipt Item`
                        SET valuation_rate = %s
                        WHERE name = %s
                    """, (new_rate, pri.name))

                updated_count += 1

    return updated_count, changes


def update_stock_entry_details(item_rates, dry_run=False):
    """Update Stock Entry Detail basic_rate and valuation_rate"""
    updated_count = 0
    changes = []

    for item_code, new_rate in item_rates.items():
        # Get all Stock Entry Details for this item (Material Receipt type)
        se_items = frappe.db.sql("""
            SELECT sed.name, sed.basic_rate, sed.valuation_rate, sed.parent,
                   sed.transfer_qty, sed.t_warehouse
            FROM `tabStock Entry Detail` sed
            JOIN `tabStock Entry` se ON se.name = sed.parent
            WHERE sed.item_code = %s AND se.docstatus = 1
                AND sed.t_warehouse IS NOT NULL
        """, (item_code,), as_dict=True)

        for sed in se_items:
            old_rate = flt(sed.basic_rate)
            if abs(old_rate - new_rate) > 0.01:
                new_amount = flt(sed.transfer_qty) * new_rate

                changes.append({
                    "doctype": "Stock Entry Detail",
                    "name": sed.name,
                    "item_code": item_code,
                    "voucher": f"Stock Entry: {sed.parent}",
                    "field": "basic_rate",
                    "old_value": old_rate,
                    "new_value": new_rate,
                    "qty": sed.transfer_qty
                })

                if not dry_run:
                    frappe.db.sql("""
                        UPDATE `tabStock Entry Detail`
                        SET basic_rate = %s,
                            valuation_rate = %s,
                            basic_amount = %s,
                            amount = %s
                        WHERE name = %s
                    """, (new_rate, new_rate, new_amount, new_amount, sed.name))

                updated_count += 1

    return updated_count, changes


def update_sales_invoice_items(item_rates, dry_run=False):
    """
    Update Sales Invoice Item incoming_rate WITHOUT touching rate or amount
    This preserves selling price and grand_total
    """
    updated_count = 0
    changes = []

    for item_code, new_rate in item_rates.items():
        # Get all Sales Invoice Items for this item
        si_items = frappe.db.sql("""
            SELECT sii.name, sii.incoming_rate, sii.parent, sii.qty, sii.stock_qty, sii.rate
            FROM `tabSales Invoice Item` sii
            JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE sii.item_code = %s AND si.docstatus = 1 AND si.update_stock = 1
        """, (item_code,), as_dict=True)

        for sii in si_items:
            old_rate = flt(sii.incoming_rate)
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
                    "selling_rate": sii.rate  # Preserved
                })

                if not dry_run:
                    # Only update incoming_rate, NOT rate or amount
                    frappe.db.sql("""
                        UPDATE `tabSales Invoice Item`
                        SET incoming_rate = %s
                        WHERE name = %s
                    """, (new_rate, sii.name))

                updated_count += 1

    return updated_count, changes


def update_delivery_note_items(item_rates, dry_run=False):
    """Update Delivery Note Item incoming_rate"""
    updated_count = 0
    changes = []

    for item_code, new_rate in item_rates.items():
        dn_items = frappe.db.sql("""
            SELECT dni.name, dni.incoming_rate, dni.parent, dni.qty, dni.stock_qty
            FROM `tabDelivery Note Item` dni
            JOIN `tabDelivery Note` dn ON dn.name = dni.parent
            WHERE dni.item_code = %s AND dn.docstatus = 1
        """, (item_code,), as_dict=True)

        for dni in dn_items:
            old_rate = flt(dni.incoming_rate)
            if abs(old_rate - new_rate) > 0.01:
                changes.append({
                    "doctype": "Delivery Note Item",
                    "name": dni.name,
                    "item_code": item_code,
                    "voucher": f"Delivery Note: {dni.parent}",
                    "field": "incoming_rate",
                    "old_value": old_rate,
                    "new_value": new_rate,
                    "qty": dni.stock_qty or dni.qty
                })

                if not dry_run:
                    frappe.db.sql("""
                        UPDATE `tabDelivery Note Item`
                        SET incoming_rate = %s
                        WHERE name = %s
                    """, (new_rate, dni.name))

                updated_count += 1

    return updated_count, changes


def update_gl_entries(item_rates, dry_run=False):
    """
    Update GL Entry amounts for stock valuation accounts
    This recalculates debit/credit based on new stock values
    """
    updated_count = 0
    changes = []

    # Get stock-in-hand accounts
    stock_accounts = frappe.db.sql_list("""
        SELECT DISTINCT account FROM `tabGL Entry`
        WHERE voucher_type IN ('Purchase Receipt', 'Stock Entry', 'Sales Invoice', 'Delivery Note')
        AND account IN (
            SELECT name FROM `tabAccount`
            WHERE account_type IN ('Stock', 'Stock Received But Not Billed', 'Stock Adjustment')
        )
    """)

    # Process by voucher to maintain balance
    vouchers = frappe.db.sql("""
        SELECT DISTINCT sle.voucher_type, sle.voucher_no, sle.item_code
        FROM `tabStock Ledger Entry` sle
        WHERE sle.is_cancelled = 0
        AND sle.item_code IN %(items)s
    """, {"items": list(item_rates.keys())}, as_dict=True)

    voucher_updates = defaultdict(list)
    for v in vouchers:
        voucher_updates[(v.voucher_type, v.voucher_no)].append(v.item_code)

    for (voucher_type, voucher_no), items in voucher_updates.items():
        # Calculate old and new stock value for this voucher
        old_value = 0
        new_value = 0

        for item_code in items:
            sle = frappe.db.get_value(
                "Stock Ledger Entry",
                {"voucher_type": voucher_type, "voucher_no": voucher_no, "item_code": item_code, "is_cancelled": 0},
                ["actual_qty", "incoming_rate"],
                as_dict=True
            )
            if sle and flt(sle.actual_qty) > 0:
                old_value += flt(sle.actual_qty) * flt(sle.incoming_rate)
                new_value += flt(sle.actual_qty) * flt(item_rates.get(item_code, sle.incoming_rate))

        value_diff = new_value - old_value

        if abs(value_diff) > 0.01:
            # Update GL entries for stock accounts
            gl_entries = frappe.db.sql("""
                SELECT name, account, debit, credit, debit_in_account_currency, credit_in_account_currency
                FROM `tabGL Entry`
                WHERE voucher_type = %s AND voucher_no = %s
                AND account IN %(accounts)s
                AND is_cancelled = 0
            """, (voucher_type, voucher_no, stock_accounts), as_dict=True)

            for gle in gl_entries:
                # Adjust based on whether it's debit or credit entry
                if flt(gle.debit) > 0:
                    new_debit = flt(gle.debit) + value_diff
                    if new_debit > 0:
                        changes.append({
                            "doctype": "GL Entry",
                            "name": gle.name,
                            "voucher": f"{voucher_type}: {voucher_no}",
                            "account": gle.account,
                            "field": "debit",
                            "old_value": gle.debit,
                            "new_value": new_debit
                        })

                        if not dry_run:
                            frappe.db.sql("""
                                UPDATE `tabGL Entry`
                                SET debit = %s, debit_in_account_currency = %s
                                WHERE name = %s
                            """, (new_debit, new_debit, gle.name))

                        updated_count += 1

                elif flt(gle.credit) > 0:
                    new_credit = flt(gle.credit) + value_diff
                    if new_credit > 0:
                        changes.append({
                            "doctype": "GL Entry",
                            "name": gle.name,
                            "voucher": f"{voucher_type}: {voucher_no}",
                            "account": gle.account,
                            "field": "credit",
                            "old_value": gle.credit,
                            "new_value": new_credit
                        })

                        if not dry_run:
                            frappe.db.sql("""
                                UPDATE `tabGL Entry`
                                SET credit = %s, credit_in_account_currency = %s
                                WHERE name = %s
                            """, (new_credit, new_credit, gle.name))

                        updated_count += 1

    return updated_count, changes


def recalculate_share_ledger(dry_run=False):
    """
    Recalculate Share Ledger entries based on new incoming_rate in Sales Invoices
    Share amount = sum((rate - incoming_rate) * qty) * percentage / 100
    """
    updated_count = 0
    changes = []

    # Get all submitted Share Ledger entries from Sales Invoices
    share_ledgers = frappe.db.sql("""
        SELECT sl.name, sl.voucher_type, sl.voucher_no, sl.percentage,
               sl.revenue_amount, sl.expense_amount, sl.net_amount, sl.share_amount,
               sl.transaction_type
        FROM `tabShare Ledger` sl
        WHERE sl.voucher_type = 'Sales Invoice'
        AND sl.docstatus = 1
    """, as_dict=True)

    for sl in share_ledgers:
        # Get Sales Invoice items with new incoming rates
        si_items = frappe.db.sql("""
            SELECT sii.rate, sii.incoming_rate, sii.qty
            FROM `tabSales Invoice Item` sii
            WHERE sii.parent = %s
        """, (sl.voucher_no,), as_dict=True)

        # Calculate new margin
        if sl.transaction_type == "Sales Return":
            total_margin = sum((flt(item.rate) - flt(item.incoming_rate)) * abs(flt(item.qty)) for item in si_items)
            new_revenue = 0
            new_expense = total_margin
        else:  # Sales
            total_margin = sum((flt(item.rate) - flt(item.incoming_rate)) * flt(item.qty) for item in si_items)
            new_revenue = total_margin
            new_expense = 0

        new_net_amount = new_revenue - new_expense
        new_share_amount = new_net_amount * flt(sl.percentage) / 100

        # Check if there's a change
        if abs(flt(sl.revenue_amount) - new_revenue) > 0.01 or \
           abs(flt(sl.expense_amount) - new_expense) > 0.01:

            changes.append({
                "doctype": "Share Ledger",
                "name": sl.name,
                "voucher": f"Sales Invoice: {sl.voucher_no}",
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
    Main function to run all updates

    Args:
        dry_run: If True, only shows what would be changed without making changes
    """
    print("\n" + "="*80)
    print("VALUATION RATE UPDATE SCRIPT")
    print("="*80)

    if dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***\n")

    # Step 1: Get item rates from purchase price
    print("\n[1/7] Getting item purchase prices with UOM conversion...")
    item_rates = get_item_purchase_price_with_uom_conversion()
    print(f"    Found {len(item_rates)} items with valid purchase prices")

    if not item_rates:
        print("\nNo items with valid purchase prices found. Exiting.")
        return

    # Print sample of rates
    print("\n    Sample rates (first 10):")
    for i, (item, rate) in enumerate(list(item_rates.items())[:10]):
        print(f"      {item}: {rate:.4f}")

    all_changes = []

    # Step 2: Update Stock Ledger Entries
    print("\n[2/7] Updating Stock Ledger Entries...")
    sle_count, sle_changes = update_stock_ledger_entries(item_rates, dry_run)
    print(f"    Updated {sle_count} Stock Ledger Entries")
    all_changes.extend(sle_changes)

    # Step 3: Update Purchase Receipt Items
    print("\n[3/7] Updating Purchase Receipt Items...")
    pr_count, pr_changes = update_purchase_receipt_items(item_rates, dry_run)
    print(f"    Updated {pr_count} Purchase Receipt Items")
    all_changes.extend(pr_changes)

    # Step 4: Update Stock Entry Details
    print("\n[4/7] Updating Stock Entry Details...")
    se_count, se_changes = update_stock_entry_details(item_rates, dry_run)
    print(f"    Updated {se_count} Stock Entry Details")
    all_changes.extend(se_changes)

    # Step 5: Update Sales Invoice Items (incoming_rate only)
    print("\n[5/7] Updating Sales Invoice Items (incoming_rate only, preserving selling rate)...")
    si_count, si_changes = update_sales_invoice_items(item_rates, dry_run)
    print(f"    Updated {si_count} Sales Invoice Items")
    all_changes.extend(si_changes)

    # Step 6: Update Delivery Note Items
    print("\n[6/7] Updating Delivery Note Items...")
    dn_count, dn_changes = update_delivery_note_items(item_rates, dry_run)
    print(f"    Updated {dn_count} Delivery Note Items")
    all_changes.extend(dn_changes)

    # Step 7: Recalculate Share Ledger
    print("\n[7/7] Recalculating Share Ledger entries...")
    sl_count, sl_changes = recalculate_share_ledger(dry_run)
    print(f"    Updated {sl_count} Share Ledger entries")
    all_changes.extend(sl_changes)

    # Summary
    total_updates = sle_count + pr_count + se_count + si_count + dn_count + sl_count

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"  Stock Ledger Entries:    {sle_count}")
    print(f"  Purchase Receipt Items:  {pr_count}")
    print(f"  Stock Entry Details:     {se_count}")
    print(f"  Sales Invoice Items:     {si_count}")
    print(f"  Delivery Note Items:     {dn_count}")
    print(f"  Share Ledger entries:    {sl_count}")
    print(f"  --------------------------")
    print(f"  TOTAL UPDATES:           {total_updates}")

    if not dry_run:
        frappe.db.commit()
        print("\n*** All changes have been committed to database ***")
    else:
        print("\n*** DRY RUN COMPLETE - No changes were made ***")
        print("    Run without dry_run=True to apply changes")

    # Save detailed changes to file for review
    if all_changes:
        log_file = f"/tmp/valuation_update_log_{nowdate()}.txt"
        with open(log_file, "w") as f:
            f.write(f"Valuation Rate Update Log - {nowdate()}\n")
            f.write(f"Dry Run: {dry_run}\n")
            f.write("="*80 + "\n\n")

            for change in all_changes:
                f.write(str(change) + "\n")

        print(f"\n    Detailed changes logged to: {log_file}")

    return {
        "total_updates": total_updates,
        "sle_count": sle_count,
        "pr_count": pr_count,
        "se_count": se_count,
        "si_count": si_count,
        "dn_count": dn_count,
        "sl_count": sl_count,
        "dry_run": dry_run
    }


# Additional utility function to update GL entries separately if needed
def update_gl_entries_separately(dry_run=False):
    """
    Run GL Entry updates separately (can be time consuming)
    Usage:
        bench --site elnoors.com execute mobile_pos.mobile_pos.scripts.update_valuation_rates.update_gl_entries_separately
    """
    print("\nUpdating GL Entries for stock valuation accounts...")
    item_rates = get_item_purchase_price_with_uom_conversion()
    gl_count, gl_changes = update_gl_entries(item_rates, dry_run)
    print(f"Updated {gl_count} GL Entries")

    if not dry_run:
        frappe.db.commit()

    return gl_count
