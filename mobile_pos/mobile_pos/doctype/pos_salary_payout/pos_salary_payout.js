// Copyright (c) 2026, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.ui.form.on("POS Salary Payout", {
    refresh: function(frm) {
        if (frm.is_new() && !frm.doc.salary_month) {
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const currentMonth = new Date().getMonth();
            frm.set_value("salary_month", months[currentMonth]);
        }

        frm.set_query("mode_of_payment", function() {
            return {
                filters: { "company": frm.doc.company }
            };
        });

        if (frm.doc.docstatus === 0) {
            frm.add_custom_button(__("تحميل الموظفين"), function() {
                frm.trigger("load_employees");
            }).addClass("btn-primary");
        }

        // Render salary details HTML for each employee row
        if (frm.doc.employees) {
            frm.doc.employees.forEach(function(row) {
                if (row.salary_details_json) {
                    render_salary_details_html(frm, row);
                }
            });
        }
    },

    salary_month: function(frm) {
        // Auto-reload employees when month changes
    },

    load_employees: function(frm) {
        if (!frm.doc.salary_month) {
            frappe.msgprint(__("يرجى اختيار شهر المرتب أولاً"));
            return;
        }
        if (!frm.doc.company) {
            frappe.msgprint(__("يرجى اختيار الشركة أولاً"));
            return;
        }

        frappe.call({
            method: "mobile_pos.mobile_pos.doctype.pos_salary_payout.pos_salary_payout.load_active_employees",
            args: {
                salary_month: frm.doc.salary_month,
                company: frm.doc.company
            },
            freeze: true,
            freeze_message: __("جاري تحميل بيانات الموظفين..."),
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    frm.clear_table("employees");

                    r.message.forEach(function(emp) {
                        let row = frm.add_child("employees");
                        row.employee = emp.employee;
                        row.employee_name = emp.employee_name;
                        row.employee_type = emp.employee_type;
                        row.fixed_salary = emp.fixed_salary;
                        row.worked_days = emp.worked_days;
                        row.salary_remarks = emp.salary_remarks;
                        row.additional_earnings = emp.additional_earnings;
                        row.additional_deductions = emp.additional_deductions;
                        row.over_salary = emp.over_salary || 0;
                        row.avg_protein = emp.avg_protein || 0;
                        row.daily_additions = emp.daily_additions;
                        row.daily_deductions = emp.daily_deductions;
                        row.overtime_bonus = emp.overtime_bonus;
                        row.overtime_days = emp.overtime_days;
                        row.no_leaves_bonus = emp.no_leaves_bonus;
                        row.total_loan = emp.total_loan;
                        row.long_term_loan_installment = emp.long_term_loan_installment;
                        row.employee_sales = emp.employee_sales;
                        row.allowed_leave_days = emp.allowed_leave_days;
                        row.absent_days = emp.absent_days;
                        row.absence_deduction = emp.absence_deduction;
                        row.net_salary = emp.net_salary;
                    });

                    frm.refresh_field("employees");
                    calculate_totals(frm);

                    frm.dirty();
                    frm.save().then(() => {
                        frappe.show_alert({
                            message: __("تم تحميل {0} موظف بنجاح", [r.message.length]),
                            indicator: "green"
                        });
                    });
                } else {
                    frappe.msgprint(__("لا يوجد موظفين نشطين"));
                }
            }
        });
    }
});

function calculate_totals(frm) {
    let total_fixed_salary = 0;
    let total_earnings = 0;
    let total_over_salary = 0;
    let total_daily_additions = 0;
    let total_overtime_bonus = 0;
    let total_no_leaves_bonus = 0;
    let total_deductions = 0;
    let total_daily_deductions = 0;
    let total_absence_deduction = 0;
    let total_loan_deduction = 0;
    let total_long_term_loan = 0;
    let total_employee_sales = 0;
    let total_net_salary = 0;

    (frm.doc.employees || []).forEach(function(row) {
        total_fixed_salary += flt(row.fixed_salary);
        total_earnings += flt(row.additional_earnings);
        total_over_salary += flt(row.over_salary);
        total_daily_additions += flt(row.daily_additions);
        total_overtime_bonus += flt(row.overtime_bonus);
        total_no_leaves_bonus += flt(row.no_leaves_bonus);
        total_deductions += flt(row.additional_deductions);
        total_daily_deductions += flt(row.daily_deductions);
        total_absence_deduction += flt(row.absence_deduction);
        total_loan_deduction += flt(row.total_loan);
        total_long_term_loan += flt(row.long_term_loan_installment);
        total_employee_sales += flt(row.employee_sales);
        total_net_salary += flt(row.net_salary);
    });

    frm.set_value("total_fixed_salary", total_fixed_salary);
    frm.set_value("total_earnings", total_earnings);
    frm.set_value("total_over_salary", total_over_salary);
    frm.set_value("total_daily_additions", total_daily_additions);
    frm.set_value("total_overtime_bonus", total_overtime_bonus);
    frm.set_value("total_no_leaves_bonus", total_no_leaves_bonus);
    frm.set_value("total_deductions", total_deductions);
    frm.set_value("total_daily_deductions", total_daily_deductions);
    frm.set_value("total_absence_deduction", total_absence_deduction);
    frm.set_value("total_loan_deduction", total_loan_deduction);
    frm.set_value("total_long_term_loan", total_long_term_loan);
    frm.set_value("total_employee_sales", total_employee_sales);
    frm.set_value("total_net_salary", total_net_salary);
}

function render_salary_details_html(frm, row) {
    try {
        let details = JSON.parse(row.salary_details_json || "[]");
        if (!details.length) return;

        let earnings = details.filter(d => d.item_type === "Earning");
        let deductions = details.filter(d => d.item_type === "Deduction");

        let html = '<div style="direction: rtl; font-size: 12px; padding: 8px;">';

        if (earnings.length) {
            html += '<div style="margin-bottom: 8px;">';
            html += '<strong style="color: #2e7d32;">الاستحقاقات:</strong>';
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 4px;">';
            earnings.forEach(function(item) {
                html += '<tr style="border-bottom: 1px solid #e8e8e8;">';
                html += '<td style="padding: 3px 8px; color: #2e7d32;">' + item.item_name + '</td>';
                html += '<td style="padding: 3px 8px; text-align: left; color: #2e7d32; font-weight: bold;">' + format_currency(item.amount) + '</td>';
                html += '</tr>';
            });
            html += '</table></div>';
        }

        if (deductions.length) {
            html += '<div>';
            html += '<strong style="color: #c62828;">الاستقطاعات:</strong>';
            html += '<table style="width: 100%; border-collapse: collapse; margin-top: 4px;">';
            deductions.forEach(function(item) {
                html += '<tr style="border-bottom: 1px solid #e8e8e8;">';
                html += '<td style="padding: 3px 8px; color: #c62828;">' + item.item_name + '</td>';
                html += '<td style="padding: 3px 8px; text-align: left; color: #c62828; font-weight: bold;">' + format_currency(item.amount) + '</td>';
                html += '</tr>';
            });
            html += '</table></div>';
        }

        html += '</div>';

        // Set the HTML on the row's salary_details_html field
        let wrapper = frm.fields_dict.employees.grid.grid_rows_by_docname[row.name];
        if (wrapper) {
            let html_field = wrapper.fields_dict.salary_details_html;
            if (html_field) {
                html_field.$wrapper.html(html);
            }
        }
    } catch(e) {
        // Ignore parse errors
    }
}
