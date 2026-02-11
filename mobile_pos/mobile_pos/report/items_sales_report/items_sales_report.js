// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Items Sales Report"] = {
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
			"options": "Summary by Item\nSummary by Item Group\nDetailed\nTop Selling Items\nLow Selling Items",
			"default": "Summary by Item",
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
			"fieldname": "item_group",
			"label": __("Item Group"),
			"fieldtype": "Link",
			"options": "Item Group"
		},
		{
			"fieldname": "item_code",
			"label": __("Item"),
			"fieldtype": "Link",
			"options": "Item"
		},
		{
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer"
		},
		{
			"fieldname": "warehouse",
			"label": __("Warehouse"),
			"fieldtype": "Link",
			"options": "Warehouse"
		},
		{
			"fieldname": "include_returns",
			"label": __("Include Returns"),
			"fieldtype": "Check",
			"default": 0
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "total_amount" || column.fieldname == "amount") {
			value = "<span style='font-weight: bold; color: #2563eb;'>" + value + "</span>";
		}

		if (column.fieldname == "total_qty" || column.fieldname == "qty") {
			value = "<span style='font-weight: bold;'>" + value + "</span>";
		}

		if (column.fieldname == "profit" || column.fieldname == "total_profit") {
			if (data && parseFloat(data[column.fieldname]) > 0) {
				value = "<span style='font-weight: bold; color: #16a34a;'>" + value + "</span>";
			} else if (data && parseFloat(data[column.fieldname]) < 0) {
				value = "<span style='font-weight: bold; color: #dc2626;'>" + value + "</span>";
			}
		}

		return value;
	}
};
