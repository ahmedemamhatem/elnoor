// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mini POS Profile", {
	refresh(frm) {
		// Set filters when form loads
		frm.trigger("set_warehouse_filter");
		frm.trigger("set_mode_of_payment_filter");
		frm.trigger("set_sales_taxes_filter");
	},

	company(frm) {
		// When company changes, update filters and clear dependent fields
		frm.trigger("set_warehouse_filter");
		frm.trigger("set_mode_of_payment_filter");
		frm.trigger("set_sales_taxes_filter");

		// Clear warehouse if company changed and warehouse doesn't belong to new company
		if (frm.doc.warehouse && frm.doc.company) {
			frappe.db.get_value("Warehouse", frm.doc.warehouse, "company", (r) => {
				if (r && r.company !== frm.doc.company) {
					frm.set_value("warehouse", "");
				}
			});
		}

		// Clear sales taxes if company changed
		if (frm.doc.sales_taxes && frm.doc.company) {
			frappe.db.get_value("Sales Taxes and Charges Template", frm.doc.sales_taxes, "company", (r) => {
				if (r && r.company !== frm.doc.company) {
					frm.set_value("sales_taxes", "");
				}
			});
		}

		// Clear mode of payments that don't have account for the new company
		if (frm.doc.mini_pos_mode_of_payment && frm.doc.mini_pos_mode_of_payment.length > 0) {
			// Refresh the child table to apply new filters
			frm.refresh_field("mini_pos_mode_of_payment");
		}
	},

	set_warehouse_filter(frm) {
		frm.set_query("warehouse", () => {
			let filters = {
				is_group: 0
			};
			if (frm.doc.company) {
				filters.company = frm.doc.company;
			}
			return { filters: filters };
		});
	},

	set_mode_of_payment_filter(frm) {
		// Filter Mode of Payment in child table to show only those with accounts for the selected company
		frm.set_query("mode_of_payment", "mini_pos_mode_of_payment", () => {
			if (frm.doc.company) {
				return {
					query: "mobile_pos.api.get_mode_of_payment_for_company",
					filters: {
						company: frm.doc.company
					}
				};
			}
			return {};
		});
	},

	set_sales_taxes_filter(frm) {
		frm.set_query("sales_taxes", () => {
			let filters = {};
			if (frm.doc.company) {
				filters.company = frm.doc.company;
			}
			return { filters: filters };
		});
	}
});
