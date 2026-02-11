// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Daily Sales Report"] = {
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
			"default": frappe.datetime.get_today(),
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
			"options": "Summary\nBy Customer\nBy Date\nDetailed",
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
			"fieldname": "show_returns",
			"label": __("Include Returns"),
			"fieldtype": "Check",
			"default": 1
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "grand_total" || column.fieldname == "total_sales") {
			value = "<span style='font-weight: bold; color: #2563eb;'>" + value + "</span>";
		}

		if (column.fieldname == "outstanding_amount" || column.fieldname == "total_outstanding") {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			} else {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "paid_amount" || column.fieldname == "total_paid") {
			value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
		}

		if (column.fieldname == "return_amount" || column.fieldname == "total_returns") {
			if (data && parseFloat(data[column.fieldname]) != 0) {
				value = "<span style='font-weight: bold; color: #f59e0b;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "customer_balance") {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			} else if (data && parseFloat(data[column.fieldname]) < 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			}
		}

		return value;
	},

	"onload": function(report) {
		report.page.add_inner_button(__("Print Summary"), function() {
			var filters = report.get_values();
			frappe.call({
				method: "mobile_pos.mobile_pos.report.daily_sales_report.daily_sales_report.get_print_summary",
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
