// Copyright (c) 2025, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["Mini POS Profile Report"] = {
	filters: [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
			reqd: 1
		},
		{
			fieldname: "mini_pos_profile",
			label: __("Mini POS Profile"),
			fieldtype: "Link",
			options: "Mini POS Profile",
			reqd: 0,
			default: frappe.defaults.get_user_default("mini_pos_profile"),
			get_query: function() {
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
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1
		},
		{
			fieldname: "report_view",
			label: __("Report View"),
			fieldtype: "Select",
			options: [
				"Summary",
				"Sales Invoices",
				"Payment Entries",
				"Expense Entries",
				"All Transactions"
			],
			default: "Summary"
		},
	],

	formatter: function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "label" && data && data.label) {
			if (data.label.startsWith("===")) {
				value = `<strong style="color: #2e90fa;">${value}</strong>`;
			} else if (data.label.startsWith("---")) {
				value = `<strong style="color: #6941c6;">${value}</strong>`;
			} else if (data.label.includes("Net") || data.label.includes("صافي")) {
				value = `<strong>${value}</strong>`;
			}
		}

		if (column.fieldname == "amount" && data) {
			if (flt(data.amount) < 0) {
				value = `<span style="color: #dc2626;">${value}</span>`;
			} else if (flt(data.amount) > 0 && data.label && (data.label.includes("Net") || data.label.includes("صافي"))) {
				value = `<span style="color: #16a34a; font-weight: bold;">${value}</span>`;
			}
		}

		if (column.fieldname == "transaction_type" && value) {
			let colors = {
				"Sales Invoice": "#2e90fa",
				"Payment Entry": "#16a34a",
				"Expense Entry": "#dc2626"
			};
			let color = colors[data.transaction_type] || "#333";
			value = `<span style="color: ${color}; font-weight: 500;">${value}</span>`;
		}

		if (column.fieldname == "is_return" && data && data.is_return) {
			value = `<span style="color: #dc2626; font-weight: bold;">Yes</span>`;
		}

		return value;
	}
};
