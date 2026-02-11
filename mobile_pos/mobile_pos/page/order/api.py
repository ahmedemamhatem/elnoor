# mobile_pos/mobile_pos/page/order/api.py

import frappe
from frappe.utils import cint
from typing import Dict, Any, List
from frappe import _


def _resolve_company(company=None):
    """Resolve company: use provided value, or fall back to user's Mini POS Profile company."""
    if company:
        return company
    user = frappe.session.user
    if user and user != "Guest":
        profile_company = frappe.db.get_value("Mini POS Profile", {"user": user}, "company")
        if profile_company:
            return profile_company
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
    )


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
    from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
    settings = get_mobile_pos_settings(company)
    return settings.allow_negative_stock if hasattr(settings, 'allow_negative_stock') else False


def get_company_price_list(company):
    """
    Get selling price list for the company.
    Priority: Mobile POS Settings > Selling Settings > any enabled selling price list.
    """
    from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
    price_list = get_settings_value("selling_price_list", company)
    if not price_list:
        price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list")
    if not price_list:
        price_list = frappe.db.get_value("Price List", {"selling": 1, "enabled": 1}, "name")
    return price_list


@frappe.whitelist(allow_guest=True, xss_safe=True)
def get_web_items(company: str = None) -> Dict[str, Any]:
    """Get all items that should be shown on web (custom_show_on_web = 1)"""
    try:
        company = _resolve_company(company)
        # Check if negative stock is allowed - checks both Company and Mobile POS Settings
        allow_negative_stock = is_negative_stock_allowed_for_company(company)

        conditions = "i.disabled = 0 AND i.custom_show_on_web = 1"
        params = {}
        if company:
            conditions += " AND (i.custom_company = %(company)s OR i.custom_company IS NULL OR i.custom_company = '')"
            params["company"] = company

        items = frappe.db.sql("""
            SELECT
                i.name,
                i.item_code,
                i.item_name,
                i.description,
                i.stock_uom,
                i.item_group,
                COALESCE(
                    (SELECT SUM(actual_qty)
                     FROM `tabBin`
                     WHERE item_code = i.item_code),
                    0
                ) as stock_qty
            FROM `tabItem` i
            WHERE {conditions}
            ORDER BY i.item_name ASC
        """.format(conditions=conditions), params, as_dict=True)

        # Get UOMs for each item
        for item in items:
            uoms = frappe.db.sql("""
                SELECT
                    uom,
                    conversion_factor
                FROM `tabUOM Conversion Detail`
                WHERE parent = %s
                ORDER BY conversion_factor ASC
            """, item.name, as_dict=True)

            # Add stock UOM as first option
            all_uoms = [{
                'uom': item.stock_uom,
                'conversion_factor': 1
            }] + uoms

            # Remove duplicates - keep first occurrence of each UOM
            seen_uoms = set()
            unique_uoms = []
            for uom_item in all_uoms:
                if uom_item['uom'] not in seen_uoms:
                    seen_uoms.add(uom_item['uom'])
                    unique_uoms.append(uom_item)

            item['uoms'] = unique_uoms

        return {
            "success": True,
            "items": items,
            "allow_negative_stock": allow_negative_stock
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Web Items Error")
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist(allow_guest=True, xss_safe=True, methods=['POST', 'GET'])
def check_customer_by_phone(phone: str, company: str = None) -> Dict[str, Any]:
    """Check if customer exists by phone number"""
    try:
        company = _resolve_company(company)
        if not phone:
            return {
                "success": False,
                "message": "Phone number is required"
            }

        # Clean phone number
        phone = phone.strip()

        # Get company-specific price list fallback
        default_price_list = get_company_price_list(company) or "البيع القياسية"

        # Use SQL query instead of ORM
        # Filter by company if provided (via customer's linked company or all customers)
        customer_data = frappe.db.sql("""
            SELECT name, customer_name, customer_group, territory, default_price_list
            FROM `tabCustomer`
            WHERE custom_phone = %s
            LIMIT 1
        """, phone, as_dict=True)

        if customer_data:
            customer = customer_data[0]
            price_list = customer.get('default_price_list') or default_price_list

            # Remove default_price_list from customer dict as it's returned separately
            customer_info = {
                'name': customer.get('name'),
                'customer_name': customer.get('customer_name'),
                'customer_group': customer.get('customer_group'),
                'territory': customer.get('territory')
            }

            return {
                "success": True,
                "customer_exists": True,
                "customer": customer_info,
                "price_list": price_list
            }
        else:
            return {
                "success": True,
                "customer_exists": False,
                "message": "Customer not found. A new customer will be created."
            }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Check Customer Error")
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist(allow_guest=True, xss_safe=True, methods=['POST', 'GET'])
def get_item_prices(items: str, price_list: str = None, company: str = None) -> Dict[str, Any]:
    """Get prices for items in cart"""
    try:
        import json
        company = _resolve_company(company)
        items_list = json.loads(items) if isinstance(items, str) else items

        if not price_list:
            price_list = get_company_price_list(company) or "البيع القياسية"

        # Build company condition for Item Price (filter by company if provided)
        ip_company_cond = ""
        if company:
            ip_company_cond = " AND (ip.company = %s OR ip.company IS NULL OR ip.company = '')"

        prices = {}
        for item in items_list:
            item_code = item.get('item_code')
            uom = item.get('uom')

            # Get price from Item Price using SQL
            query = """
                SELECT ip.price_list_rate
                FROM `tabItem Price` ip
                WHERE ip.item_code = %s
                AND ip.price_list = %s
                AND ip.uom = %s
                {company_cond}
                LIMIT 1
            """.format(company_cond=ip_company_cond)
            params = [item_code, price_list, uom]
            if company:
                params.append(company)

            price_data = frappe.db.sql(query, params, as_dict=True)
            price = price_data[0].get('price_list_rate') if price_data else None

            if not price:
                # Try with stock UOM using SQL
                stock_uom_data = frappe.db.sql("""
                    SELECT stock_uom
                    FROM `tabItem`
                    WHERE item_code = %s
                    LIMIT 1
                """, item_code, as_dict=True)

                stock_uom = stock_uom_data[0].get('stock_uom') if stock_uom_data else None

                if stock_uom:
                    query = """
                        SELECT ip.price_list_rate
                        FROM `tabItem Price` ip
                        WHERE ip.item_code = %s
                        AND ip.price_list = %s
                        AND ip.uom = %s
                        {company_cond}
                        LIMIT 1
                    """.format(company_cond=ip_company_cond)
                    params = [item_code, price_list, stock_uom]
                    if company:
                        params.append(company)

                    price_data = frappe.db.sql(query, params, as_dict=True)
                    price = price_data[0].get('price_list_rate') if price_data else None

                    if price and uom != stock_uom:
                        # Convert price based on UOM conversion using SQL
                        conversion_data = frappe.db.sql("""
                            SELECT conversion_factor
                            FROM `tabUOM Conversion Detail`
                            WHERE parent = %s
                            AND uom = %s
                            LIMIT 1
                        """, (item_code, uom), as_dict=True)

                        conversion_factor = conversion_data[0].get('conversion_factor') if conversion_data else 1
                        price = price * conversion_factor

            prices[f"{item_code}_{uom}"] = price or 0

        return {
            "success": True,
            "prices": prices
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Item Prices Error")
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist(allow_guest=True, xss_safe=True, methods=['POST', 'GET'])
def create_sales_order(customer_phone: str, customer_name: str, items: str, delivery_date: str = None, company: str = None) -> Dict[str, Any]:
    """Create sales order from web order"""
    try:
        import json
        items_list = json.loads(items) if isinstance(items, str) else items

        if not customer_phone or not items_list:
            return {
                "success": False,
                "message": "Phone number and items are required"
            }

        # Resolve company from profile, settings, or user defaults
        company = _resolve_company(company)

        # Get company-specific default price list
        default_price_list = get_company_price_list(company) or "البيع القياسية"

        # Check if customer exists using SQL
        customer_data = frappe.db.sql("""
            SELECT name, default_price_list
            FROM `tabCustomer`
            WHERE custom_phone = %s
            LIMIT 1
        """, customer_phone, as_dict=True)

        if customer_data:
            customer = customer_data[0].get('name')
            price_list = customer_data[0].get('default_price_list') or default_price_list
        else:
            # Create customer if doesn't exist
            customer_doc = frappe.get_doc({
                "doctype": "Customer",
                "customer_name": customer_name or customer_phone,
                "customer_type": "Individual",
                "customer_group": "Individual",
                "territory": "All Territories",
                "custom_phone": customer_phone
            })
            customer_doc.insert(ignore_permissions=True)
            customer = customer_doc.name
            price_list = default_price_list

        default_company = company

        # Use provided delivery date or default to 7 days from now
        final_delivery_date = delivery_date if delivery_date else frappe.utils.add_days(frappe.utils.today(), 7)

        # Create Sales Order
        so = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer,
            "transaction_date": frappe.utils.today(),
            "delivery_date": final_delivery_date,
            "order_type": "Sales",
            "company": default_company,
            "selling_price_list": price_list,
            "items": []
        })

        # Add items
        for item in items_list:
            item_code = item.get('item_code')
            qty = item.get('qty', 1)
            uom = item.get('uom')
            rate = item.get('rate', 0)

            so.append("items", {
                "item_code": item_code,
                "qty": qty,
                "uom": uom,
                "rate": rate
            })

        so.insert(ignore_permissions=True)
        frappe.db.commit()

        # Try to submit, but don't fail if it can't be submitted
        try:
            so.submit()
            frappe.db.commit()
            status = "Submitted"
        except Exception as submit_error:
            frappe.log_error(frappe.get_traceback(), "Sales Order Submit Error")
            status = "Draft"

        return {
            "success": True,
            "sales_order": so.name,
            "customer": customer,
            "status": status,
            "message": f"Order {so.name} created successfully ({status})!"
        }

    except Exception as e:
        frappe.db.rollback()
        error_msg = str(e)
        frappe.log_error(frappe.get_traceback(), "Create Sales Order Error")
        return {
            "success": False,
            "message": f"Error creating order: {error_msg}"
        }


@frappe.whitelist(allow_guest=False, xss_safe=True, methods=['POST', 'GET'])
def get_customer_orders(date: str, group_by: str = "item") -> Dict[str, Any]:
    """Get customer orders filtered by Mini POS Profile

    Args:
        date: delivery_date to filter by (YYYY-MM-DD format)
        group_by: "item" or "customer" - how to group the results

    Returns:
        If group_by = "item": Returns items summed by item_code and UOM
        If group_by = "customer": Returns orders grouped by customer
    """
    try:
        if not date:
            return {
                "success": False,
                "message": "Date is required"
            }

        # Get current user's Mini POS Profile
        current_user = frappe.session.user
        user_profile_data = frappe.db.sql("""
            SELECT custom_mini_pos_profile
            FROM `tabUser`
            WHERE name = %s
            LIMIT 1
        """, current_user, as_dict=True)

        if not user_profile_data or not user_profile_data[0].get('custom_mini_pos_profile'):
            return {
                "success": False,
                "message": "No Mini POS Profile assigned to current user"
            }

        user_profile = user_profile_data[0].get('custom_mini_pos_profile')

        if group_by == "item":
            # Group by item and sum quantities
            items_data = frappe.db.sql("""
                SELECT
                    soi.item_code,
                    soi.item_name,
                    soi.uom,
                    SUM(soi.qty) as total_qty
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

        else:  # group_by == "customer"
            # Get customers with their orders
            customers_data = frappe.db.sql("""
                SELECT DISTINCT
                    c.name as customer_id,
                    c.customer_name,
                    c.custom_phone as customer_phone
                FROM `tabCustomer` c
                INNER JOIN `tabSales Order` so ON so.customer = c.name
                WHERE so.delivery_date = %s
                AND c.custom_mini_pos_profile = %s
                AND so.docstatus IN (0, 1)
                ORDER BY c.customer_name ASC
            """, (date, user_profile), as_dict=True)

            # For each customer, get their items
            for customer in customers_data:
                items = frappe.db.sql("""
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
                """, (customer.get('customer_id'), date), as_dict=True)

                customer['items'] = items

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


@frappe.whitelist(allow_guest=True, xss_safe=True, methods=['POST', 'GET'])
def get_order_details(sales_order: str = None, customer_phone: str = None, company: str = None) -> Dict[str, Any]:
    """Get order details including items, customer, and delivery date

    Can search by either sales_order name or customer_phone
    Returns the most recent order if multiple orders exist for a customer
    """
    try:
        company = _resolve_company(company)

        if not sales_order and not customer_phone:
            return {
                "success": False,
                "message": "Either sales_order or customer_phone is required"
            }

        # Build query based on search criteria
        # Build company filter
        company_cond = ""
        company_params = []
        if company:
            company_cond = " AND so.company = %s"
            company_params = [company]

        if sales_order:
            # Search by sales order name
            order_data = frappe.db.sql("""
                SELECT
                    so.name as order_id,
                    so.customer,
                    so.transaction_date,
                    so.delivery_date,
                    so.status,
                    so.grand_total,
                    c.customer_name,
                    c.custom_phone as customer_phone
                FROM `tabSales Order` so
                LEFT JOIN `tabCustomer` c ON c.name = so.customer
                WHERE so.name = %s{company_cond}
                LIMIT 1
            """.format(company_cond=company_cond), [sales_order] + company_params, as_dict=True)
        else:
            # Search by customer phone - get most recent order
            order_data = frappe.db.sql("""
                SELECT
                    so.name as order_id,
                    so.customer,
                    so.transaction_date,
                    so.delivery_date,
                    so.status,
                    so.grand_total,
                    c.customer_name,
                    c.custom_phone as customer_phone
                FROM `tabSales Order` so
                LEFT JOIN `tabCustomer` c ON c.name = so.customer
                WHERE c.custom_phone = %s{company_cond}
                ORDER BY so.creation DESC
                LIMIT 1
            """.format(company_cond=company_cond), [customer_phone] + company_params, as_dict=True)

        if not order_data:
            return {
                "success": False,
                "message": "Order not found"
            }

        order = order_data[0]

        # Get order items with details
        items_data = frappe.db.sql("""
            SELECT
                soi.item_code,
                soi.item_name,
                soi.qty,
                soi.uom,
                soi.rate,
                soi.amount,
                i.stock_uom,
                i.item_group
            FROM `tabSales Order Item` soi
            LEFT JOIN `tabItem` i ON i.item_code = soi.item_code
            WHERE soi.parent = %s
            ORDER BY soi.idx
        """, order.get('order_id'), as_dict=True)

        return {
            "success": True,
            "order": {
                "order_id": order.get('order_id'),
                "customer": order.get('customer'),
                "customer_name": order.get('customer_name'),
                "customer_phone": order.get('customer_phone'),
                "transaction_date": str(order.get('transaction_date')),
                "delivery_date": str(order.get('delivery_date')),
                "status": order.get('status'),
                "grand_total": order.get('grand_total'),
                "items": items_data
            }
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Order Details Error")
        return {
            "success": False,
            "message": str(e)
        }
