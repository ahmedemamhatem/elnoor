__version__ = "0.0.2"

# Monkey patch for stock ledger - override is_negative_stock_allowed to check Company setting
import erpnext.stock.stock_ledger
from mobile_pos.overrides.stock_ledger import (
    is_negative_stock_allowed_override,
    patched_update_entries_after_init,
    patched_validate_negative_qty_in_future_sle
)

erpnext.stock.stock_ledger.is_negative_stock_allowed = is_negative_stock_allowed_override
# Patch update_entries_after class - this is the main class that does negative stock validation
erpnext.stock.stock_ledger.update_entries_after.__init__ = patched_update_entries_after_init
erpnext.stock.stock_ledger.validate_negative_qty_in_future_sle = patched_validate_negative_qty_in_future_sle
