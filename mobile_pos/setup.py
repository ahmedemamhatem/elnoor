import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_migrate():
    """Run after migrate to create custom fields and blocks"""
    create_pos_custom_fields()
    create_pos_html_blocks()

def create_pos_custom_fields():
    """Create all custom fields for Mobile POS"""
    
    custom_fields = {
        "User": [
            {
                "fieldname": "pos_user_type",
                "label": "POS User Type",
                "fieldtype": "Select",
                "options": "\nSystem User\nWebsite User\nAdmin",
                "default": "",
                "insert_after": "user_type",
                "description": "Select user type for POS access control",
                "in_standard_filter": 1,
                "translatable": 1,
            }
        ],
        "Item": [
            {
                "fieldname": "custom_show_on_web",
                "label": "Show on Web",
                "fieldtype": "Check",
                "default": "1",
                "insert_after": "disabled",
                "description": "Show this item on web POS",
            }
        ],
        "Customer": [
            {
                "fieldname": "custom_phone",
                "label": "Phone",
                "fieldtype": "Data",
                "insert_after": "customer_name",
                "options": "Phone",
            }
        ],
        "Sales Order": [
            {
                "fieldname": "custom_stock_transfer",
                "label": "Stock Transfer",
                "fieldtype": "Link",
                "options": "Stock Entry",
                "insert_after": "order_type",
                "description": "Link to stock transfer entry",
            }
        ],
        "Sales Invoice": [
            {
                "fieldname": "custom_employee_invoice",
                "label": "Employee Invoice / فاتورة موظف",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_customer_balance_after",
            },
            {
                "fieldname": "custom_employee",
                "label": "Employee / الموظف",
                "fieldtype": "Link",
                "options": "POS Employee",
                "insert_after": "custom_employee_invoice",
                "depends_on": "eval:doc.custom_employee_invoice",
                "mandatory_depends_on": "eval:doc.custom_employee_invoice",
            }
        ],
        "Journal Entry": [
            {
                "fieldname": "custom_pos_employee_loan",
                "label": "POS Employee Loan",
                "fieldtype": "Data",
                "insert_after": "custom_mini_pos_profile",
                "read_only": 1,
                "print_hide": 1,
            }
        ],
    }
    
    create_custom_fields(custom_fields, update=True)
    frappe.db.commit()
    print("✓ Mobile POS custom fields created/updated successfully")

def create_pos_html_blocks():
    """Create Custom HTML Blocks for workspace"""

    html_blocks = [
        {
            "name": "POS Welcome Banner",
            "html": """<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px 30px; border-radius: 15px; margin-bottom: 20px; direction: rtl; text-align: right;">
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
        <div>
            <h2 style="margin: 0 0 8px; color: white; font-size: 1.8em; font-weight: bold;">نظام نقاط البيع</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 1.1em;">إدارة المبيعات والمخزون والحسابات بكل سهولة</p>
        </div>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 10px; text-align: center; min-width: 100px;">
                <div style="font-size: 0.85em; opacity: 0.9;">المبيعات</div>
                <div style="font-size: 1.4em; font-weight: bold;">اليومية</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 10px; text-align: center; min-width: 100px;">
                <div style="font-size: 0.85em; opacity: 0.9;">المخزون</div>
                <div style="font-size: 1.4em; font-weight: bold;">والأرصدة</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 10px; text-align: center; min-width: 100px;">
                <div style="font-size: 0.85em; opacity: 0.9;">التقارير</div>
                <div style="font-size: 1.4em; font-weight: bold;">والتحليلات</div>
            </div>
        </div>
    </div>
</div>""",
            "private": 0
        }
    ]

    for block in html_blocks:
        if not frappe.db.exists("Custom HTML Block", block["name"]):
            doc = frappe.new_doc("Custom HTML Block")
            doc.name = block["name"]
            doc.html = block["html"]
            doc.private = block.get("private", 0)
            doc.insert(ignore_permissions=True)
            print(f"✓ Created Custom HTML Block: {block['name']}")
        else:
            # Update existing
            doc = frappe.get_doc("Custom HTML Block", block["name"])
            doc.html = block["html"]
            doc.private = block.get("private", 0)
            doc.save(ignore_permissions=True)
            print(f"✓ Updated Custom HTML Block: {block['name']}")

    frappe.db.commit()
