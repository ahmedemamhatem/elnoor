// Copyright (c) 2026, Anthropic and contributors
// For license information, please see license.txt

frappe.query_reports["Item Valuation Sales Report"] = {
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
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
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
			"options": "Detailed\nSummary by Item\nSummary by Item and Period",
			"default": "Detailed",
			"reqd": 1
		},
		{
			"fieldname": "group_by_period",
			"label": __("Group By Period"),
			"fieldtype": "Select",
			"options": "\nDaily\nWeekly\nMonthly",
			"depends_on": "eval:doc.report_view=='Summary by Item and Period'"
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
			"fieldname": "item_code",
			"label": __("Item"),
			"fieldtype": "Link",
			"options": "Item"
		},
		{
			"fieldname": "invoice",
			"label": __("Invoice"),
			"fieldtype": "Link",
			"options": "Sales Invoice",
			"get_query": function() {
				return {
					filters: {
						'docstatus': 1
					}
				};
			}
		},
		{
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer"
		},
		{
			"fieldname": "include_returns",
			"label": __("Include Returns"),
			"fieldtype": "Check",
			"default": 1
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		var selling_fields = ["selling_rate", "selling_amount", "avg_selling", "total_selling"];
		var valuation_fields = ["valuation_rate", "valuation_amount", "avg_valuation", "total_valuation"];
		var profit_fields = ["profit", "total_profit"];

		if (selling_fields.indexOf(column.fieldname) !== -1) {
			value = "<span style='font-weight: bold; color: #2563eb;'>" + value + "</span>";
		}

		if (valuation_fields.indexOf(column.fieldname) !== -1) {
			value = "<span style='font-weight: bold; color: #7c3aed;'>" + value + "</span>";
		}

		if (profit_fields.indexOf(column.fieldname) !== -1) {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			} else if (data && parseFloat(data[column.fieldname]) < 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "profit_percent") {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='color: #16a34a;'>" + value + "</span>";
			} else if (data && parseFloat(data[column.fieldname]) < 0) {
				value = "<span style='color: #dc2626;'>" + value + "</span>";
			}
		}

		if (column.fieldname == "qty" || column.fieldname == "total_qty" || column.fieldname == "net_qty") {
			if (data && parseFloat(data[column.fieldname]) < 0) {
				value = "<span style='color: #dc2626;'>" + value + "</span>";
			}
		}

		return value;
	}
};
