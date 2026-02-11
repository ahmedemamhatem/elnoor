#!/usr/bin/env python3
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def create_pos_user_type_field():
    """Create POS User Type custom field in User doctype"""

    # Check if field already exists
    if frappe.db.exists("Custom Field", "User-pos_user_type"):
        print("Custom field 'pos_user_type' already exists in User doctype")
        return

    # Create the custom field
    field_dict = {
        "dt": "User",
        "fieldname": "pos_user_type",
        "label": "POS User Type",
        "fieldtype": "Select",
        "options": "System User\nWebsite User\nAdmin",
        "default": "System User",
        "insert_after": "user_type",
        "description": "Select user type for POS access control",
        "in_standard_filter": 1,
        "translatable": 1,
    }

    try:
        create_custom_field("User", field_dict)
        frappe.db.commit()
        print("✓ Custom field 'pos_user_type' created successfully in User doctype")
    except Exception as e:
        print(f"✗ Error creating custom field: {str(e)}")
        frappe.db.rollback()

if __name__ == "__main__":
    frappe.init(site="shop.localhost")
    frappe.connect()
    create_pos_user_type_field()
    frappe.destroy()
