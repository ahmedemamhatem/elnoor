import json

import frappe
from frappe import _
from frappe.utils import flt, cint


def is_negative_stock_allowed_for_company(company):
    """
    Check if negative stock is allowed for mobile POS.
    Checks both Company allow_negative_stock field and Mobile POS Settings.
    Company setting overrides Mobile POS Settings.
    """
    # First check Company doctype allow_negative_stock (this overrides Mobile POS Settings)
    if company and cint(frappe.db.get_value("Company", company, "allow_negative_stock", cache=True)):
        return True

    # Then check Mobile POS Settings
    from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
    return get_settings_value("allow_negative_stock", company) or 0


def get_profile_or_throw():
    user = frappe.session.user
    profile_name = frappe.db.get_value("Mini POS Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("No POS Profile configured for this user ({0})").format(user), frappe.PermissionError)
    return frappe.get_doc("Mini POS Profile", profile_name)


def list_simple_warehouses(company=None):
    filters = {"is_group": 0, "disabled": 0}
    if company:
        filters["company"] = company
    rows = frappe.db.get_all(
        "Warehouse",
        filters=filters,
        fields=["name"],
        order_by="name asc",
        limit=500
    )
    return [row.name for row in rows]


def coerce_items(items):
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            frappe.throw(_("Invalid items payload"), frappe.ValidationError)
    if not isinstance(items, (list, tuple)):
        frappe.throw(_("Items must be a list"), frappe.ValidationError)
    cleaned = []
    for row in items:
        if not isinstance(row, dict):
            frappe.throw(_("Invalid item row"), frappe.ValidationError)
        item_code = row.get("item_code")
        qty = flt(row.get("qty") or 0)
        uom = row.get("uom") or ""
        conversion_factor = flt(row.get("conversion_factor") or 1) or 1
        if not item_code or qty <= 0:
            frappe.throw(_("Each item must have a code and positive quantity."), frappe.ValidationError)
        cleaned.append({
            "item_code": item_code,
            "qty": qty,
            "uom": uom,
            "conversion_factor": conversion_factor
        })
    if not cleaned:
        frappe.throw(_("Add at least one item."), frappe.ValidationError)
    return cleaned


@frappe.whitelist()
def get_context():
    profile = get_profile_or_throw()
    # Get allow_negative_stock - checks both Company and Mobile POS Settings
    allow_negative_stock = is_negative_stock_allowed_for_company(profile.company)
    return {
        "warehouse": profile.warehouse,
        "warehouses": list_simple_warehouses(profile.company),
        "company": profile.company,
        "allow_negative_stock": allow_negative_stock
    }


@frappe.whitelist()
def get_items(warehouse, company=None):
    warehouse = (warehouse or "").strip()
    if not warehouse:
        frappe.throw(_("Warehouse is required"), frappe.ValidationError)

    # If no company passed, resolve from current user's profile
    if not company:
        try:
            profile = get_profile_or_throw()
            company = profile.company
        except Exception:
            pass

    # Check if negative stock is allowed - checks both Company and Mobile POS Settings
    allow_negative_stock = is_negative_stock_allowed_for_company(company)

    if allow_negative_stock:
        # Show all items regardless of stock quantity, filtered by company
        conditions = "i.disabled = 0 AND i.is_stock_item = 1"
        params = [warehouse]
        if company:
            conditions += " AND (i.custom_company = %s OR i.custom_company IS NULL OR i.custom_company = '')"
            params.append(company)
        rows = frappe.db.sql(
            """
            SELECT
                i.item_code,
                i.item_name,
                i.stock_uom,
                COALESCE(i.image, '') AS image,
                COALESCE(i.description, '') AS description,
                COALESCE(b.actual_qty, 0) AS actual_qty
            FROM `tabItem` i
            LEFT JOIN `tabBin` b ON b.item_code = i.name AND b.warehouse = %s
            WHERE {conditions}
            ORDER BY i.item_name ASC
            LIMIT 1000
            """.format(conditions=conditions),
            params,
            as_dict=True
        )
    else:
        # Show only items with positive stock
        conditions = "b.warehouse = %s AND COALESCE(b.actual_qty, 0) > 0"
        params = [warehouse]
        if company:
            conditions += " AND (i.custom_company = %s OR i.custom_company IS NULL OR i.custom_company = '')"
            params.append(company)
        rows = frappe.db.sql(
            """
            SELECT
                b.item_code,
                COALESCE(i.item_name, b.item_code) AS item_name,
                i.stock_uom,
                COALESCE(i.image, '') AS image,
                COALESCE(i.description, '') AS description,
                COALESCE(b.actual_qty, 0) AS actual_qty
            FROM `tabBin` b
            INNER JOIN `tabItem` i ON i.name = b.item_code
            WHERE {conditions}
            ORDER BY i.item_name ASC
            LIMIT 1000
            """.format(conditions=conditions),
            params,
            as_dict=True
        )
    return rows


@frappe.whitelist()
def get_item_details(item_code, warehouse):
    if not item_code:
        frappe.throw(_("Item code is required"))
    if not warehouse:
        frappe.throw(_("Warehouse is required"))

    item = frappe.get_doc("Item", item_code)
    uoms = []
    for row in (item.uoms or []):
        uoms.append({
            "uom": row.uom,
            "conversion_factor": flt(row.conversion_factor) or 1
        })
    if not uoms:
        uoms.append({
            "uom": item.stock_uom,
            "conversion_factor": 1
        })
    actual_qty = frappe.db.get_value(
        "Bin",
        {"item_code": item_code, "warehouse": warehouse},
        "actual_qty"
    )
    return {
        "item_code": item.name,
        "item_name": item.item_name,
        "description": item.description,
        "stock_uom": item.stock_uom,
        "uoms": uoms,
        "default_uom": item.sales_uom or item.stock_uom,
        "actual_qty": flt(actual_qty)
    }


@frappe.whitelist()
def create_transfer(direction, counterpart_warehouse, items):
    profile = get_profile_or_throw()
    pos_warehouse = profile.warehouse
    direction = (direction or "").lower()
    if direction not in ("in", "out"):
        frappe.throw(_("Direction must be 'in' or 'out'."), frappe.ValidationError)

    counterpart_warehouse = (counterpart_warehouse or "").strip()
    if not counterpart_warehouse:
        frappe.throw(_("Select the warehouse to transfer against."), frappe.ValidationError)

    cleaned_items = coerce_items(items)
    for row in cleaned_items:
        qty = row["qty"]
        if qty <= 0:
            frappe.throw(_("Quantity must be greater than zero."), frappe.ValidationError)

    source = counterpart_warehouse if direction == "in" else pos_warehouse
    target = pos_warehouse if direction == "in" else counterpart_warehouse
    if source == target:
        frappe.throw(_("Source and target warehouse cannot be the same."), frappe.ValidationError)

    # Determine transfer type based on direction
    # "in" = تحميل (loading to car/POS warehouse)
    # "out" = تفريغ (unloading to main warehouse)
    transfer_type = "تحميل" if direction == "in" else "تفريغ"

    doc = frappe.new_doc("Stock Entry")
    doc.stock_entry_type = "Material Transfer"
    doc.company = profile.company
    doc.mini_pos_profile = profile.name  # Link the Mini POS Profile
    doc.transfer_type = transfer_type  # Custom field for transfer type
    for row in cleaned_items:
        doc.append("items", {
            "item_code": row["item_code"],
            "qty": row["qty"],
            "uom": row.get("uom"),
            "conversion_factor": row.get("conversion_factor") or 1,
            "s_warehouse": source,
            "t_warehouse": target
        })
    doc.insert()
    # Don't submit - keep as draft for review
    return {"name": doc.name, "docstatus": doc.docstatus}
