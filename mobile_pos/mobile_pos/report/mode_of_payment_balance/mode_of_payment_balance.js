// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Mode of Payment Balance"] = {
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
			"fieldname": "mini_pos_profile",
			"label": __("Mini POS Profile"),
			"fieldtype": "Link",
			"options": "Mini POS Profile",
			"reqd": 0,
			"get_query": function() {
				var company = frappe.query_report.get_filter_value('company');
				if (company) {
					return {
						filters: {
							'company': company
						}
					};
				}
			}
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			"reqd": 0
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today(),
			"reqd": 0
		},
		{
			"fieldname": "mode_of_payment",
			"label": __("Mode of Payment"),
			"fieldtype": "Link",
			"options": "Mode of Payment",
			"reqd": 0
		}
	]
};
