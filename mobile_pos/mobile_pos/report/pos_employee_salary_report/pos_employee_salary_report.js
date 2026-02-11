// Copyright (c) 2026, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.query_reports["POS Employee Salary Report"] = {
    "filters": [
        {
            "fieldname": "company",
            "label": __("الشركة"),
            "fieldtype": "Link",
            "options": "Company",
            "reqd": 1,
            "default": frappe.defaults.get_user_default("Company"),
            "width": 150
        },
        {
            "fieldname": "employee",
            "label": __("الموظف"),
            "fieldtype": "Link",
            "options": "POS Employee",
            "width": 150,
            "get_query": function() {
                var company = frappe.query_report.get_filter_value('company');
                return {
                    filters: { "company": company }
                };
            }
        },
        {
            "fieldname": "salary_month",
            "label": __("شهر المرتب"),
            "fieldtype": "Select",
            "options": get_month_options(),
            "reqd": 1,
            "default": get_current_month(),
            "width": 100
        },
        {
            "fieldname": "fiscal_year",
            "label": __("السنة"),
            "fieldtype": "Int",
            "default": new Date().getFullYear(),
            "reqd": 1,
            "width": 80
        }
    ],

    "formatter": function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (!data) return value;

        if (data.is_employee_header) {
            return "<span style='background-color: #e3f2fd; font-weight: bold;'>" + value + "</span>";
        }

        if (data.is_employee_total) {
            return "<span style='background-color: #fff3e0; font-weight: bold;'>" + value + "</span>";
        }

        if (data.is_grand_total) {
            return "<span style='background-color: #c8e6c9; font-weight: bold; font-size: 1.1em;'>" + value + "</span>";
        }

        if (column.fieldname == "type") {
            if (data.type == "إضافة") {
                return "<span style='color: green; font-weight: bold;'>" + value + "</span>";
            } else if (data.type == "خصم") {
                return "<span style='color: red; font-weight: bold;'>" + value + "</span>";
            } else if (data.type == "غياب") {
                return "<span style='color: #ff9800; font-weight: bold;'>" + value + "</span>";
            }
        }

        if (data.is_absence_info) {
            return "<span style='color: #ff9800;'>" + value + "</span>";
        }

        if (column.fieldname == "amount" && value) {
            if (data.is_earning) {
                return "<span style='color: green;'>" + value + "</span>";
            } else if (data.is_deduction) {
                return "<span style='color: red;'>" + value + "</span>";
            } else if (data.is_employee_total) {
                let color = parseFloat(data.amount) >= 0 ? '#2e7d32' : '#c62828';
                return "<span style='color: " + color + "; font-weight: bold;'>" + value + "</span>";
            } else if (data.is_grand_total) {
                let color = parseFloat(data.amount) >= 0 ? '#1b5e20' : '#b71c1c';
                return "<span style='color: " + color + "; font-weight: bold; font-size: 1.1em;'>" + value + "</span>";
            }
        }

        return value;
    },

    "onload": function(report) {
        report.$report.css('direction', 'rtl');
    }
};

function get_current_month() {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months[new Date().getMonth()];
}

function get_month_options() {
    const months_en = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const months_ar = [
        "يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو",
        "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر"
    ];

    if (frappe.boot.lang === 'ar') {
        return "\n" + months_en.map((en, i) => en + " - " + months_ar[i]).join("\n");
    }
    return "\n" + months_en.join("\n");
}
