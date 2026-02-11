import frappe

def execute():
    """Create custom field for transfer type in Stock Entry"""
    # Check if field already exists
    if frappe.db.exists("Custom Field", {"dt": "Stock Entry", "fieldname": "transfer_type"}):
        print("Field 'transfer_type' already exists in Stock Entry")
        return

    # Create the custom field
    custom_field = frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Stock Entry",
        "fieldname": "transfer_type",
        "label": "نوع التحويل",
        "fieldtype": "Select",
        "options": "\nتحميل\nتفريغ",
        "insert_after": "stock_entry_type",
        "translatable": 0,
        "description": "تحميل = نقل للسيارة، تفريغ = نقل للمخزن الرئيسي"
    })
    custom_field.insert()
    frappe.db.commit()
    print("Created custom field 'transfer_type' in Stock Entry")
