// Copyright (c) 2024, Your Company and contributors
// For license information, please see license.txt

frappe.query_reports["Mini POS Sales Report"] = {
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
			"fieldname": "report_type",
			"label": __("Report Type"),
			"fieldtype": "Select",
			"options": "Sales Summary\nCustomer Orders\nSales by Item\nSales by Customer",
			"default": "Sales Summary",
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
			"options": "Customer"
		},
		{
			"fieldname": "item_code",
			"label": __("Item"),
			"fieldtype": "Link",
			"options": "Item"
		},
		{
			"fieldname": "warehouse",
			"label": __("Warehouse"),
			"fieldtype": "Link",
			"options": "Warehouse"
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

		return value;
	}
};
