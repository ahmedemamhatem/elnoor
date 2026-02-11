# Override for erpnext.stock.stock_ledger.is_negative_stock_allowed
# This adds Company-level allow_negative_stock check

import frappe
from frappe.utils import cint

# Store original function reference
_original_is_negative_stock_allowed = None
_original_update_entries_after_init = None


def is_negative_stock_allowed_override(*, item_code=None, company=None):
    """
    Override of erpnext.stock.stock_ledger.is_negative_stock_allowed
    Adds Company-level allow_negative_stock check.

    Priority:
    1. Stock Settings (global) - if enabled, allow for all
    2. Company setting - if enabled, allow for that company
    3. Item setting - if enabled, allow for that item
    """
    # First check global Stock Settings
    if cint(frappe.db.get_single_value("Stock Settings", "allow_negative_stock", cache=True)):
        return True

    # Check Company allow_negative_stock
    if company and cint(frappe.db.get_value("Company", company, "allow_negative_stock", cache=True)):
        return True

    # Check Item-level setting
    if item_code and cint(frappe.db.get_value("Item", item_code, "allow_negative_stock", cache=True)):
        return True

    return False


def patched_update_entries_after_init(
    self,
    args,
    allow_zero_rate=False,
    allow_negative_stock=None,
    via_landed_cost_voucher=False,
    verbose=1,
):
    """
    Patched __init__ for update_entries_after class.
    Gets company first, then checks is_negative_stock_allowed with company.
    """
    from erpnext.stock.stock_ledger import get_valuation_method

    self.exceptions = {}
    self.verbose = verbose
    self.allow_zero_rate = allow_zero_rate
    self.via_landed_cost_voucher = via_landed_cost_voucher
    self.item_code = args.get("item_code")

    self.args = frappe._dict(args)
    if self.args.sle_id:
        self.args["name"] = self.args.sle_id

    # Get company FIRST before checking is_negative_stock_allowed
    self.company = frappe.get_cached_value("Warehouse", self.args.warehouse, "company")

    # Now check with company parameter
    self.allow_negative_stock = allow_negative_stock or is_negative_stock_allowed_override(
        item_code=self.item_code, company=self.company
    )

    self.set_precision()
    self.valuation_method = get_valuation_method(self.item_code)

    self.new_items_found = False
    self.distinct_item_warehouses = args.get("distinct_item_warehouses", frappe._dict())
    self.affected_transactions = set()
    self.reserved_stock = self.get_reserved_stock()

    self.data = frappe._dict()
    self.initialize_previous_data(self.args)
    self.build()


def patched_validate_negative_qty_in_future_sle(args, allow_negative_stock=False):
    """
    Patched validate_negative_qty_in_future_sle function.
    Gets company from warehouse and checks is_negative_stock_allowed with company.
    """
    from frappe import _
    from erpnext.stock.stock_ledger import (
        get_future_sle_with_negative_qty,
        is_negative_with_precision,
    )

    # Get company from warehouse
    company = frappe.get_cached_value("Warehouse", args.warehouse, "company") if args.get("warehouse") else None

    if allow_negative_stock or is_negative_stock_allowed_override(item_code=args.item_code, company=company):
        return

    if (
        args.voucher_type == "Stock Reconciliation"
        and args.actual_qty < 0
        and args.get("serial_and_batch_bundle")
        and frappe.db.get_value("Stock Reconciliation Item", args.voucher_detail_no, "qty") > 0
    ):
        return

    if args.actual_qty >= 0 and args.voucher_type != "Stock Reconciliation":
        return

    neg_sle = get_future_sle_with_negative_qty(args)

    if is_negative_with_precision(neg_sle):
        from erpnext.stock.stock_ledger import NegativeStockError
        message = _("{0} units of {1} needed in {2} on {3} {4} for {5} to complete this transaction.").format(
            abs(neg_sle[0]["qty_after_transaction"]),
            frappe.get_desk_link("Item", args.item_code),
            frappe.get_desk_link("Warehouse", args.warehouse),
            neg_sle[0]["posting_date"],
            neg_sle[0]["posting_time"],
            frappe.get_desk_link(neg_sle[0]["voucher_type"], neg_sle[0]["voucher_no"]),
        )
        frappe.throw(message, NegativeStockError, title=_("Insufficient Stock"))


_override_applied = False

def apply_override(*args, **kwargs):
    """Apply the monkey patch to override the original functions"""
    global _original_is_negative_stock_allowed, _original_update_entries_after_init, _override_applied

    # Only apply once per process
    if _override_applied:
        return

    try:
        from erpnext.stock import stock_ledger

        # Store originals for reference (only if not already overridden)
        if stock_ledger.is_negative_stock_allowed != is_negative_stock_allowed_override:
            _original_is_negative_stock_allowed = stock_ledger.is_negative_stock_allowed

            # Apply overrides
            stock_ledger.is_negative_stock_allowed = is_negative_stock_allowed_override
            # Patch update_entries_after class (this is the main class used for validation)
            stock_ledger.update_entries_after.__init__ = patched_update_entries_after_init
            stock_ledger.validate_negative_qty_in_future_sle = patched_validate_negative_qty_in_future_sle

        _override_applied = True
    except ImportError:
        pass  # erpnext not yet available
