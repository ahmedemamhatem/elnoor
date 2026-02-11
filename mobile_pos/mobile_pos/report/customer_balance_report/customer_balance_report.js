// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Customer Balance Report"] = {
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
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date"
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date"
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
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer",
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
			"fieldname": "customer_group",
			"label": __("Customer Group"),
			"fieldtype": "Link",
			"options": "Customer Group"
		},
		{
			"fieldname": "balance_type",
			"label": __("Balance Type"),
			"fieldtype": "Select",
			"options": "All\nWith Balance Only\nCredit Balance\nDebit Balance",
			"default": "All"
		},
		{
			"fieldname": "min_balance",
			"label": __("Minimum Balance"),
			"fieldtype": "Currency"
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "balance") {
			if (data && parseFloat(data.balance) > 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			} else if (data && parseFloat(data.balance) < 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "total_invoiced" || column.fieldname == "total_paid") {
			value = "<span style='font-weight: bold;'>" + value + "</span>";
		}

		return value;
	}
};
