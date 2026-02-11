// Copyright (c) 2025, Anthropic and contributors
// For license information, please see license.txt

frappe.ui.form.on("General Expense Allocation", {
	setup(frm) {
		// Filter company
		frm.set_query("company", function() {
			return {
				filters: {
					"is_group": 0
				}
			};
		});
	},

	refresh(frm) {
		// Show fetch button for draft documents
		if (frm.doc.docstatus === 0 && frm.doc.company && frm.doc.from_date && frm.doc.to_date) {
			frm.add_custom_button(__("جلب المصروفات وحساب التوزيع"), function() {
				frm.call({
					method: "fetch_expenses_and_calculate",
					doc: frm.doc,
					freeze: true,
					freeze_message: __("جاري حساب التوزيع..."),
					callback: function(r) {
						if (r.message) {
							frm.reload_doc();
							frappe.show_alert({
								message: __("تم حساب التوزيع بنجاح"),
								indicator: "green"
							});
						}
					}
				});
			}).addClass("btn-primary");
		}

		// Show expenses preview
		if (frm.doc.company && frm.doc.from_date && frm.doc.to_date) {
			load_expenses_preview(frm);
		}

		// Status indicator
		if (frm.doc.docstatus === 1) {
			let color = frm.doc.status === "Submitted" ? "green" : "red";
			frm.page.set_indicator(frm.doc.status, color);
		}
	},

	company(frm) {
		clear_allocation(frm);
		if (frm.doc.company && frm.doc.from_date && frm.doc.to_date) {
			load_expenses_preview(frm);
		}
	},

	from_date(frm) {
		clear_allocation(frm);
		if (frm.doc.company && frm.doc.from_date && frm.doc.to_date) {
			load_expenses_preview(frm);
		}
	},

	to_date(frm) {
		clear_allocation(frm);
		if (frm.doc.company && frm.doc.from_date && frm.doc.to_date) {
			load_expenses_preview(frm);
		}
	}
});

function clear_allocation(frm) {
	if (frm.doc.allocation_items && frm.doc.allocation_items.length > 0) {
		frappe.confirm(
			__("تغيير الفلتر سيمسح التوزيع المحسوب. هل تريد المتابعة؟"),
			function() {
				frm.clear_table("allocation_items");
				frm.refresh_field("allocation_items");
				frm.set_value("total_general_expenses", 0);
				frm.set_value("total_sales_amount", 0);
				frm.set_value("total_allocated", 0);
				frm.set_value("allocation_difference", 0);
			}
		);
	}
}

function load_expenses_preview(frm) {
	frappe.call({
		method: "mobile_pos.mobile_pos.doctype.general_expense_allocation.general_expense_allocation.get_general_expenses_preview",
		args: {
			company: frm.doc.company,
			from_date: frm.doc.from_date,
			to_date: frm.doc.to_date
		},
		callback: function(r) {
			if (r.message) {
				let data = r.message;
				let html = "";

				if (data.expenses && data.expenses.length > 0) {
					html = `
						<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
							<h5 style="margin-bottom: 10px;">${__("المصروفات العامة (بدون نقطة بيع)")}</h5>
							<table class="table table-bordered table-sm" style="margin: 0;">
								<thead style="background: #f8f9fa;">
									<tr>
										<th>${__("الرقم")}</th>
										<th>${__("التاريخ")}</th>
										<th>${__("المصروف")}</th>
										<th>${__("المبلغ")}</th>
									</tr>
								</thead>
								<tbody>
					`;

					data.expenses.forEach(function(exp) {
						html += `
							<tr>
								<td><a href="/app/expense-entry/${exp.name}">${exp.name}</a></td>
								<td>${frappe.datetime.str_to_user(exp.posting_date)}</td>
								<td>${exp.expense || ""}</td>
								<td style="text-align: right;">${format_currency(exp.amount)}</td>
							</tr>
						`;
					});

					html += `
								</tbody>
								<tfoot style="background: #e9ecef; font-weight: bold;">
									<tr>
										<td colspan="3">${__("الإجمالي")}</td>
										<td style="text-align: right;">${format_currency(data.total)}</td>
									</tr>
								</tfoot>
							</table>
						</div>
					`;
				} else {
					html = `
						<div class="frappe-card" style="padding: 15px; margin-bottom: 15px;">
							<p class="text-muted">${__("لا توجد مصروفات عامة في هذه الفترة")}</p>
						</div>
					`;
				}

				frm.get_field("expense_entries_html").$wrapper.html(html);
			}
		}
	});
}
