// Copyright (c) 2026, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.ui.form.on("POS Employee Loan", {
	refresh(frm) {
		frm.set_query("employee", function() {
			return {
				filters: { "company": frm.doc.company }
			};
		});
	},
});
