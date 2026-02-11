"""
One-time patch to backfill mini_pos_profile and custom_mini_pos_profile
on existing Customer Discount journal entries and their GL entries.

Run via: bench execute mobile_pos.mobile_pos.patches.fix_discount_je_dimension.execute
"""
import frappe


def get_profile_for_user(user):
	"""Resolve Mini POS Profile from user"""
	if not user or user == "Guest":
		return None

	profiles = frappe.get_all(
		"Mini POS Profile",
		filters={"disabled": 0},
		fields=["name", "user", "owner"],
		order_by="creation asc",
		ignore_permissions=True
	)

	user_lower = user.lower()

	# Match by assigned user
	for row in profiles:
		assigned_user = (row.get("user") or "").strip()
		if assigned_user and assigned_user.lower() == user_lower:
			return row.name

	# Match by owner
	for row in profiles:
		owner = (row.get("owner") or "").strip()
		if owner and owner.lower() == user_lower:
			return row.name

	# Fallback to first profile
	if profiles:
		return profiles[0].name

	return None


def execute():
	"""Find all Customer Discount JEs and backfill mini_pos_profile on JE rows and GL entries"""

	# Find discount JEs by user_remark pattern
	journal_entries = frappe.db.sql("""
		SELECT name, owner, custom_mini_pos_profile
		FROM `tabJournal Entry`
		WHERE docstatus = 1
		  AND user_remark LIKE '%%Customer Discount%%'
	""", as_dict=True)

	if not journal_entries:
		print("No discount journal entries found.")
		return

	updated = 0
	gl_updated = 0
	for je in journal_entries:
		# Resolve profile: use existing custom_mini_pos_profile, or resolve from owner
		profile = je.custom_mini_pos_profile
		if not profile:
			profile = get_profile_for_user(je.owner)

		if not profile:
			print(f"  Skipped {je.name} - no profile found for owner {je.owner}")
			continue

		# Set custom_mini_pos_profile on parent if missing
		if not je.custom_mini_pos_profile:
			frappe.db.set_value("Journal Entry", je.name, "custom_mini_pos_profile", profile, update_modified=False)

		# Set mini_pos_profile on JE Account rows where missing
		rows = frappe.get_all(
			"Journal Entry Account",
			filters={
				"parent": je.name,
				"mini_pos_profile": ["is", "not set"]
			},
			fields=["name"]
		)

		for row in rows:
			frappe.db.set_value("Journal Entry Account", row.name, "mini_pos_profile", profile, update_modified=False)

		# Set mini_pos_profile on GL Entry rows where missing
		gl_count = frappe.db.sql("""
			UPDATE `tabGL Entry`
			SET mini_pos_profile = %s
			WHERE voucher_type = 'Journal Entry'
			  AND voucher_no = %s
			  AND (mini_pos_profile IS NULL OR mini_pos_profile = '')
		""", (profile, je.name))

		affected_gls = frappe.db.sql("""
			SELECT COUNT(*) as cnt FROM `tabGL Entry`
			WHERE voucher_type = 'Journal Entry'
			  AND voucher_no = %s
			  AND mini_pos_profile = %s
		""", (je.name, profile), as_dict=True)[0].cnt

		gl_updated += affected_gls
		updated += 1
		print(f"  Fixed {je.name} -> {profile} ({affected_gls} GL entries)")

	if updated:
		frappe.db.commit()

	print(f"\nUpdated {updated} journal entries, {gl_updated} GL entries.")
