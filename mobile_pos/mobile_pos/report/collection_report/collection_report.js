// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Collection Report"] = {
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
			"fieldtype": "Date",
			"default": frappe.datetime.month_start(),
			"reqd": 1
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today(),
			"reqd": 1
		},
		{
			"fieldname": "report_view",
			"label": __("Report View"),
			"fieldtype": "Select",
			"options": "Summary\nBy Customer\nBy Date\nBy Mode of Payment\nDetailed",
			"default": "Summary",
			"reqd": 1
		},
		{
			"fieldname": "mini_pos_profile",
			"label": __("Mini POS Profile"),
			"fieldtype": "Link",
			"options": "Mini POS Profile",
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
			"fieldname": "mode_of_payment",
			"label": __("Mode of Payment"),
			"fieldtype": "Link",
			"options": "Mode of Payment"
		},
		{
			"fieldname": "payment_type",
			"label": __("Payment Type"),
			"fieldtype": "Select",
			"options": "\nReceive\nPay"
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "total_received" || column.fieldname == "received_amount" || column.fieldname == "amount") {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "total_paid" || column.fieldname == "paid_out") {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "net_collection") {
			if (data && parseFloat(data.net_collection) > 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			} else if (data && parseFloat(data.net_collection) < 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			}
		}

		return value;
	}
};
