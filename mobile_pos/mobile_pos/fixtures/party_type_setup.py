#!/usr/bin/env python3
"""
Script to add POS Employee as a Party Type for accounting entries.
Run this from bench: bench execute mobile_pos.mobile_pos.fixtures.party_type_setup.setup_pos_employee_party_type

This is also called automatically after migrate via hooks.py
"""

import frappe


def setup_pos_employee_party_type():
    """Add POS Employee as a Party Type for use in Journal Entries and GL Entries

    Called automatically after migrate to ensure Party Type exists.
    """
    party_type_name = "POS Employee"

    try:
        if frappe.db.exists("Party Type", party_type_name):
            party_type = frappe.get_doc("Party Type", party_type_name)
            if party_type.account_type != "Payable":
                party_type.account_type = "Payable"
                party_type.save(ignore_permissions=True)
                frappe.db.commit()
                print(f"Mobile POS: Updated Party Type '{party_type_name}' account_type to 'Payable'")
        else:
            party_type = frappe.get_doc({
                "doctype": "Party Type",
                "party_type": party_type_name,
                "account_type": "Payable"
            })
            party_type.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Mobile POS: Created Party Type '{party_type_name}'")

        return {"success": True, "party_type": party_type_name}

    except Exception as e:
        frappe.log_error(f"Error setting up Party Type: {str(e)}", "Party Type Setup Error")
        return {"success": False, "error": str(e)}
