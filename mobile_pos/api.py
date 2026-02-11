import frappe
import json
from typing import Dict, Any, Optional, List
from frappe.utils import nowdate, flt, today, get_first_day, getdate


def _resolve_company(company=None):
    """Resolve company: use provided value, or fall back to user's Mini POS Profile company."""
    if company:
        return company
    user = frappe.session.user
    if user and user != "Guest":
        profile_company = frappe.db.get_value("Mini POS Profile", {"user": user}, "company")
        if profile_company:
            return profile_company
    # Final fallback
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
    )

@frappe.whitelist()
def create_sales_invoice(customer, item, qty, payment_type):
    from frappe.utils import nowdate
    from mobile_pos.mobile_pos.page.mini_pos.api import get_profile_or_throw, get_company_price_list

    profile = get_profile_or_throw()
    company = profile.company

    # Get company-specific price list
    price_list = get_company_price_list(company)
    price_filters = {"item_code": item, "selling": 1}
    if price_list:
        price_filters["price_list"] = price_list

    item_price = frappe.get_value("Item Price", price_filters, "price_list_rate")
    if not item_price:
        frappe.throw(f"Price not found for {item}")

    doc = frappe.new_doc('Sales Invoice')
    doc.customer = customer
    doc.company = company
    doc.due_date = nowdate()
    doc.items = [{
        "item_code": item,
        "qty": float(qty),
        "rate": item_price,
        "warehouse": profile.warehouse,
    }]
    if payment_type == "Cash":
        doc.is_pos = 1
        doc.update_paid_amount()
    doc.insert(ignore_permissions=True)
    doc.submit()
    return {"name": doc.name}

@frappe.whitelist()
def get_customer_orders(date=None, group_by="item") -> Dict[str, Any]:
    """Get customer orders filtered by user's Mini POS Profile.

    Supports:
        - GET with query params
        - POST with JSON body
    """

    # -------------------------
    # 1) Read JSON POST body
    # -------------------------
    if frappe.request and frappe.request.data:
        try:
            body = json.loads(frappe.request.data)
            date = body.get("date", date)
            group_by = body.get("group_by", group_by)
        except Exception:
            pass

    # -------------------------
    # 2) Read GET query params
    # -------------------------
    date = date or frappe.form_dict.get("date")
    group_by = group_by or frappe.form_dict.get("group_by") or "item"

    # -------------------------
    # 3) Validate
    # -------------------------
    if not date:
        return {"success": False, "message": "Date is required"}

    try:
        # -------------------------
        # 4) Get user's Mini POS profile
        # -------------------------
        from mobile_pos.mobile_pos.page.mini_pos.api import get_profile_or_throw

        try:
            profile = get_profile_or_throw()
            user_profile = profile.name
        except Exception as e:
            return {
                "success": False,
                "message": f"No Mini POS Profile found for current user: {str(e)}"
            }

        # -------------------------
        # 5) GROUP BY ITEM
        # -------------------------
        if group_by == "item":
            items_data = frappe.db.sql("""
                SELECT
                    soi.item_code,
                    soi.item_name,
                    soi.uom,
                    SUM(soi.qty) AS total_qty
                FROM `tabSales Order Item` soi
                INNER JOIN `tabSales Order` so ON so.name = soi.parent
                INNER JOIN `tabCustomer` c ON c.name = so.customer
                WHERE so.delivery_date = %s
                  AND c.custom_mini_pos_profile = %s
                  AND so.docstatus IN (0, 1)
                GROUP BY soi.item_code, soi.uom
                ORDER BY soi.item_name ASC
            """, (date, user_profile), as_dict=True)

            return {
                "success": True,
                "group_by": "item",
                "date": date,
                "items": items_data
            }

        # -------------------------
        # 6) GROUP BY CUSTOMER
        # -------------------------
        customers_data = frappe.db.sql("""
            SELECT DISTINCT
                c.name AS customer_id,
                c.customer_name,
                c.custom_phone AS customer_phone
            FROM `tabCustomer` c
            INNER JOIN `tabSales Order` so ON so.customer = c.name
            WHERE so.delivery_date = %s
              AND c.custom_mini_pos_profile = %s
              AND so.docstatus IN (0, 1)
            ORDER BY c.customer_name ASC
        """, (date, user_profile), as_dict=True)

        # Fetch items for each customer
        for customer in customers_data:
            customer["items"] = frappe.db.sql("""
                SELECT
                    soi.item_code,
                    soi.item_name,
                    soi.uom,
                    soi.qty,
                    soi.rate,
                    soi.amount
                FROM `tabSales Order Item` soi
                INNER JOIN `tabSales Order` so ON so.name = soi.parent
                WHERE so.customer = %s
                  AND so.delivery_date = %s
                  AND so.docstatus IN (0, 1)
                ORDER BY soi.idx
            """, (customer.get("customer_id"), date), as_dict=True)

        return {
            "success": True,
            "group_by": "customer",
            "date": date,
            "customers": customers_data
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Customer Orders Error")
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist()
def get_daily_sales(date=None) -> Dict[str, Any]:
    """Get daily sales summary grouped by item for the user's Mini POS Profile.

    Returns total quantity and amount for each item sold on the given date.
    """

    # -------------------------
    # 1) Read JSON POST body
    # -------------------------
    if frappe.request and frappe.request.data:
        try:
            body = json.loads(frappe.request.data)
            date = body.get("date", date)
        except Exception:
            pass

    # -------------------------
    # 2) Read GET query params
    # -------------------------
    date = date or frappe.form_dict.get("date")

    # -------------------------
    # 3) Validate
    # -------------------------
    if not date:
        return {"success": False, "message": "Date is required"}

    try:
        # -------------------------
        # 4) Get user's Mini POS profile
        # -------------------------
        from mobile_pos.mobile_pos.page.mini_pos.api import get_profile_or_throw

        try:
            profile = get_profile_or_throw()
            warehouse = profile.warehouse
        except Exception as e:
            return {
                "success": False,
                "message": f"No Mini POS Profile found for current user: {str(e)}"
            }

        # -------------------------
        # 5) Get sales data grouped by item
        # -------------------------
        items_data = frappe.db.sql("""
            SELECT
                sii.item_code,
                sii.item_name,
                SUM(sii.qty) AS qty,
                SUM(sii.amount) AS amount
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE si.posting_date = %s
              AND sii.warehouse = %s
              AND si.docstatus = 1
            GROUP BY sii.item_code
            ORDER BY sii.item_name ASC
        """, (date, warehouse), as_dict=True)

        # Calculate total amount
        total_amount = sum(item.get("amount", 0) for item in items_data)

        return {
            "success": True,
            "date": date,
            "items": items_data,
            "total_amount": total_amount
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Daily Sales Error")
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist()
def create_stock_transfer_from_orders(date=None) -> Dict[str, Any]:
    """Create a Stock Entry (Material Transfer) from main warehouse to profile warehouse.

    Transfers items from customer orders for the given date from the main warehouse
    (configured in Mobile POS Settings) to the user's profile warehouse.
    Creates a draft stock entry and marks sales orders as transferred.
    """

    # Read JSON POST body
    if frappe.request and frappe.request.data:
        try:
            body = json.loads(frappe.request.data)
            date = body.get("date", date)
        except Exception:
            pass

    # Read GET query params
    date = date or frappe.form_dict.get("date")

    if not date:
        return {"success": False, "message": "تاريخ التسليم مطلوب"}

    try:
        # Get user's Mini POS profile
        from mobile_pos.mobile_pos.page.mini_pos.api import get_profile_or_throw

        try:
            profile = get_profile_or_throw()
            target_warehouse = profile.warehouse
            company = profile.company
        except Exception as e:
            return {
                "success": False,
                "message": f"لم يتم العثور على ملف Mini POS للمستخدم الحالي: {str(e)}"
            }

        # Get main warehouse from Mobile POS Settings for the company
        from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
        settings = get_mobile_pos_settings(company)
        source_warehouse = settings.main_warehouse

        if not source_warehouse:
            return {
                "success": False,
                "message": "الرجاء تحديد المستودع الرئيسي في إعدادات Mobile POS"
            }

        if source_warehouse == target_warehouse:
            return {
                "success": False,
                "message": "المستودع الرئيسي والمستودع المستهدف متطابقان"
            }

        # Check if custom_stock_transfer field exists on Sales Order
        has_transfer_field = frappe.db.exists("Custom Field", {
            "dt": "Sales Order",
            "fieldname": "custom_stock_transfer"
        })

        # Get all sales orders for this date (to check for already transferred)
        sales_orders = frappe.db.sql("""
            SELECT DISTINCT so.name, so.custom_stock_transfer
            FROM `tabSales Order` so
            INNER JOIN `tabCustomer` c ON c.name = so.customer
            WHERE so.delivery_date = %s
              AND c.custom_mini_pos_profile = %s
              AND so.docstatus IN (0, 1)
        """, (date, profile.name), as_dict=True)

        if not sales_orders:
            return {
                "success": False,
                "message": "لا توجد طلبات لهذا التاريخ"
            }

        # Check if any orders are already transferred
        if has_transfer_field:
            already_transferred = [so for so in sales_orders if so.custom_stock_transfer]
            if already_transferred:
                transfer_names = ", ".join([so.custom_stock_transfer for so in already_transferred])
                return {
                    "success": False,
                    "message": f"هذه الطلبات تم تحويلها مسبقاً في حركة مخزون: {transfer_names}"
                }

        # Get order items grouped by item for the date
        items_data = frappe.db.sql("""
            SELECT
                soi.item_code,
                soi.item_name,
                soi.stock_uom,
                SUM(soi.stock_qty) AS total_qty
            FROM `tabSales Order Item` soi
            INNER JOIN `tabSales Order` so ON so.name = soi.parent
            INNER JOIN `tabCustomer` c ON c.name = so.customer
            WHERE so.delivery_date = %s
              AND c.custom_mini_pos_profile = %s
              AND so.docstatus IN (0, 1)
            GROUP BY soi.item_code
            ORDER BY soi.item_name ASC
        """, (date, profile.name), as_dict=True)

        if not items_data:
            return {
                "success": False,
                "message": "لا توجد أصناف في الطلبات"
            }

        # Create Stock Entry as Draft
        stock_entry = frappe.new_doc("Stock Entry")
        stock_entry.stock_entry_type = "Material Transfer"
        stock_entry.company = company
        stock_entry.posting_date = nowdate()
        stock_entry.set_posting_time = 1

        for item in items_data:
            stock_entry.append("items", {
                "item_code": item.item_code,
                "qty": item.total_qty,
                "s_warehouse": source_warehouse,
                "t_warehouse": target_warehouse,
                "uom": item.stock_uom
            })

        # Insert as draft (don't submit)
        stock_entry.insert(ignore_permissions=True)

        # Update sales orders with stock transfer reference
        if has_transfer_field:
            for so in sales_orders:
                frappe.db.set_value("Sales Order", so.name, "custom_stock_transfer", stock_entry.name, update_modified=False)

        frappe.db.commit()

        return {
            "success": True,
            "message": f"تم إنشاء حركة المخزون (مسودة): {stock_entry.name}",
            "stock_entry": stock_entry.name,
            "items_count": len(items_data),
            "orders_count": len(sales_orders),
            "source_warehouse": source_warehouse,
            "target_warehouse": target_warehouse
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Stock Transfer Error")
        return {
            "success": False,
            "message": str(e)
        }


# ============================================================
# Admin Dashboard API Functions
# ============================================================

def _as_float(x):
    try:
        return float(x or 0)
    except Exception:
        return 0.0


def _coalesce_str(x, default=""):
    return x if (x is not None and x != "") else default


def _date_filter_clause(from_date: Optional[str], to_date: Optional[str], field: str = "posting_date"):
    conds = []
    params = {}

    if from_date:
        conds.append(f"{field} >= %(from_date)s")
        params["from_date"] = from_date

    if to_date:
        conds.append(f"{field} <= %(to_date)s")
        params["to_date"] = to_date

    if conds:
        return " AND " + " AND ".join(conds), params

    return "", params


def _mobile_args(args: Dict[str, Any]):
    sort_by = args.get("sort_by") or ""
    sort_order = (args.get("sort_order") or "desc").lower()
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"
    try:
        limit = int(args.get("limit") or 0)
    except Exception:
        limit = 0
    return sort_by, sort_order, limit


def _supplier_status(balance: float) -> str:
    if balance < 0:
        return "Pay"
    if balance > 0:
        return "Advance"
    return "Settled"


def _customer_status(balance: float) -> str:
    if balance > 0:
        return "Receive"
    if balance < 0:
        return "Refund"
    return "Settled"


@frappe.whitelist()
def get_user_companies():
    """
    Get list of companies the current user has access to.
    Uses Frappe ORM to respect user permissions.
    """
    # Use get_list which automatically applies user permissions
    companies = frappe.get_list(
        "Company",
        fields=["name", "company_name", "abbr"],
        order_by="name asc",
        limit_page_length=0
    )

    # Get user's default company
    default_company = frappe.defaults.get_user_default("Company")

    return {
        "companies": companies,
        "default_company": default_company
    }


@frappe.whitelist()
def get_mode_of_payment_for_company(doctype, txt, searchfield, start, page_len, filters):
    """
    Get Mode of Payment options that have a default account configured for the specified company.
    Used as a query filter in Mini POS Profile.
    """
    company = filters.get("company") if filters else None

    if not company:
        # If no company specified, return all enabled modes of payment
        return frappe.db.sql("""
            SELECT name, name as mode_name
            FROM `tabMode of Payment`
            WHERE enabled = 1
              AND (name LIKE %(txt)s OR name LIKE %(txt)s)
            ORDER BY name
            LIMIT %(start)s, %(page_len)s
        """, {
            "txt": f"%{txt}%",
            "start": start,
            "page_len": page_len
        })

    # Get modes of payment that have a default account for the specified company
    return frappe.db.sql("""
        SELECT mop.name, mop.name as mode_name
        FROM `tabMode of Payment` mop
        INNER JOIN `tabMode of Payment Account` mopa ON mopa.parent = mop.name
        WHERE mop.enabled = 1
          AND mopa.company = %(company)s
          AND mopa.default_account IS NOT NULL
          AND mopa.default_account != ''
          AND (mop.name LIKE %(txt)s OR mop.name LIKE %(txt)s)
        ORDER BY mop.name
        LIMIT %(start)s, %(page_len)s
    """, {
        "company": company,
        "txt": f"%{txt}%",
        "start": start,
        "page_len": page_len
    })


@frappe.whitelist(allow_guest=True)
def get_admin_stock_balances(sort_by=None, sort_order="desc", limit=None, group_by="warehouse", company=None):
    """
    Get stock balances as a flat table - one row per item with total qty and value across all warehouses.
    """
    company = _resolve_company(company)
    sort_by, sort_order, limit = _mobile_args({"sort_by": sort_by, "sort_order": sort_order, "limit": limit})

    # Build company filter for warehouse
    params = {}
    company_filter = ""
    if company:
        company_filter = "INNER JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s"
        params["company"] = company

    # Get items with total qty and value across all warehouses
    items_sql = f"""
        SELECT
            b.item_code,
            COALESCE(it.item_name, b.item_code) AS item_name,
            COALESCE(it.stock_uom, '') AS stock_uom,
            SUM(b.actual_qty) AS total_qty,
            SUM(b.actual_qty * b.valuation_rate) AS total_value
        FROM `tabBin` b
        {company_filter}
        LEFT JOIN `tabItem` it ON it.name = b.item_code
        GROUP BY b.item_code, it.item_name, it.stock_uom
        HAVING ABS(SUM(b.actual_qty)) > 1e-12
        ORDER BY it.item_name ASC
    """
    items = frappe.db.sql(items_sql, params, as_dict=True)

    # Summary totals
    total_qty = sum(_as_float(item.total_qty) for item in items)
    total_value = sum(_as_float(item.total_value) for item in items)
    unique_items = len(items)

    # Format items for response
    items_list = []
    for item in items:
        items_list.append({
            "item_code": item.item_code,
            "item_name": _coalesce_str(item.item_name, item.item_code),
            "stock_uom": _coalesce_str(item.stock_uom, ""),
            "balance": _as_float(item.total_qty),
            "value": _as_float(item.total_value)
        })

    # Sort items
    reverse = (sort_order == "desc")
    if sort_by == "balance" or sort_by == "total_qty":
        items_list.sort(key=lambda x: x["balance"], reverse=reverse)
    elif sort_by == "value":
        items_list.sort(key=lambda x: x["value"], reverse=reverse)
    elif sort_by == "item_name":
        items_list.sort(key=lambda x: x["item_name"], reverse=reverse)
    else:
        # Default: sort by item_name ascending
        items_list.sort(key=lambda x: x["item_name"])

    if limit and limit > 0:
        items_list = items_list[:limit]

    return {
        "items": items_list,
        "summary": {
            "total_qty": _as_float(total_qty),
            "total_value": _as_float(total_value),
            "item_count": unique_items
        }
    }


def _get_account_balance(account, from_date=None, to_date=None, company=None):
    if not from_date:
        from_date = get_first_day(getdate(today()))
    if not to_date:
        to_date = getdate(today())

    company_filter = ""
    params_opening = [account, from_date]
    params_period = [account, from_date, to_date]

    if company:
        company_filter = " AND company = %s"
        params_opening.append(company)
        params_period.append(company)

    opening = frappe.db.sql(f"""
        SELECT SUM(debit - credit) AS balance
        FROM `tabGL Entry`
        WHERE account = %s AND posting_date < %s{company_filter}
    """, params_opening, as_dict=True)[0].balance or 0

    period = frappe.db.sql(f"""
        SELECT SUM(debit - credit) AS balance
        FROM `tabGL Entry`
        WHERE account = %s AND posting_date BETWEEN %s AND %s{company_filter}
    """, params_period, as_dict=True)[0].balance or 0

    return flt(opening) + flt(period)


@frappe.whitelist(allow_guest=True)
def get_admin_payment_balances(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "desc",
    limit: Optional[int] = None,
    company: Optional[str] = None,
    include_unmapped: int = 1,
):
    from_date = from_date or today()
    to_date = to_date or today()
    sort_order = (sort_order or "desc").lower().strip()
    sort_by = (sort_by or "amount").strip()
    include_unmapped = 1 if (include_unmapped is None or int(include_unmapped) != 0) else 0

    try:
        limit = int(limit) if limit else None
    except (TypeError, ValueError):
        limit = None

    company = _resolve_company(company)

    try:
        mops = frappe.get_all("Mode of Payment", fields=["name"], filters={"enabled": 1})
    except Exception:
        mops = frappe.get_all("Mode of Payment", fields=["name"], filters={"disabled": 0})

    mop_names = [m["name"] for m in mops]
    if not mop_names:
        return {"balances": [], "grand_total": 0.0}

    # Only get Mode of Payment accounts configured for this company
    mop_accounts = frappe.get_all(
        "Mode of Payment Account",
        fields=["parent as mode_of_payment", "default_account"],
        filters={
            "company": company,
            "parent": ["in", mop_names],
            "default_account": ["is", "set"]
        },
    )

    # Only include Mode of Payments that have an account for this company
    pairs = [(r.mode_of_payment, r.default_account) for r in mop_accounts if r.default_account]

    result_rows = []
    grand_total = 0.0

    for mop, acc in pairs:
        amt = _get_account_balance(acc, from_date, to_date, company)

        amt = flt(amt)
        grand_total += amt
        result_rows.append({
            "mode_of_payment": mop,
            "account": acc,
            "amount": amt,
        })

    reverse = sort_order == "desc"
    if sort_by in ("mode_of_payment", "account", "amount"):
        if sort_by in ("mode_of_payment", "account"):
            result_rows.sort(key=lambda x: (x.get(sort_by) or ""), reverse=reverse)
        else:
            result_rows.sort(key=lambda x: flt(x.get(sort_by) or 0), reverse=reverse)
    else:
        result_rows.sort(key=lambda x: flt(x["amount"]), reverse=True)

    if limit and limit > 0:
        result_rows = result_rows[: int(limit)]

    return {
        "balances": result_rows,
        "grand_total": _as_float(grand_total),
    }


@frappe.whitelist(allow_guest=True)
def get_admin_customer_balances(from_date=None, to_date=None, sort_by=None, sort_order="desc", limit=None, company=None):
    """
    Get customer balances grouped by Mini POS Profile.
    Only includes Mini POS Profiles with disabled=0.
    """
    company = _resolve_company(company)
    sort_by, sort_order, limit = _mobile_args({"sort_by": sort_by, "sort_order": sort_order, "limit": limit})
    date_clause, date_params = _date_filter_clause(from_date, to_date, "gle.posting_date")

    if company:
        date_clause += " AND gle.company = %(company)s"
        date_params["company"] = company

    # Get all enabled Mini POS Profiles
    profile_filters = {"disabled": 0}
    if company:
        profile_filters["company"] = company

    profiles = frappe.get_all(
        "Mini POS Profile",
        filters=profile_filters,
        fields=["name", "full_name"]
    )

    result = []

    for profile in profiles:
        # Get customers for this profile with their balances
        sql = f"""
            SELECT
                gle.party AS customer,
                COALESCE(c.customer_name, gle.party) AS customer_name,
                SUM(gle.debit - gle.credit) AS balance_raw
            FROM `tabGL Entry` gle
            LEFT JOIN `tabCustomer` c ON c.name = gle.party
            WHERE gle.docstatus = 1
              AND gle.party_type = 'Customer'
              AND IFNULL(gle.party,'') != ''
              AND c.custom_mini_pos_profile = %(profile)s
              {date_clause}
            GROUP BY gle.party, c.customer_name
        """

        params = {"profile": profile.name, **date_params}
        rows = frappe.db.sql(sql, params, as_dict=True)

        customers = []
        profile_total = 0

        for r in rows:
            bal = _as_float(r.balance_raw)
            profile_total += bal
            customers.append({
                "customer": r.customer,
                "customer_name": _coalesce_str(r.customer_name, r.customer),
                "balance": bal,
                "status": _customer_status(bal),
            })

        # Sort customers within profile
        reverse = (sort_order == "desc")
        customers.sort(key=lambda x: x.get(sort_by) or 0 if sort_by else x["balance"], reverse=reverse)

        if limit and limit > 0:
            customers = customers[:limit]

        # Only add profile if it has customers with balances
        if customers:
            result.append({
                "profile": profile.name,
                "profile_name": profile.full_name or profile.name,
                "total_balance": profile_total,
                "customer_count": len(customers),
                "customers": customers
            })

    # Sort profiles by total balance
    result.sort(key=lambda x: x["total_balance"], reverse=True)

    return {"profiles": result}


@frappe.whitelist(allow_guest=True)
def get_admin_supplier_balances(from_date=None, to_date=None, sort_by=None, sort_order="desc", limit=None, company=None):
    company = _resolve_company(company)
    sort_by, sort_order, limit = _mobile_args({"sort_by": sort_by, "sort_order": sort_order, "limit": limit})
    date_clause, date_params = _date_filter_clause(from_date, to_date, "gle.posting_date")

    if company:
        date_clause += " AND gle.company = %(company)s"
        date_params["company"] = company

    sql = f"""
        SELECT
            gle.party AS supplier,
            COALESCE(s.supplier_name, gle.party) AS supplier_name,
            SUM(gle.debit)  AS debit_sum,
            SUM(gle.credit) AS credit_sum
        FROM `tabGL Entry` gle
        LEFT JOIN `tabSupplier` s ON s.name = gle.party
        WHERE gle.docstatus = 1
          AND gle.party_type = 'Supplier'
          AND IFNULL(gle.party,'') != ''
          {date_clause}
        GROUP BY gle.party, s.supplier_name
    """

    rows = frappe.db.sql(sql, date_params, as_dict=True)
    suppliers = []

    for r in rows:
        debit = _as_float(r.debit_sum)
        credit = _as_float(r.credit_sum)
        balance = credit - debit
        if abs(balance) < 1e-9:
            balance = 0.0

        suppliers.append({
            "supplier": r.supplier,
            "supplier_name": _coalesce_str(r.supplier_name, r.supplier),
            "balance": balance,
            "status": _supplier_status(balance),
        })

    reverse = (sort_order == "desc")
    suppliers.sort(key=lambda x: x.get(sort_by) or 0 if sort_by else x["balance"], reverse=reverse)

    if limit and limit > 0:
        suppliers = suppliers[:limit]

    return {"suppliers": suppliers}


@frappe.whitelist(allow_guest=True)
def get_admin_expenses(from_date=None, to_date=None, sort_order="desc", limit=None, company=None):
    """
    Get expenses from Journal Entries, grouped by Expense name.
    Uses the Expense DocType to map expense_account to expense_name.
    """
    company = _resolve_company(company)
    sort_order = (sort_order or "desc").lower()
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"

    try:
        limit = int(limit or 0)
    except:
        limit = 0

    # Get all expense accounts from Expense DocType
    expense_filters = {}
    if company:
        expense_filters["company"] = company

    expenses = frappe.get_all(
        "Expense",
        filters=expense_filters,
        fields=["name", "expense_name", "expense_account"],
    )

    if not expenses:
        return {"rows": [], "total": 0}

    # Build mapping of expense_account -> expense_name
    account_to_expense = {e.expense_account: e.expense_name for e in expenses}
    expense_accounts = list(account_to_expense.keys())

    if not expense_accounts:
        return {"rows": [], "total": 0}

    # Build date filter clause
    date_clause, date_params = _date_filter_clause(from_date, to_date, "je.posting_date")

    if company:
        date_clause += " AND je.company = %(company)s"
        date_params["company"] = company

    # Query Journal Entry accounts for expense entries
    sql = f"""
        SELECT
            jea.account,
            SUM(jea.debit) AS total_debit
        FROM `tabJournal Entry` je
        JOIN `tabJournal Entry Account` jea ON jea.parent = je.name
        WHERE je.docstatus = 1
          AND jea.account IN %(accounts)s
          {date_clause}
        GROUP BY jea.account
    """

    params = {"accounts": expense_accounts, **date_params}
    rows = frappe.db.sql(sql, params, as_dict=True)

    # Group by expense_name
    expense_totals = {}
    for r in rows:
        expense_name = account_to_expense.get(r.account, r.account)
        total = _as_float(r.total_debit)
        if expense_name in expense_totals:
            expense_totals[expense_name] += total
        else:
            expense_totals[expense_name] = total

    # Convert to list and sort
    result_rows = [
        {"expense_category": name, "total": total}
        for name, total in expense_totals.items()
    ]

    reverse = (sort_order == "desc")
    result_rows.sort(key=lambda x: x["total"], reverse=reverse)

    if limit > 0:
        result_rows = result_rows[:limit]

    total = sum(r["total"] for r in result_rows)

    return {
        "rows": result_rows,
        "total": _as_float(total),
    }


@frappe.whitelist(allow_guest=True)
def get_admin_sales_summary(from_date=None, to_date=None, company=None):
    """
    Get total sales and outstanding sales invoices.
    Outstanding is calculated from GL Entry (debit - credit for party_type='Customer')
    to match customer balance calculation (handles unlinked payments).
    """
    company = _resolve_company(company)
    if not to_date:
        to_date = today()

    params = {"from_date": from_date, "to_date": to_date}
    company_filter = ""
    if company:
        company_filter = " AND company = %(company)s"
        params["company"] = company

    # Get total sales amount
    total_sales_sql = f"""
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM `tabSales Invoice`
        WHERE docstatus = 1 {company_filter}
    """
    if from_date and to_date:
        total_sales_sql += " AND posting_date BETWEEN %(from_date)s AND %(to_date)s"
    elif to_date:
        total_sales_sql += " AND posting_date <= %(to_date)s"

    total_sales = frappe.db.sql(total_sales_sql, params, as_dict=True)[0].total or 0

    # Outstanding Sales - use GL Entry balance (same as customer balances)
    # This correctly reflects payments even if not linked to invoices
    outstanding_sql = f"""
        SELECT COALESCE(SUM(debit - credit), 0) as total
        FROM `tabGL Entry`
        WHERE docstatus = 1
          AND party_type = 'Customer'
          AND IFNULL(party, '') != ''
          {company_filter}
    """
    outstanding_result = frappe.db.sql(outstanding_sql, params, as_dict=True)[0].total or 0
    # Only show positive outstanding (customers who owe us)
    outstanding_sales = max(0, _as_float(outstanding_result))

    # Count of invoices
    invoice_count_sql = f"""
        SELECT COUNT(*) as count
        FROM `tabSales Invoice`
        WHERE docstatus = 1 {company_filter}
    """
    if from_date and to_date:
        invoice_count_sql += " AND posting_date BETWEEN %(from_date)s AND %(to_date)s"
    elif to_date:
        invoice_count_sql += " AND posting_date <= %(to_date)s"

    invoice_count = frappe.db.sql(invoice_count_sql, params, as_dict=True)[0].count or 0

    return {
        "total_sales": _as_float(total_sales),
        "outstanding_sales": _as_float(outstanding_sales),
        "invoice_count": int(invoice_count),
    }


@frappe.whitelist(allow_guest=True)
def get_admin_purchase_summary(from_date=None, to_date=None, company=None):
    """
    Get total purchases and outstanding purchase invoices.
    Outstanding is calculated from GL Entry (credit - debit for party_type='Supplier')
    to match supplier balance calculation (handles unlinked payments).
    """
    company = _resolve_company(company)
    if not to_date:
        to_date = today()

    params = {"from_date": from_date, "to_date": to_date}
    company_filter = ""
    if company:
        company_filter = " AND company = %(company)s"
        params["company"] = company

    # Get total purchase amount
    total_purchase_sql = f"""
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM `tabPurchase Invoice`
        WHERE docstatus = 1 {company_filter}
    """
    if from_date and to_date:
        total_purchase_sql += " AND posting_date BETWEEN %(from_date)s AND %(to_date)s"
    elif to_date:
        total_purchase_sql += " AND posting_date <= %(to_date)s"

    total_purchase = frappe.db.sql(total_purchase_sql, params, as_dict=True)[0].total or 0

    # Outstanding Purchase - use GL Entry balance (same as supplier balances)
    # This correctly reflects payments even if not linked to invoices
    # For suppliers: credit - debit = what we owe them
    outstanding_sql = f"""
        SELECT COALESCE(SUM(credit - debit), 0) as total
        FROM `tabGL Entry`
        WHERE docstatus = 1
          AND party_type = 'Supplier'
          AND IFNULL(party, '') != ''
          {company_filter}
    """
    outstanding_result = frappe.db.sql(outstanding_sql, params, as_dict=True)[0].total or 0
    # Only show positive outstanding (what we owe to suppliers)
    outstanding_purchase = max(0, _as_float(outstanding_result))

    # Count of invoices
    invoice_count_sql = f"""
        SELECT COUNT(*) as count
        FROM `tabPurchase Invoice`
        WHERE docstatus = 1 {company_filter}
    """
    if from_date and to_date:
        invoice_count_sql += " AND posting_date BETWEEN %(from_date)s AND %(to_date)s"
    elif to_date:
        invoice_count_sql += " AND posting_date <= %(to_date)s"

    invoice_count = frappe.db.sql(invoice_count_sql, params, as_dict=True)[0].count or 0

    return {
        "total_purchase": _as_float(total_purchase),
        "outstanding_purchase": _as_float(outstanding_purchase),
        "invoice_count": int(invoice_count),
    }


@frappe.whitelist(allow_guest=True)
def get_admin_today_sales(company=None):
    """
    Get today's sales summary with comparison to yesterday.
    Returns: total_today, count_today, total_yesterday, count_yesterday,
             change_percent, top_items
    """
    company = _resolve_company(company)
    today_date = today()
    yesterday_date = frappe.utils.add_days(today_date, -1)

    company_filter = ""
    params_today = {"date": today_date}
    params_yesterday = {"date": yesterday_date}
    if company:
        company_filter = " AND company = %(company)s"
        params_today["company"] = company
        params_yesterday["company"] = company

    # Today's sales
    today_sql = f"""
        SELECT
            COALESCE(SUM(grand_total), 0) as total,
            COUNT(*) as count
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND posting_date = %(date)s AND is_return = 0 {company_filter}
    """
    today_result = frappe.db.sql(today_sql, params_today, as_dict=True)[0]
    total_today = _as_float(today_result.total)
    count_today = int(today_result.count or 0)

    # Yesterday's sales
    yesterday_result = frappe.db.sql(today_sql.replace("%(date)s", "'" + yesterday_date + "'") if not company else today_sql, params_yesterday, as_dict=True)[0]
    total_yesterday = _as_float(yesterday_result.total)
    count_yesterday = int(yesterday_result.count or 0)

    # Calculate change percentage
    if total_yesterday > 0:
        change_percent = ((total_today - total_yesterday) / total_yesterday) * 100
    else:
        change_percent = 100 if total_today > 0 else 0

    # Top selling items today
    top_items_sql = f"""
        SELECT
            sii.item_code,
            sii.item_name,
            SUM(sii.qty) as total_qty,
            SUM(sii.amount) as total_amount
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1 AND si.posting_date = %(date)s AND si.is_return = 0 {company_filter}
        GROUP BY sii.item_code, sii.item_name
        ORDER BY total_amount DESC
        LIMIT 5
    """
    top_items = frappe.db.sql(top_items_sql, params_today, as_dict=True)

    return {
        "total_today": total_today,
        "count_today": count_today,
        "total_yesterday": total_yesterday,
        "count_yesterday": count_yesterday,
        "change_percent": round(change_percent, 1),
        "top_items": top_items
    }


@frappe.whitelist(allow_guest=True)
def get_admin_sales_by_profile(from_date=None, to_date=None, company=None):
    """
    Get sales breakdown by Mini POS Profile (distributor).
    Uses mini_pos_profile field directly from Sales Invoice.
    """
    company = _resolve_company(company)
    if not from_date:
        from_date = frappe.utils.get_first_day(today())
    if not to_date:
        to_date = today()

    company_filter = ""
    params = {
        "from_date": from_date,
        "to_date": to_date
    }
    if company:
        company_filter = " AND si.company = %(company)s"
        params["company"] = company

    # Get sales grouped by mini_pos_profile directly from Sales Invoice
    sql = f"""
        SELECT
            si.mini_pos_profile as profile,
            COALESCE(SUM(si.grand_total), 0) as total_sales,
            COUNT(*) as invoice_count,
            COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(si.grand_total) ELSE 0 END), 0) as returns
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
          AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
          AND IFNULL(si.mini_pos_profile, '') != ''
          {company_filter}
        GROUP BY si.mini_pos_profile
        ORDER BY total_sales DESC
    """
    rows = frappe.db.sql(sql, params, as_dict=True)

    result = []
    total_all = 0

    for row in rows:
        total_sales = _as_float(row.total_sales)
        total_all += total_sales

        # Get profile full name
        profile_name = row.profile
        try:
            profile_doc = frappe.get_cached_doc("Mini POS Profile", row.profile)
            profile_name = profile_doc.full_name or profile_doc.name
        except:
            pass

        result.append({
            "profile": row.profile,
            "profile_name": profile_name,
            "total_sales": total_sales,
            "invoice_count": int(row.invoice_count or 0),
            "returns": _as_float(row.returns)
        })

    # Calculate percentages
    for r in result:
        r["percentage"] = round((r["total_sales"] / total_all * 100) if total_all > 0 else 0, 1)

    return {
        "profiles": result,
        "total": total_all,
        "from_date": from_date,
        "to_date": to_date
    }


@frappe.whitelist(allow_guest=True)
def get_admin_low_stock_items(threshold=10, company=None):
    """
    Get items with low stock (below threshold or reorder level).
    """
    company = _resolve_company(company)
    try:
        threshold = float(threshold)
    except:
        threshold = 10

    # Build company filter for warehouse
    params = {"threshold": threshold}
    company_join = ""
    if company:
        company_join = "INNER JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s"
        params["company"] = company

    # Get items below threshold or with negative stock
    sql = f"""
        SELECT
            b.item_code,
            COALESCE(it.item_name, b.item_code) as item_name,
            COALESCE(it.stock_uom, '') as stock_uom,
            SUM(b.actual_qty) as current_qty,
            COALESCE(it.safety_stock, 0) as reorder_level,
            b.warehouse
        FROM `tabBin` b
        {company_join}
        LEFT JOIN `tabItem` it ON it.name = b.item_code
        WHERE it.disabled = 0
        GROUP BY b.item_code, it.item_name, it.stock_uom, it.safety_stock, b.warehouse
        HAVING SUM(b.actual_qty) < %(threshold)s OR SUM(b.actual_qty) < COALESCE(it.safety_stock, 0)
        ORDER BY SUM(b.actual_qty) ASC
        LIMIT 50
    """
    items = frappe.db.sql(sql, params, as_dict=True)

    # Categorize items
    zero_stock = []
    negative_stock = []
    low_stock = []

    for item in items:
        qty = _as_float(item.current_qty)
        item["current_qty"] = qty
        item["reorder_level"] = _as_float(item.reorder_level)

        if qty < 0:
            negative_stock.append(item)
        elif qty == 0:
            zero_stock.append(item)
        else:
            low_stock.append(item)

    return {
        "negative_stock": negative_stock,
        "zero_stock": zero_stock,
        "low_stock": low_stock,
        "total_count": len(items),
        "negative_count": len(negative_stock),
        "zero_count": len(zero_stock),
        "low_count": len(low_stock)
    }


@frappe.whitelist(allow_guest=True)
def get_admin_daily_cash_flow(date=None, company=None):
    """
    Get daily cash flow - money in vs money out.
    """
    company = _resolve_company(company)
    if not date:
        date = today()

    params = {"date": date}
    company_filter = ""
    if company:
        company_filter = " AND pe.company = %(company)s"
        params["company"] = company

    # Cash In: Payments received from customers
    cash_in_sql = f"""
        SELECT
            COALESCE(SUM(pe.paid_amount), 0) as total,
            COUNT(*) as count
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
          AND pe.posting_date = %(date)s
          AND pe.payment_type = 'Receive'
          {company_filter}
    """
    cash_in = frappe.db.sql(cash_in_sql, params, as_dict=True)[0]

    # Cash Out: Payments made to suppliers
    cash_out_sql = f"""
        SELECT
            COALESCE(SUM(pe.paid_amount), 0) as total,
            COUNT(*) as count
        FROM `tabPayment Entry` pe
        WHERE pe.docstatus = 1
          AND pe.posting_date = %(date)s
          AND pe.payment_type = 'Pay'
          {company_filter}
    """
    cash_out = frappe.db.sql(cash_out_sql, params, as_dict=True)[0]

    # Expenses from Journal Entry
    je_company_filter = ""
    if company:
        je_company_filter = " AND je.company = %(company)s"
    expenses_sql = f"""
        SELECT COALESCE(SUM(jea.debit), 0) as total
        FROM `tabJournal Entry` je
        JOIN `tabJournal Entry Account` jea ON jea.parent = je.name
        JOIN `tabExpense` exp ON exp.expense_account = jea.account
        WHERE je.docstatus = 1 AND je.posting_date = %(date)s
        {je_company_filter}
    """
    expenses = frappe.db.sql(expenses_sql, params, as_dict=True)[0]

    # Cash sales (POS)
    si_company_filter = ""
    if company:
        si_company_filter = " AND company = %(company)s"
    cash_sales_sql = f"""
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND posting_date = %(date)s AND is_pos = 1
        {si_company_filter}
    """
    cash_sales = frappe.db.sql(cash_sales_sql, params, as_dict=True)[0]

    total_in = _as_float(cash_in.total) + _as_float(cash_sales.total)
    total_out = _as_float(cash_out.total) + _as_float(expenses.total)
    net_flow = total_in - total_out

    return {
        "date": date,
        "cash_in": {
            "collections": _as_float(cash_in.total),
            "collections_count": int(cash_in.count or 0),
            "cash_sales": _as_float(cash_sales.total),
            "total": total_in
        },
        "cash_out": {
            "payments": _as_float(cash_out.total),
            "payments_count": int(cash_out.count or 0),
            "expenses": _as_float(expenses.total),
            "total": total_out
        },
        "net_flow": net_flow
    }


@frappe.whitelist(allow_guest=True)
def get_admin_sales_performance(company=None):
    """
    Get sales performance - this month vs last month, weekly trend.
    """
    company = _resolve_company(company)
    today_date = getdate(today())

    # This month
    this_month_start = get_first_day(today_date)
    this_month_end = today_date

    # Last month
    last_month_end = frappe.utils.add_days(this_month_start, -1)
    last_month_start = get_first_day(last_month_end)

    # Build company filter
    company_filter = ""
    if company:
        company_filter = " AND company = %(company)s"

    # This month sales
    this_month_sql = f"""
        SELECT
            COALESCE(SUM(grand_total), 0) as total,
            COUNT(*) as count
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND is_return = 0
          AND posting_date BETWEEN %(from_date)s AND %(to_date)s
          {company_filter}
    """
    params = {
        "from_date": this_month_start,
        "to_date": this_month_end
    }
    if company:
        params["company"] = company

    this_month = frappe.db.sql(this_month_sql, params, as_dict=True)[0]

    # Last month sales (same period)
    days_passed = (today_date - this_month_start).days + 1
    last_month_compare_end = frappe.utils.add_days(last_month_start, days_passed - 1)

    last_month_params = {
        "from_date": last_month_start,
        "to_date": last_month_compare_end
    }
    if company:
        last_month_params["company"] = company

    last_month = frappe.db.sql(this_month_sql, last_month_params, as_dict=True)[0]

    # Full last month
    last_month_full_params = {
        "from_date": last_month_start,
        "to_date": last_month_end
    }
    if company:
        last_month_full_params["company"] = company

    last_month_full = frappe.db.sql(this_month_sql, last_month_full_params, as_dict=True)[0]

    # Calculate change
    this_total = _as_float(this_month.total)
    last_total = _as_float(last_month.total)
    if last_total > 0:
        change_percent = ((this_total - last_total) / last_total) * 100
    else:
        change_percent = 100 if this_total > 0 else 0

    # Weekly trend (last 7 days)
    weekly_trend = []
    for i in range(6, -1, -1):
        day = frappe.utils.add_days(today_date, -i)
        day_sql = f"""
            SELECT COALESCE(SUM(grand_total), 0) as total
            FROM `tabSales Invoice`
            WHERE docstatus = 1 AND is_return = 0 AND posting_date = %(date)s
            {company_filter}
        """
        day_params = {"date": day}
        if company:
            day_params["company"] = company
        day_total = frappe.db.sql(day_sql, day_params, as_dict=True)[0].total or 0
        weekly_trend.append({
            "date": str(day),
            "day_name": frappe.utils.get_weekday(day),
            "total": _as_float(day_total)
        })

    # Daily average this month
    daily_avg = this_total / days_passed if days_passed > 0 else 0

    return {
        "this_month": {
            "total": this_total,
            "count": int(this_month.count or 0),
            "start_date": str(this_month_start),
            "end_date": str(this_month_end),
            "days_passed": days_passed,
            "daily_average": round(daily_avg, 2)
        },
        "last_month": {
            "total": _as_float(last_month_full.total),
            "count": int(last_month_full.count or 0),
            "same_period_total": last_total
        },
        "change_percent": round(change_percent, 1),
        "weekly_trend": weekly_trend
    }


@frappe.whitelist(allow_guest=True)
def get_admin_top_customers(limit=10, company=None):
    """
    Get top customers by sales volume with trends.
    """
    company = _resolve_company(company)
    limit = int(limit) if limit else 10

    # Current month
    today_date = getdate(today())
    this_month_start = get_first_day(today_date)
    last_month_end = frappe.utils.add_days(this_month_start, -1)
    last_month_start = get_first_day(last_month_end)

    # Build company filter
    company_filter = ""
    company_filter_si2 = ""
    company_filter_si3 = ""
    if company:
        company_filter = " AND si.company = %(company)s"
        company_filter_si2 = " AND si2.company = %(company)s"
        company_filter_si3 = " AND si3.company = %(company)s"

    sql = f"""
        SELECT
            c.name as customer,
            c.customer_name,
            c.custom_phone as phone,
            c.custom_mini_pos_profile as mini_pos_profile,
            COALESCE(SUM(si.grand_total), 0) as total_sales,
            COUNT(DISTINCT si.name) as invoice_count,
            COALESCE((
                SELECT SUM(si2.grand_total)
                FROM `tabSales Invoice` si2
                WHERE si2.customer = c.name AND si2.docstatus = 1 AND si2.is_return = 0
                  AND si2.posting_date BETWEEN %(this_month_start)s AND %(today)s
                  {company_filter_si2}
            ), 0) as this_month_sales,
            COALESCE((
                SELECT SUM(si3.grand_total)
                FROM `tabSales Invoice` si3
                WHERE si3.customer = c.name AND si3.docstatus = 1 AND si3.is_return = 0
                  AND si3.posting_date BETWEEN %(last_month_start)s AND %(last_month_end)s
                  {company_filter_si3}
            ), 0) as last_month_sales
        FROM `tabCustomer` c
        LEFT JOIN `tabSales Invoice` si ON si.customer = c.name AND si.docstatus = 1 AND si.is_return = 0 {company_filter}
        WHERE c.disabled = 0
        GROUP BY c.name, c.customer_name, c.custom_phone, c.custom_mini_pos_profile
        HAVING total_sales > 0
        ORDER BY total_sales DESC
        LIMIT %(limit)s
    """
    params = {
        "this_month_start": this_month_start,
        "today": today_date,
        "last_month_start": last_month_start,
        "last_month_end": last_month_end,
        "limit": limit
    }
    if company:
        params["company"] = company

    customers = frappe.db.sql(sql, params, as_dict=True)

    # Calculate trend
    for c in customers:
        c["total_sales"] = _as_float(c["total_sales"])
        c["this_month_sales"] = _as_float(c["this_month_sales"])
        c["last_month_sales"] = _as_float(c["last_month_sales"])
        if c["last_month_sales"] > 0:
            c["trend"] = round(((c["this_month_sales"] - c["last_month_sales"]) / c["last_month_sales"]) * 100, 1)
        else:
            c["trend"] = 100 if c["this_month_sales"] > 0 else 0

    return {"customers": customers, "count": len(customers)}


@frappe.whitelist(allow_guest=True)
def get_admin_top_suppliers(limit=10, company=None):
    """
    Get top suppliers by purchase volume.
    """
    company = _resolve_company(company)
    limit = int(limit) if limit else 10

    # Build company filter
    company_filter = ""
    gl_company_filter = ""
    if company:
        company_filter = " AND pi.company = %(company)s"
        gl_company_filter = " AND company = %(company)s"

    sql = f"""
        SELECT
            s.name as supplier,
            s.supplier_name,
            COALESCE(SUM(pi.grand_total), 0) as total_purchase,
            COUNT(DISTINCT pi.name) as invoice_count,
            MAX(pi.posting_date) as last_purchase_date,
            COALESCE((
                SELECT SUM(credit - debit)
                FROM `tabGL Entry`
                WHERE party_type = 'Supplier' AND party = s.name AND docstatus = 1
                {gl_company_filter}
            ), 0) as balance
        FROM `tabSupplier` s
        LEFT JOIN `tabPurchase Invoice` pi ON pi.supplier = s.name AND pi.docstatus = 1 {company_filter}
        WHERE s.disabled = 0
        GROUP BY s.name, s.supplier_name
        HAVING total_purchase > 0
        ORDER BY total_purchase DESC
        LIMIT %(limit)s
    """
    params = {"limit": limit}
    if company:
        params["company"] = company

    suppliers = frappe.db.sql(sql, params, as_dict=True)

    for s in suppliers:
        s["total_purchase"] = _as_float(s["total_purchase"])
        s["balance"] = _as_float(s["balance"])

    return {"suppliers": suppliers, "count": len(suppliers)}


@frappe.whitelist(allow_guest=True)
def get_admin_profit_analysis(company=None):
    """
    Get profit analysis - gross profit, margins.
    """
    company = _resolve_company(company)
    today_date = getdate(today())
    this_month_start = get_first_day(today_date)
    last_month_end = frappe.utils.add_days(this_month_start, -1)
    last_month_start = get_first_day(last_month_end)

    # Build company filter
    company_filter = ""
    if company:
        company_filter = " AND si.company = %(company)s"

    # This month profit
    this_month_sql = f"""
        SELECT
            COALESCE(SUM(sii.amount), 0) as revenue,
            COALESCE(SUM(sii.qty * IFNULL(it.valuation_rate, 0)), 0) as cost
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` it ON it.name = sii.item_code
        WHERE si.docstatus = 1 AND si.is_return = 0
          AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
          {company_filter}
    """
    params = {
        "from_date": this_month_start,
        "to_date": today_date
    }
    if company:
        params["company"] = company

    this_month = frappe.db.sql(this_month_sql, params, as_dict=True)[0]

    last_month_params = {
        "from_date": last_month_start,
        "to_date": last_month_end
    }
    if company:
        last_month_params["company"] = company

    last_month = frappe.db.sql(this_month_sql, last_month_params, as_dict=True)[0]

    this_revenue = _as_float(this_month.revenue)
    this_cost = _as_float(this_month.cost)
    this_profit = this_revenue - this_cost
    this_margin = (this_profit / this_revenue * 100) if this_revenue > 0 else 0

    last_revenue = _as_float(last_month.revenue)
    last_cost = _as_float(last_month.cost)
    last_profit = last_revenue - last_cost
    last_margin = (last_profit / last_revenue * 100) if last_revenue > 0 else 0

    # Top profitable items
    top_items_sql = f"""
        SELECT
            sii.item_code,
            sii.item_name,
            SUM(sii.amount) as revenue,
            SUM(sii.qty * IFNULL(it.valuation_rate, 0)) as cost,
            SUM(sii.amount) - SUM(sii.qty * IFNULL(it.valuation_rate, 0)) as profit
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` it ON it.name = sii.item_code
        WHERE si.docstatus = 1 AND si.is_return = 0
          AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
          {company_filter}
        GROUP BY sii.item_code, sii.item_name
        ORDER BY profit DESC
        LIMIT 10
    """
    top_items = frappe.db.sql(top_items_sql, params, as_dict=True)

    for item in top_items:
        item["revenue"] = _as_float(item["revenue"])
        item["cost"] = _as_float(item["cost"])
        item["profit"] = _as_float(item["profit"])
        item["margin"] = round((item["profit"] / item["revenue"] * 100) if item["revenue"] > 0 else 0, 1)

    return {
        "this_month": {
            "revenue": this_revenue,
            "cost": this_cost,
            "profit": this_profit,
            "margin": round(this_margin, 1)
        },
        "last_month": {
            "revenue": last_revenue,
            "cost": last_cost,
            "profit": last_profit,
            "margin": round(last_margin, 1)
        },
        "profit_change": round(((this_profit - last_profit) / last_profit * 100) if last_profit > 0 else (100 if this_profit > 0 else 0), 1),
        "top_items": top_items
    }


@frappe.whitelist(allow_guest=True)
def get_admin_inventory_turnover(company=None):
    """
    Get inventory turnover - fast vs slow moving items.
    """
    company = _resolve_company(company)
    # Last 30 days
    today_date = getdate(today())
    thirty_days_ago = frappe.utils.add_days(today_date, -30)

    # Build company filter
    company_filter = ""
    bin_company_join = ""
    bin_company_join_slow = ""
    if company:
        company_filter = " AND si.company = %(company)s"
        bin_company_join = "INNER JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s"
        bin_company_join_slow = "INNER JOIN `tabWarehouse` wh ON wh.name = b.warehouse AND wh.company = %(company)s"

    params = {
        "from_date": thirty_days_ago,
        "to_date": today_date
    }
    if company:
        params["company"] = company

    # Fast moving items (high sales velocity)
    fast_sql = f"""
        SELECT
            sii.item_code,
            sii.item_name,
            SUM(sii.qty) as qty_sold,
            COALESCE((
                SELECT SUM(b.actual_qty)
                FROM `tabBin` b
                {bin_company_join}
                WHERE b.item_code = sii.item_code
            ), 0) as current_stock,
            COUNT(DISTINCT si.name) as order_count
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1 AND si.is_return = 0
          AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
          {company_filter}
        GROUP BY sii.item_code, sii.item_name
        ORDER BY qty_sold DESC
        LIMIT 10
    """
    fast_moving = frappe.db.sql(fast_sql, params, as_dict=True)

    for item in fast_moving:
        item["qty_sold"] = _as_float(item["qty_sold"])
        item["current_stock"] = _as_float(item["current_stock"])
        # Days of stock remaining
        daily_sales = item["qty_sold"] / 30 if item["qty_sold"] > 0 else 0
        item["days_remaining"] = round(item["current_stock"] / daily_sales) if daily_sales > 0 else 999

    # Slow moving items (in stock but no/low sales)
    slow_sql = f"""
        SELECT
            b.item_code,
            COALESCE(it.item_name, b.item_code) as item_name,
            SUM(b.actual_qty) as current_stock,
            COALESCE((
                SELECT SUM(sii.qty)
                FROM `tabSales Invoice Item` sii
                INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
                WHERE sii.item_code = b.item_code AND si.docstatus = 1 AND si.is_return = 0
                  AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
                  {company_filter}
            ), 0) as qty_sold,
            COALESCE((
                SELECT MAX(si2.posting_date)
                FROM `tabSales Invoice Item` sii2
                INNER JOIN `tabSales Invoice` si2 ON si2.name = sii2.parent
                WHERE sii2.item_code = b.item_code AND si2.docstatus = 1
                {company_filter.replace('si.', 'si2.')}
            ), NULL) as last_sale_date
        FROM `tabBin` b
        {bin_company_join_slow}
        LEFT JOIN `tabItem` it ON it.name = b.item_code
        WHERE it.disabled = 0
        GROUP BY b.item_code, it.item_name
        HAVING current_stock > 0 AND qty_sold = 0
        ORDER BY current_stock DESC
        LIMIT 10
    """
    slow_moving = frappe.db.sql(slow_sql, params, as_dict=True)

    for item in slow_moving:
        item["current_stock"] = _as_float(item["current_stock"])
        item["qty_sold"] = _as_float(item["qty_sold"])

    return {
        "fast_moving": fast_moving,
        "slow_moving": slow_moving,
        "period_days": 30
    }


@frappe.whitelist(allow_guest=True)
def get_admin_monthly_comparison(company=None):
    """
    Get monthly comparison for last 6 months.
    """
    company = _resolve_company(company)
    today_date = getdate(today())
    months = []

    # Build company filter
    company_filter = ""
    if company:
        company_filter = " AND company = %(company)s"

    for i in range(5, -1, -1):
        month_date = frappe.utils.add_months(today_date, -i)
        month_start = get_first_day(month_date)
        month_end = frappe.utils.get_last_day(month_date)

        # If current month, use today as end
        if i == 0:
            month_end = today_date

        sql = f"""
            SELECT
                COALESCE(SUM(grand_total), 0) as sales,
                COUNT(*) as invoice_count
            FROM `tabSales Invoice`
            WHERE docstatus = 1 AND is_return = 0
              AND posting_date BETWEEN %(from_date)s AND %(to_date)s
              {company_filter}
        """
        params = {
            "from_date": month_start,
            "to_date": month_end
        }
        if company:
            params["company"] = company

        result = frappe.db.sql(sql, params, as_dict=True)[0]

        # Month name in Arabic
        month_names = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

        months.append({
            "month": month_start.month,
            "year": month_start.year,
            "month_name": month_names[month_start.month - 1],
            "sales": _as_float(result.sales),
            "invoice_count": int(result.invoice_count or 0),
            "is_current": i == 0
        })

    # Calculate max for chart scaling
    max_sales = max([m["sales"] for m in months]) if months else 1
    for m in months:
        m["percentage"] = round((m["sales"] / max_sales * 100) if max_sales > 0 else 0, 1)

    return {"months": months, "max_sales": max_sales}


@frappe.whitelist(allow_guest=True)
def get_admin_sales_by_hour(company=None):
    """
    Get sales by hour for peak hours analysis.
    """
    company = _resolve_company(company)
    today_date = today()

    company_filter = ""
    params = {"date": today_date}
    if company:
        company_filter = " AND si.company = %(company)s"
        params["company"] = company

    sql = f"""
        SELECT
            HOUR(si.creation) as hour,
            COUNT(*) as invoice_count,
            COALESCE(SUM(si.grand_total), 0) as total_sales
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1 AND si.is_return = 0
          AND si.posting_date = %(date)s
          {company_filter}
        GROUP BY HOUR(si.creation)
        ORDER BY hour
    """
    hours_data = frappe.db.sql(sql, params, as_dict=True)

    # Fill all 24 hours
    hours_map = {h["hour"]: h for h in hours_data}
    all_hours = []
    for h in range(24):
        if h in hours_map:
            all_hours.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "invoice_count": int(hours_map[h]["invoice_count"] or 0),
                "total_sales": _as_float(hours_map[h]["total_sales"])
            })
        else:
            all_hours.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "invoice_count": 0,
                "total_sales": 0
            })

    # Find peak hour
    peak_hour = max(all_hours, key=lambda x: x["total_sales"]) if all_hours else None

    return {
        "hours": all_hours,
        "peak_hour": peak_hour,
        "date": today_date
    }


@frappe.whitelist(allow_guest=True)
def get_admin_aging_report(company=None):
    """
    Get customer debt aging report (30/60/90 days).
    """
    company = _resolve_company(company)
    today_date = getdate(today())

    # Build company filter
    gl_company_filter = ""
    si_company_filter = ""
    if company:
        gl_company_filter = " AND company = %(company)s"
        si_company_filter = " AND si.company = %(company)s"

    sql = f"""
        SELECT
            c.name as customer,
            c.customer_name,
            c.custom_mini_pos_profile as mini_pos_profile,
            COALESCE((
                SELECT SUM(debit - credit)
                FROM `tabGL Entry`
                WHERE party_type = 'Customer' AND party = c.name AND docstatus = 1
                {gl_company_filter}
            ), 0) as total_balance,
            (
                SELECT MIN(si.posting_date)
                FROM `tabSales Invoice` si
                WHERE si.customer = c.name AND si.docstatus = 1 AND si.outstanding_amount > 0
                {si_company_filter}
            ) as oldest_invoice_date
        FROM `tabCustomer` c
        WHERE c.disabled = 0
        HAVING total_balance > 0
        ORDER BY total_balance DESC
    """
    params = {}
    if company:
        params["company"] = company

    customers = frappe.db.sql(sql, params, as_dict=True)

    aging_0_30 = []
    aging_31_60 = []
    aging_61_90 = []
    aging_over_90 = []

    for c in customers:
        c["total_balance"] = _as_float(c["total_balance"])

        if c["oldest_invoice_date"]:
            days_old = (today_date - getdate(c["oldest_invoice_date"])).days
            c["days_old"] = days_old

            if days_old <= 30:
                aging_0_30.append(c)
            elif days_old <= 60:
                aging_31_60.append(c)
            elif days_old <= 90:
                aging_61_90.append(c)
            else:
                aging_over_90.append(c)
        else:
            c["days_old"] = 0
            aging_0_30.append(c)

    return {
        "aging_0_30": aging_0_30[:10],
        "aging_31_60": aging_31_60[:10],
        "aging_61_90": aging_61_90[:10],
        "aging_over_90": aging_over_90[:10],
        "totals": {
            "0_30": sum(c["total_balance"] for c in aging_0_30),
            "31_60": sum(c["total_balance"] for c in aging_31_60),
            "61_90": sum(c["total_balance"] for c in aging_61_90),
            "over_90": sum(c["total_balance"] for c in aging_over_90),
            "total": sum(c["total_balance"] for c in customers)
        },
        "counts": {
            "0_30": len(aging_0_30),
            "31_60": len(aging_31_60),
            "61_90": len(aging_61_90),
            "over_90": len(aging_over_90)
        }
    }


@frappe.whitelist(allow_guest=True)
def get_admin_expected_collections(company=None):
    """
    Get expected collections this week.
    """
    company = _resolve_company(company)
    today_date = getdate(today())
    week_end = frappe.utils.add_days(today_date, 7)

    # Build company filter
    gl_company_filter = ""
    pe_company_filter = ""
    si_company_filter = ""
    if company:
        gl_company_filter = " AND company = %(company)s"
        pe_company_filter = " AND pe.company = %(company)s"
        si_company_filter = " AND si.company = %(company)s"

    # Customers with balance and recent activity
    sql = f"""
        SELECT
            c.name as customer,
            c.customer_name,
            c.custom_phone as phone,
            c.custom_mini_pos_profile as mini_pos_profile,
            COALESCE((
                SELECT SUM(debit - credit)
                FROM `tabGL Entry`
                WHERE party_type = 'Customer' AND party = c.name AND docstatus = 1
                {gl_company_filter}
            ), 0) as balance,
            (
                SELECT MAX(pe.posting_date)
                FROM `tabPayment Entry` pe
                WHERE pe.party_type = 'Customer' AND pe.party = c.name AND pe.docstatus = 1
                {pe_company_filter}
            ) as last_payment_date,
            (
                SELECT MAX(si.posting_date)
                FROM `tabSales Invoice` si
                WHERE si.customer = c.name AND si.docstatus = 1
                {si_company_filter}
            ) as last_invoice_date
        FROM `tabCustomer` c
        WHERE c.disabled = 0
        HAVING balance > 0
        ORDER BY balance DESC
        LIMIT 20
    """
    params = {}
    if company:
        params["company"] = company

    customers = frappe.db.sql(sql, params, as_dict=True)

    total_expected = 0
    for c in customers:
        c["balance"] = _as_float(c["balance"])
        total_expected += c["balance"]

    return {
        "customers": customers,
        "total_expected": total_expected,
        "count": len(customers)
    }


@frappe.whitelist(allow_guest=True)
def get_admin_due_payables(company=None):
    """
    Get payments due to suppliers.
    """
    company = _resolve_company(company)
    today_date = getdate(today())

    # Build company filter
    gl_company_filter = ""
    pi_company_filter = ""
    pe_company_filter = ""
    if company:
        gl_company_filter = " AND company = %(company)s"
        pi_company_filter = " AND pi.company = %(company)s"
        pe_company_filter = " AND pe.company = %(company)s"

    sql = f"""
        SELECT
            s.name as supplier,
            s.supplier_name,
            COALESCE((
                SELECT SUM(credit - debit)
                FROM `tabGL Entry`
                WHERE party_type = 'Supplier' AND party = s.name AND docstatus = 1
                {gl_company_filter}
            ), 0) as balance,
            (
                SELECT MAX(pi.posting_date)
                FROM `tabPurchase Invoice` pi
                WHERE pi.supplier = s.name AND pi.docstatus = 1
                {pi_company_filter}
            ) as last_invoice_date,
            (
                SELECT MAX(pe.posting_date)
                FROM `tabPayment Entry` pe
                WHERE pe.party_type = 'Supplier' AND pe.party = s.name AND pe.docstatus = 1
                {pe_company_filter}
            ) as last_payment_date
        FROM `tabSupplier` s
        WHERE s.disabled = 0
        HAVING balance > 0
        ORDER BY balance DESC
        LIMIT 20
    """
    params = {}
    if company:
        params["company"] = company

    suppliers = frappe.db.sql(sql, params, as_dict=True)

    total_due = 0
    for s in suppliers:
        s["balance"] = _as_float(s["balance"])
        total_due += s["balance"]

        # Calculate days since last invoice
        if s["last_invoice_date"]:
            s["days_since_invoice"] = (today_date - getdate(s["last_invoice_date"])).days
        else:
            s["days_since_invoice"] = 0

    return {
        "suppliers": suppliers,
        "total_due": total_due,
        "count": len(suppliers)
    }


@frappe.whitelist(allow_guest=True)
def get_admin_stock_movement(company=None):
    """
    Get stock movement summary - in vs out.
    """
    company = _resolve_company(company)
    today_date = today()
    week_start = frappe.utils.add_days(getdate(today_date), -7)

    company_filter = ""
    params_base = {"from_date": week_start, "to_date": today_date}
    if company:
        company_filter = " AND sle.company = %(company)s"
        params_base["company"] = company

    # Stock In (Purchase Receipt, Stock Entry - Material Receipt)
    stock_in_sql = f"""
        SELECT
            COALESCE(SUM(sle.actual_qty), 0) as qty
        FROM `tabStock Ledger Entry` sle
        WHERE sle.docstatus = 1
          AND sle.actual_qty > 0
          AND sle.posting_date BETWEEN %(from_date)s AND %(to_date)s
          {company_filter}
    """
    stock_in = frappe.db.sql(stock_in_sql, params_base, as_dict=True)[0]

    # Stock Out (Sales, Stock Entry - Material Issue)
    stock_out_sql = f"""
        SELECT
            COALESCE(SUM(ABS(sle.actual_qty)), 0) as qty
        FROM `tabStock Ledger Entry` sle
        WHERE sle.docstatus = 1
          AND sle.actual_qty < 0
          AND sle.posting_date BETWEEN %(from_date)s AND %(to_date)s
          {company_filter}
    """
    stock_out = frappe.db.sql(stock_out_sql, params_base, as_dict=True)[0]

    # Daily breakdown
    daily_company_filter = ""
    if company:
        daily_company_filter = " AND company = %(company)s"

    daily_movement = []
    for i in range(6, -1, -1):
        day = frappe.utils.add_days(getdate(today_date), -i)

        day_params = {"date": day}
        if company:
            day_params["company"] = company

        day_in = frappe.db.sql(f"""
            SELECT COALESCE(SUM(actual_qty), 0) as qty
            FROM `tabStock Ledger Entry`
            WHERE docstatus = 1 AND actual_qty > 0 AND posting_date = %(date)s
            {daily_company_filter}
        """, day_params, as_dict=True)[0]

        day_out = frappe.db.sql(f"""
            SELECT COALESCE(SUM(ABS(actual_qty)), 0) as qty
            FROM `tabStock Ledger Entry`
            WHERE docstatus = 1 AND actual_qty < 0 AND posting_date = %(date)s
            {daily_company_filter}
        """, day_params, as_dict=True)[0]

        day_names = {'Monday': 'إث', 'Tuesday': 'ثل', 'Wednesday': 'أر', 'Thursday': 'خم',
                     'Friday': 'جم', 'Saturday': 'سب', 'Sunday': 'أح'}

        daily_movement.append({
            "date": str(day),
            "day_name": day_names.get(frappe.utils.get_weekday(day), ''),
            "stock_in": _as_float(day_in.qty),
            "stock_out": _as_float(day_out.qty)
        })

    return {
        "stock_in": _as_float(stock_in.qty),
        "stock_out": _as_float(stock_out.qty),
        "net_movement": _as_float(stock_in.qty) - _as_float(stock_out.qty),
        "daily_movement": daily_movement,
        "period_days": 7
    }


@frappe.whitelist(allow_guest=True)
def get_admin_distributor_performance(company=None):
    """
    Get distributor (Mini POS Profile) performance with targets.
    """
    company = _resolve_company(company)
    today_date = getdate(today())
    this_month_start = get_first_day(today_date)
    last_month_end = frappe.utils.add_days(this_month_start, -1)
    last_month_start = get_first_day(last_month_end)

    profile_filters = {"disabled": 0}
    if company:
        profile_filters["company"] = company

    profiles = frappe.get_all(
        "Mini POS Profile",
        filters=profile_filters,
        fields=["name", "full_name", "warehouse"]
    )

    company_filter = ""
    if company:
        company_filter = " AND si.company = %(company)s"

    result = []

    for profile in profiles:
        # This month sales
        this_month_sql = f"""
            SELECT
                COALESCE(SUM(si.grand_total), 0) as total,
                COUNT(DISTINCT si.name) as count
            FROM `tabSales Invoice` si
            INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
            WHERE si.docstatus = 1 AND si.is_return = 0
              AND sii.warehouse = %(warehouse)s
              AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
              {company_filter}
        """
        params_this = {
            "warehouse": profile.warehouse,
            "from_date": this_month_start,
            "to_date": today_date
        }
        params_last = {
            "warehouse": profile.warehouse,
            "from_date": last_month_start,
            "to_date": last_month_end
        }
        if company:
            params_this["company"] = company
            params_last["company"] = company

        this_month = frappe.db.sql(this_month_sql, params_this, as_dict=True)[0]

        last_month = frappe.db.sql(this_month_sql, params_last, as_dict=True)[0]

        this_total = _as_float(this_month.total)
        last_total = _as_float(last_month.total)

        # Use last month as target (or a default)
        target = last_total if last_total > 0 else 10000
        achievement = round((this_total / target * 100) if target > 0 else 0, 1)

        result.append({
            "profile": profile.name,
            "profile_name": profile.full_name or profile.name,
            "warehouse": profile.warehouse,
            "this_month_sales": this_total,
            "this_month_count": int(this_month.count or 0),
            "last_month_sales": last_total,
            "target": target,
            "achievement": achievement,
            "growth": round(((this_total - last_total) / last_total * 100) if last_total > 0 else (100 if this_total > 0 else 0), 1)
        })

    # Sort by achievement
    result.sort(key=lambda x: x["achievement"], reverse=True)

    return {"profiles": result, "count": len(result)}