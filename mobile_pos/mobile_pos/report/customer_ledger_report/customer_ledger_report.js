// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Customer Ledger Report"] = {
	"filters": [
		{
			"fieldname": "company",
			"label": __("Company"),
			"fieldtype": "Link",
			"options": "Company",
			"default": frappe.defaults.get_user_default("Company"),
			"reqd": 1
		},
		{
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer",
			"reqd": 1,
			"get_query": function() {
				var mini_pos_profile = frappe.query_report.get_filter_value('mini_pos_profile');
				if (mini_pos_profile) {
					return {
						filters: {
							'custom_mini_pos_profile': mini_pos_profile
						}
					};
				}
			}
		},
		{
			"fieldname": "mini_pos_profile",
			"label": __("Mini POS Profile"),
			"fieldtype": "Link",
			"options": "Mini POS Profile",
			"get_query": function() {
				var company = frappe.query_report.get_filter_value('company');
				return {
					filters: {
						'disabled': 0,
						'company': company || undefined
					}
				};
			}
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -3)
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today()
		},
		{
			"fieldname": "voucher_type",
			"label": __("Voucher Type"),
			"fieldtype": "Select",
			"options": "\nSales Invoice\nPayment Entry\nJournal Entry"
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "debit" && data && parseFloat(data.debit) > 0) {
			value = "<span style='color: #dc2626; font-weight: bold;'>" + value + "</span>";
		}

		if (column.fieldname == "credit" && data && parseFloat(data.credit) > 0) {
			value = "<span style='color: #16a34a; font-weight: bold;'>" + value + "</span>";
		}

		if (column.fieldname == "balance") {
			if (data && parseFloat(data.balance) > 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			} else if (data && parseFloat(data.balance) < 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			} else {
				value = "<span style='font-weight: bold;'>" + value + "</span>";
			}
		}

		if (data && data.is_opening) {
			value = "<span style='font-style: italic; background: #f3f4f6;'>" + value + "</span>";
		}

		return value;
	},

	"onload": function(report) {
		report.page.add_inner_button(__("Print Statement"), function() {
			var filters = report.get_values();
			if (!filters.customer) {
				frappe.msgprint(__("Please select a customer"));
				return;
			}
			frappe.call({
				method: "mobile_pos.mobile_pos.report.customer_ledger_report.customer_ledger_report.get_print_statement",
				args: {
					filters: filters
				},
				callback: function(r) {
					if (r.message) {
						var w = window.open();
						w.document.write(r.message);
						w.document.close();
						w.print();
					}
				}
			});
		});
	}
};
