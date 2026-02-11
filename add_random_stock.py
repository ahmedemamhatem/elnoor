#!/usr/bin/env python3
"""Add random stock quantities to items"""

import frappe
import random

frappe.init(site="shop.localhost")
frappe.connect()

# Get all items with custom_show_on_web = 1
items = frappe.get_all('Item',
    filters={'custom_show_on_web': 1, 'disabled': 0},
    fields=['name', 'item_code', 'item_name']
)

# Get default warehouse
warehouse = frappe.db.get_value('Warehouse', {'is_group': 0}, 'name')
if not warehouse:
    print("No warehouse found! Creating default warehouse...")
    warehouse_doc = frappe.get_doc({
        'doctype': 'Warehouse',
        'warehouse_name': 'Stores',
        'is_group': 0,
        'company': frappe.db.get_value('Company', {}, 'name')
    })
    warehouse_doc.insert()
    warehouse = warehouse_doc.name

print(f"\nUsing warehouse: {warehouse}")
print(f"Found {len(items)} items to update\n")

for item in items:
    # Random stock between 0 and 100
    # 70% chance of having stock (1-100), 30% chance of no stock (0)
    if random.random() < 0.7:
        stock_qty = random.randint(1, 100)
    else:
        stock_qty = 0

    # Check if Bin exists
    bin_exists = frappe.db.exists('Bin', {
        'item_code': item.item_code,
        'warehouse': warehouse
    })

    if bin_exists:
        # Update existing Bin
        frappe.db.set_value('Bin', bin_exists, {
            'actual_qty': stock_qty,
            'projected_qty': stock_qty,
            'reserved_qty': 0,
            'ordered_qty': 0,
            'indented_qty': 0,
            'planned_qty': 0
        })
        print(f"✅ Updated {item.item_name}: {stock_qty} units")
    else:
        # Create new Bin
        bin_doc = frappe.get_doc({
            'doctype': 'Bin',
            'item_code': item.item_code,
            'warehouse': warehouse,
            'actual_qty': stock_qty,
            'projected_qty': stock_qty,
            'reserved_qty': 0,
            'ordered_qty': 0,
            'indented_qty': 0,
            'planned_qty': 0
        })
        bin_doc.insert()
        print(f"✅ Created {item.item_name}: {stock_qty} units")

frappe.db.commit()
print(f"\n{'='*60}")
print(f"✅ Successfully updated stock for {len(items)} items!")
print(f"{'='*60}\n")

frappe.destroy()
