# mobile_pos/mobile_pos/page/main/api.py

import frappe
from typing import Dict, Any, Optional, List

PROFILE_DOCTYPE = "Mini POS Profile"

@frappe.whitelist()
def get_home_context() -> Dict[str, Any]:
    """Return Home context driven by Mini POS Profile for the logged-in user.

    Scenarios:
    - Not logged in: user_id == "Guest", profile_allowed = 0
    - Logged in but no profile or disabled: profile_allowed = 0, profile_disabled may be 1 if found and disabled
    - Logged in with enabled profile: profile_allowed = 1 and profile fields populated
    """
    user = frappe.session.user
    full_name = frappe.utils.get_fullname(user) if user != "Guest" else "Guest"
    roles = frappe.get_roles(user) if user != "Guest" else []

    # Get POS User Type from User doctype
    pos_user_type = None
    is_admin = False
    if user != "Guest":
        pos_user_type = frappe.db.get_value("User", user, "pos_user_type") or "System User"
        is_admin = pos_user_type == "Admin"

    ctx: Dict[str, Any] = {
        "user_id": user,
        "user_full_name": full_name,
        "roles": roles,
        "pos_user_type": pos_user_type,  # "System User", "Website User", or "Admin"
        "is_admin": is_admin,  # True if pos_user_type == "Admin"
        # profile + permissions
        "profile_name": None,
        "profile_allowed": 0,       # 1 only if enabled profile exists for user
        "profile_disabled": 0,      # 1 if a profile exists but is disabled
        # profile fields
        "company": None,
        "warehouse": None,
        "sales_taxes": None,
        "allow_to_add_customer": 0,
        "allow_to_edit_item_price": 0,
        "modes_of_payment": [],
    }

    if user == "Guest":
        # Not logged in, no profile
        return ctx

    # Try to resolve a profile strictly for this user
    profile = _get_exact_profile_for_user(user)
    if profile:
        if int(profile.get("disabled") or 0) == 1:
            ctx["profile_name"] = profile.get("name")
            ctx["profile_disabled"] = 1
            ctx["profile_allowed"] = 0
            return ctx

        # Enabled profile
        ctx.update({
            "profile_name": profile.get("name"),
            "profile_allowed": 1,
            "company": profile.get("company"),
            "warehouse": profile.get("warehouse"),
            "sales_taxes": profile.get("sales_taxes"),
            "allow_to_add_customer": int(profile.get("allow_to_add_customer") or 0),
            "allow_to_edit_item_price": int(profile.get("allow_to_edit_item_price") or 0),
            "modes_of_payment": _extract_mops(profile),
        })
        return ctx

    # No profile at all for this user
    ctx["profile_allowed"] = 0
    return ctx


def _get_exact_profile_for_user(user: str) -> Optional[Dict[str, Any]]:
    """Return Mini POS Profile intended for the given user only, without fallbacks.
    We ONLY check the 'user' field which links to the User doctype.
    The 'name' field is auto-set to match the 'user' field value due to autoname configuration.
    """
    # Check if profile exists where user field == current user
    # Since autoname="field:user", the name will equal the user field value
    docname = frappe.db.get_value(PROFILE_DOCTYPE, {"user": user}, "name")
    if docname:
        return frappe.get_doc(PROFILE_DOCTYPE, docname).as_dict()

    return None


def _extract_mops(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = profile.get("mini_pos_mode_of_payment") or []
    out = []
    for r in rows:
        mop = (r.get("mode_of_payment") or "").strip()
        if mop:
            out.append({"mode_of_payment": mop})
    return out


@frappe.whitelist()
def get_page_script(page: str) -> Dict[str, Any]:
    """Return client scripts for desk pages to pre-load them in website."""
    scripts: List[str] = []

    try_paths = [
        f"assets/mobile_pos/js/{page}.js",
        f"assets/mobile_pos/public/js/{page}.js",
    ]
    for relpath in try_paths:
        try:
            content = _read_asset(relpath)
            if content:
                scripts.append(content)
        except Exception:
            pass

    return {"scripts": scripts}


def _read_asset(relpath: str) -> Optional[str]:
    """Read a built asset from sites/assets. Returns file content or None."""
    import os
    abs_path = os.path.join(frappe.get_site_path("assets"), relpath.replace("assets/", ""))
    if not os.path.exists(abs_path):
        return None
    with open(abs_path, "r", encoding="utf-8") as f:
        return f.read()