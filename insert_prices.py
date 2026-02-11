"""Run this in bench console: bench --site shop.localhost console"""
import frappe
import random

def insert_prices():
    items = frappe.db.sql("""
        SELECT name, item_code, item_name, stock_uom
        FROM `tabItem`
        WHERE disabled = 0 AND custom_show_on_web = 1
    """, as_dict=True)

    print(f"Found {len(items)} items")
    kg = "كجم"
    price_list = "Standard Selling"
    created = updated = skipped = 0

    for item in items:
        has_kg = item.stock_uom == kg or frappe.db.exists("UOM Conversion Detail", {"parent": item.name, "uom": kg})

        if not has_kg:
            skipped += 1
            continue

        price = random.randint(100, 500)
        existing = frappe.db.get_value("Item Price", {"item_code": item.item_code, "price_list": price_list, "uom": kg}, "name")

        if existing:
            frappe.db.set_value("Item Price", existing, "price_list_rate", price)
            updated += 1
            print(f"Updated: {item.item_name} = {price}")
        else:
            doc = frappe.get_doc({
                "doctype": "Item Price",
                "item_code": item.item_code,
                "price_list": price_list,
                "uom": kg,
                "price_list_rate": price
            })
            doc.insert()
            created += 1
            print(f"Created: {item.item_name} = {price}")

    frappe.db.commit()
    print(f"\nCreated: {created}, Updated: {updated}, Skipped: {skipped}")

# To run: bench --site shop.localhost console
# Then: from apps.mobile_pos.insert_prices import insert_prices; insert_prices()
