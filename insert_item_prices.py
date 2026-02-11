#!/usr/bin/env python3
"""
Script to insert random prices for all items with KG (كجم) UOM
Prices range from 100 to 500
"""

import frappe
import random
from frappe import _

def insert_random_prices():
    """Insert random prices for all items with KG UOM"""

    # Get all items where custom_show_on_web = 1
    items = frappe.db.sql("""
        SELECT
            name,
            item_code,
            item_name,
            stock_uom
        FROM `tabItem`
        WHERE disabled = 0
        AND custom_show_on_web = 1
    """, as_dict=True)

    print(f"\n{'='*60}")
    print(f"Found {len(items)} items with 'Show on Web' enabled")
    print(f"{'='*60}\n")

    price_list = "Standard Selling"
    kg_uom = "كجم"
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for item in items:
        # Check if item has KG as stock_uom or in conversion details
        has_kg = False

        if item.stock_uom == kg_uom:
            has_kg = True
        else:
            # Check UOM conversions
            uom_exists = frappe.db.exists("UOM Conversion Detail", {
                "parent": item.name,
                "uom": kg_uom
            })
            if uom_exists:
                has_kg = True

        if not has_kg:
            print(f"⏭️  Skipped: {item.item_name} (no KG UOM)")
            skipped_count += 1
            continue

        # Generate random price between 100 and 500
        random_price = random.randint(100, 500)

        # Check if price already exists
        existing_price = frappe.db.get_value("Item Price", {
            "item_code": item.item_code,
            "price_list": price_list,
            "uom": kg_uom
        }, "name")

        if existing_price:
            # Update existing price
            price_doc = frappe.get_doc("Item Price", existing_price)
            old_price = price_doc.price_list_rate
            price_doc.price_list_rate = random_price
            price_doc.save()
            frappe.db.commit()
            print(f"✏️  Updated: {item.item_name} - {old_price} → {random_price} ج.م")
            updated_count += 1
        else:
            # Create new price
            price_doc = frappe.get_doc({
                "doctype": "Item Price",
                "item_code": item.item_code,
                "price_list": price_list,
                "uom": kg_uom,
                "price_list_rate": random_price
            })
            price_doc.insert()
            frappe.db.commit()
            print(f"✅ Created: {item.item_name} - {random_price} ج.م")
            created_count += 1

    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  ✅ Created: {created_count} prices")
    print(f"  ✏️  Updated: {updated_count} prices")
    print(f"  ⏭️  Skipped: {skipped_count} items (no KG UOM)")
    print(f"  📊 Total: {len(items)} items processed")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    # Run in Frappe context
    frappe.init(site="shop.localhost")
    frappe.connect()
    frappe.set_user("Administrator")

    try:
        insert_random_prices()
        print("✅ Price insertion completed successfully!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        frappe.destroy()
