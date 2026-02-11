// Copyright (c) 2026, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.ui.form.on("POS Salary Adjustment", {
    refresh: function(frm) {
        if (frm.is_new() && !frm.doc.salary_month) {
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const currentMonth = new Date().getMonth();
            frm.set_value("salary_month", months[currentMonth]);
        }

        frm.set_query("employee", function() {
            return {
                filters: { "company": frm.doc.company }
            };
        });

        frm.set_query("adjustment_type", function() {
            return {
                filters: { "company": frm.doc.company }
            };
        });

        frm.trigger("toggle_fields_based_on_amount_type");
        frm.trigger("setup_additional_salary_filter");
    },

    employee: function(frm) {
        if (frm.doc.employee) {
            frm.trigger("fetch_daily_rate");
            frm.set_value("additional_salary_type", "");
            frm.set_value("additional_salary_value", 0);
        }
    },

    fetch_daily_rate: function(frm) {
        if (frm.doc.employee) {
            frappe.call({
                method: "mobile_pos.mobile_pos.doctype.pos_salary_adjustment.pos_salary_adjustment.get_daily_rate",
                args: {
                    employee: frm.doc.employee
                },
                callback: function(r) {
                    if (r.message) {
                        frm.set_value("daily_rate", r.message.daily_rate);
                        if (frm.doc.amount_type === "Days") {
                            frm.trigger("calculate_amount");
                        }
                    }
                }
            });
        }
    },

    days: function(frm) {
        if (frm.doc.amount_type === "Days") {
            frm.trigger("calculate_amount");
        }
    },

    daily_rate: function(frm) {
        if (frm.doc.amount_type === "Days") {
            frm.trigger("calculate_amount");
        }
    },

    amount_type: function(frm) {
        frm.trigger("toggle_fields_based_on_amount_type");

        if (frm.doc.amount_type === "Amount") {
            frm.set_value("days", 0);
        } else if (frm.doc.amount_type === "Additional Salary") {
            frm.set_value("days", 0);
            frm.set_value("additional_salary_type", "");
            frm.set_value("additional_salary_value", 0);
            frm.set_value("deduct_full", 1);
        } else {
            frm.set_value("amount", 0);
            if (frm.doc.employee) {
                frm.trigger("fetch_daily_rate");
            }
        }
    },

    toggle_fields_based_on_amount_type: function(frm) {
        const is_days = frm.doc.amount_type === "Days" || !frm.doc.amount_type;
        const is_amount = frm.doc.amount_type === "Amount";
        const is_additional = frm.doc.amount_type === "Additional Salary";

        frm.toggle_display("days", is_days);
        frm.toggle_display("daily_rate", is_days);

        frm.toggle_display("section_break_additional_salary", is_additional);
        frm.toggle_display("additional_salary_type", is_additional);
        frm.toggle_display("additional_salary_value", is_additional);
        frm.toggle_display("column_break_additional", is_additional);
        frm.toggle_display("deduct_full", is_additional);

        if (is_days) {
            frm.set_df_property("amount", "read_only", 1);
        } else if (is_additional) {
            frm.set_df_property("amount", "read_only", frm.doc.deduct_full ? 1 : 0);
        } else {
            frm.set_df_property("amount", "read_only", 0);
        }

        frm.toggle_reqd("days", is_days);
        frm.toggle_reqd("amount", is_amount);
        frm.toggle_reqd("additional_salary_type", is_additional);

        frm.refresh_fields();
    },

    setup_additional_salary_filter: function(frm) {
        frm.set_query("additional_salary_type", function() {
            if (!frm.doc.employee) {
                return {
                    filters: { name: ["in", []] }
                };
            }

            return new Promise((resolve) => {
                frappe.call({
                    method: "mobile_pos.mobile_pos.doctype.pos_salary_adjustment.pos_salary_adjustment.get_employee_additional_salaries",
                    args: { employee: frm.doc.employee },
                    callback: function(r) {
                        if (r.message && r.message.length > 0) {
                            const types = r.message.map(s => s.salary_type);
                            resolve({
                                filters: { name: ["in", types] }
                            });
                        } else {
                            resolve({
                                filters: { name: ["in", []] }
                            });
                        }
                    }
                });
            });
        });
    },

    additional_salary_type: function(frm) {
        if (frm.doc.employee && frm.doc.additional_salary_type) {
            frappe.call({
                method: "mobile_pos.mobile_pos.doctype.pos_salary_adjustment.pos_salary_adjustment.get_additional_salary_value",
                args: {
                    employee: frm.doc.employee,
                    additional_salary_type: frm.doc.additional_salary_type
                },
                callback: function(r) {
                    if (r.message) {
                        frm.set_value("additional_salary_value", r.message.value);
                        if (frm.doc.deduct_full) {
                            frm.set_value("amount", r.message.value);
                        }
                    }
                }
            });
        } else {
            frm.set_value("additional_salary_value", 0);
            frm.set_value("amount", 0);
        }
    },

    deduct_full: function(frm) {
        if (frm.doc.amount_type === "Additional Salary") {
            frm.set_df_property("amount", "read_only", frm.doc.deduct_full ? 1 : 0);

            if (frm.doc.deduct_full) {
                frm.set_value("amount", frm.doc.additional_salary_value || 0);
            }
        }
        frm.refresh_fields();
    },

    calculate_amount: function(frm) {
        if (frm.doc.amount_type === "Days") {
            let daily_rate = frm.doc.daily_rate || 0;
            let days = frm.doc.days || 0;
            frm.set_value("amount", daily_rate * days);
        }
    }
});
