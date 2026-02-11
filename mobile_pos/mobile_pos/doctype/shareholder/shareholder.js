// Copyright (c) 2025, Anthropic and contributors
// For license information, please see license.txt

frappe.ui.form.on("Shareholder", {
	setup: function(frm) {
		// Filter payable_account to show only Payable type accounts
		frm.set_query("payable_account", function() {
			return {
				filters: {
					"account_type": "Payable",
					"is_group": 0,
					"company": frm.doc.company
				}
			};
		});
	},

	company: function(frm) {
		// Clear payable_account when company changes
		if (frm.doc.payable_account) {
			frm.set_value("payable_account", "");
		}
	},

	refresh: function(frm) {
		if (!frm.is_new()) {
			// Load POS profiles where this shareholder is assigned
			frm.call({
				method: "mobile_pos.mobile_pos.doctype.shareholder.shareholder.get_shareholder_pos_profiles",
				args: {
					shareholder: frm.doc.name
				},
				callback: function(r) {
					if (r.message && r.message.length > 0) {
						let html = `
							<table class="table table-bordered" style="margin: 0;">
								<thead style="background: #f8f9fa;">
									<tr>
										<th>${__("ملف نقطة البيع")}</th>
										<th>${__("النسبة")}</th>
										<th>${__("الحالة")}</th>
									</tr>
								</thead>
								<tbody>
						`;
						r.message.forEach(function(row) {
							html += `
								<tr>
									<td><a href="/app/mini-pos-profile/${row.pos_profile}">${row.pos_profile_name || row.pos_profile}</a></td>
									<td>${row.percentage}%</td>
									<td>${row.is_active ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-secondary">غير نشط</span>'}</td>
								</tr>
							`;
						});
						html += `</tbody></table>`;
						frm.get_field("pos_profiles_html").$wrapper.html(html);
					} else {
						frm.get_field("pos_profiles_html").$wrapper.html(`
							<p class="text-muted">${__("لم يتم تعيين هذا الشريك في أي ملف نقطة بيع بعد")}</p>
						`);
					}
				}
			});

			// Add button to view share ledger
			frm.add_custom_button(__("عرض سجل الشراكة"), function() {
				frappe.set_route("query-report", "Share Ledger Report", {
					shareholder: frm.doc.name
				});
			});

			// Add button to make advance payment
			if (frm.doc.payable_account) {
				frm.add_custom_button(__("دفع مقدم"), function() {
					show_advance_payment_dialog(frm);
				});
			}
		}
	}
});

function show_advance_payment_dialog(frm) {
	let d = new frappe.ui.Dialog({
		title: __("دفع مقدم للشريك"),
		fields: [
			{
				fieldname: "shareholder_info",
				fieldtype: "HTML",
				options: `
					<div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
						<strong>${frm.doc.shareholder_name}</strong><br>
						<span class="text-muted">${__("المبلغ المعلق")}: </span>
						<span style="color: #dc3545;">${format_currency(frm.doc.total_pending_amount || 0)}</span>
					</div>
				`
			},
			{
				fieldname: "amount",
				fieldtype: "Currency",
				label: __("المبلغ"),
				reqd: 1,
				description: __("مبلغ الدفع المقدم")
			},
			{
				fieldname: "mode_of_payment",
				fieldtype: "Link",
				label: __("طريقة الدفع"),
				options: "Mode of Payment",
				reqd: 1,
				change: function() {
					let mode = d.get_value("mode_of_payment");
					if (mode) {
						frappe.call({
							method: "erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account",
							args: {
								mode_of_payment: mode,
								company: frm.doc.company
							},
							callback: function(r) {
								if (r.message && r.message.account) {
									d.set_value("payment_account", r.message.account);
								}
							}
						});
					}
				}
			},
			{
				fieldname: "payment_account",
				fieldtype: "Link",
				label: __("حساب الدفع"),
				options: "Account",
				reqd: 1,
				read_only: 1,
				get_query: function() {
					return {
						filters: {
							"company": frm.doc.company,
							"account_type": ["in", ["Bank", "Cash"]],
							"is_group": 0
						}
					};
				}
			},
			{
				fieldname: "reference_no",
				fieldtype: "Data",
				label: __("رقم المرجع"),
				description: __("رقم الشيك أو رقم التحويل")
			},
			{
				fieldname: "remarks",
				fieldtype: "Small Text",
				label: __("ملاحظات")
			}
		],
		primary_action_label: __("تأكيد الدفع"),
		primary_action: function(values) {
			if (values.amount <= 0) {
				frappe.msgprint(__("المبلغ يجب أن يكون أكبر من صفر"));
				return;
			}
			if (!values.payment_account) {
				frappe.msgprint(__("يرجى اختيار طريقة الدفع"));
				return;
			}
			frappe.confirm(
				__("هل أنت متأكد من دفع مبلغ {0} للشريك {1}؟", [format_currency(values.amount), frm.doc.shareholder_name]),
				function() {
					frappe.call({
						method: "mobile_pos.mobile_pos.doctype.shareholder.shareholder.make_advance_payment",
						args: {
							shareholder: frm.doc.name,
							amount: values.amount,
							mode_of_payment: values.mode_of_payment,
							payment_account: values.payment_account,
							reference_no: values.reference_no,
							remarks: values.remarks
						},
						freeze: true,
						freeze_message: __("جاري إنشاء قيد الدفع..."),
						callback: function(r) {
							if (r.message) {
								frappe.show_alert({
									message: __("تم إنشاء قيد الدفع {0}", [r.message]),
									indicator: "green"
								});
								d.hide();
								frm.reload_doc();
							}
						}
					});
				}
			);
		}
	});

	d.show();
}
