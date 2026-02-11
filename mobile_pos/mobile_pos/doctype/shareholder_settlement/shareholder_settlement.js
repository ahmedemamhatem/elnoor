// Copyright (c) 2025, Anthropic and contributors
// For license information, please see license.txt

frappe.ui.form.on("Shareholder Settlement", {
	setup(frm) {
		// Filter mini_pos_profile by company
		frm.set_query("mini_pos_profile", function() {
			return {
				filters: {
					company: frm.doc.company
				}
			};
		});

		// Filter shareholder by company
		frm.set_query("shareholder", function() {
			return {
				filters: {
					company: frm.doc.company,
					is_active: 1
				}
			};
		});
	},

	refresh(frm) {
		// Add Fetch Entries button
		if (frm.doc.docstatus === 0 && frm.doc.shareholder && frm.doc.from_date && frm.doc.to_date) {
			frm.add_custom_button(__("جلب القيود"), function() {
				frm.call({
					method: "fetch_share_ledger_entries",
					doc: frm.doc,
					freeze: true,
					freeze_message: __("جاري الجلب..."),
					callback: function(r) {
						if (r.message) {
							frm.reload_doc();
							if (frm.doc.share_ledger_entries && frm.doc.share_ledger_entries.length > 0) {
								frappe.show_alert({
									message: __("تم جلب {0} قيد", [frm.doc.share_ledger_entries.length]),
									indicator: "green"
								});
							} else {
								frappe.show_alert({
									message: __("لا توجد قيود غير مسواة في هذه الفترة"),
									indicator: "orange"
								});
							}
						}
					}
				});
			}).addClass("btn-primary");
		}

		// Add View Share Ledger button
		if (frm.doc.shareholder && frm.doc.from_date && frm.doc.to_date) {
			frm.add_custom_button(__("عرض سجل الشراكة"), function() {
				let filters = {
					"shareholder": frm.doc.shareholder,
					"from_date": frm.doc.from_date,
					"to_date": frm.doc.to_date
				};
				if (frm.doc.mini_pos_profile) {
					filters["mini_pos_profile"] = frm.doc.mini_pos_profile;
				}
				frappe.set_route("query-report", "Share Ledger Report", filters);
			});
		}

		// Add Make Payment button for submitted settlements with amount > 0
		if (frm.doc.docstatus === 1 && frm.doc.status === "Submitted" && flt(frm.doc.share_amount) > 0) {
			frm.add_custom_button(__("دفع للشريك"), function() {
				show_payment_dialog(frm);
			}).addClass("btn-primary");
		}

		// Show status indicator
		if (frm.doc.docstatus === 1) {
			let indicator_color = {
				"Submitted": "orange",
				"Paid": "green",
				"Cancelled": "red"
			}[frm.doc.status] || "grey";

			frm.page.set_indicator(frm.doc.status, indicator_color);
		}

		// Show summary card
		if (frm.doc.shareholder && frm.doc.from_date && frm.doc.to_date && frm.doc.docstatus === 0) {
			show_summary_preview(frm);
		}
	},

	shareholder(frm) {
		if (frm.doc.shareholder) {
			frappe.db.get_value("Shareholder", frm.doc.shareholder, ["company", "shareholder_name"], function(r) {
				if (r) {
					frm.set_value("company", r.company);
					frm.set_value("shareholder_name", r.shareholder_name);
				}
			});
		}
	},

	from_date(frm) {
		clear_entries_on_filter_change(frm);
	},

	to_date(frm) {
		clear_entries_on_filter_change(frm);
	},

	mini_pos_profile(frm) {
		clear_entries_on_filter_change(frm);
	}
});

function clear_entries_on_filter_change(frm) {
	if (frm.doc.share_ledger_entries && frm.doc.share_ledger_entries.length > 0) {
		frappe.confirm(
			__("تغيير الفلتر سيمسح القيود المجلوبة. هل تريد المتابعة؟"),
			function() {
				frm.clear_table("share_ledger_entries");
				frm.refresh_field("share_ledger_entries");
				frm.set_value("total_revenue", 0);
				frm.set_value("total_expenses", 0);
				frm.set_value("net_profit", 0);
				frm.set_value("percentage", 0);
				frm.set_value("share_amount", 0);
			}
		);
	}
}

function show_summary_preview(frm) {
	if (!frm.doc.shareholder || !frm.doc.from_date || !frm.doc.to_date) return;

	frappe.call({
		method: "mobile_pos.mobile_pos.doctype.shareholder_settlement.shareholder_settlement.get_unsettled_summary",
		args: {
			shareholder: frm.doc.shareholder,
			from_date: frm.doc.from_date,
			to_date: frm.doc.to_date,
			mini_pos_profile: frm.doc.mini_pos_profile || null
		},
		callback: function(r) {
			if (r.message && r.message.entry_count > 0) {
				let summary = r.message;
				frm.dashboard.add_comment(__("يوجد {0} قيد غير مسوى بمبلغ حصة {1}", [
					summary.entry_count,
					format_currency(summary.share_amount)
				]), "blue", true);
			} else {
				frm.dashboard.add_comment(__("لا توجد قيود غير مسواة في هذه الفترة"), "orange", true);
			}
		}
	});
}

function show_payment_dialog(frm) {
	// First fetch shareholder advance balance
	frappe.db.get_value("Shareholder", frm.doc.shareholder, "advance_balance", function(r) {
		let advance_balance = flt(r && r.advance_balance) || 0;
		let share_amount = flt(frm.doc.share_amount);
		let remaining_to_pay = Math.max(0, share_amount - advance_balance);
		let advance_to_use = Math.min(advance_balance, share_amount);

		let d = new frappe.ui.Dialog({
			title: __("دفع للشريك"),
			fields: [
				{
					fieldname: "shareholder_info",
					fieldtype: "HTML",
					options: `
						<div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
							<strong>${frm.doc.shareholder_name}</strong><br>
							<table style="width: 100%; margin-top: 10px;">
								<tr>
									<td>${__("مبلغ الحصة")}:</td>
									<td style="text-align: left; font-weight: bold;">${format_currency(share_amount)}</td>
								</tr>
								<tr>
									<td>${__("المقدم")}:</td>
									<td style="text-align: left; color: ${advance_balance > 0 ? '#28a745' : '#6c757d'};">${format_currency(advance_balance)}</td>
								</tr>
							</table>
						</div>
					`
				},
				{
					fieldname: "use_advance",
					fieldtype: "Check",
					label: __("استخدام المقدم"),
					default: advance_balance > 0 ? 1 : 0,
					hidden: advance_balance <= 0,
					change: function() {
						update_payment_summary(d, share_amount, advance_balance);
					}
				},
				{
					fieldname: "advance_amount",
					fieldtype: "Currency",
					label: __("مبلغ المقدم المستخدم"),
					default: advance_to_use,
					read_only: 1,
					depends_on: "eval:doc.use_advance && " + advance_balance + " > 0",
					hidden: advance_balance <= 0
				},
				{
					fieldname: "payment_summary",
					fieldtype: "HTML",
					options: get_payment_summary_html(share_amount, advance_to_use, remaining_to_pay, advance_balance > 0),
					hidden: advance_balance <= 0
				},
				{
					fieldname: "section_payment",
					fieldtype: "Section Break",
					label: __("طريقة الدفع"),
					depends_on: "eval:" + remaining_to_pay + " > 0 || !" + (advance_balance > 0)
				},
				{
					fieldname: "mode_of_payment",
					fieldtype: "Link",
					label: __("طريقة الدفع"),
					options: "Mode of Payment",
					reqd: remaining_to_pay > 0 || advance_balance <= 0,
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
					reqd: remaining_to_pay > 0 || advance_balance <= 0,
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
				}
			],
			primary_action_label: __("تأكيد الدفع"),
			primary_action: function(values) {
				let use_advance = values.use_advance && advance_balance > 0;
				let adv_amount = use_advance ? Math.min(advance_balance, share_amount) : 0;
				let cash_amount = share_amount - adv_amount;

				if (cash_amount > 0 && !values.payment_account) {
					frappe.msgprint(__("يرجى اختيار طريقة الدفع"));
					return;
				}

				let confirm_msg = use_advance && adv_amount > 0
					? __("هل أنت متأكد من دفع مبلغ {0} للشريك {1}؟\n\nسيتم خصم {2} من المقدم",
						[format_currency(share_amount), frm.doc.shareholder_name, format_currency(adv_amount)])
					: __("هل أنت متأكد من دفع مبلغ {0} للشريك {1}؟",
						[format_currency(share_amount), frm.doc.shareholder_name]);

				frappe.confirm(confirm_msg, function() {
					frappe.call({
						method: "make_payment",
						doc: frm.doc,
						args: {
							mode_of_payment: values.mode_of_payment,
							payment_account: values.payment_account,
							use_advance: use_advance ? 1 : 0
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
				});
			}
		});

		d.show();
	});
}

function get_payment_summary_html(share_amount, advance_amount, remaining, has_advance) {
	if (!has_advance) return "";
	return `
		<div style="margin: 10px 0; padding: 10px; background: #e8f5e9; border-radius: 5px; border: 1px solid #c8e6c9;">
			<table style="width: 100%;">
				<tr>
					<td>${__("من المقدم")}:</td>
					<td style="text-align: left; color: #2e7d32;">${format_currency(advance_amount)}</td>
				</tr>
				<tr>
					<td>${__("المتبقي للدفع نقداً")}:</td>
					<td style="text-align: left; font-weight: bold;">${format_currency(remaining)}</td>
				</tr>
			</table>
		</div>
	`;
}

function update_payment_summary(dialog, share_amount, advance_balance) {
	let use_advance = dialog.get_value("use_advance");
	let advance_amount = use_advance ? Math.min(advance_balance, share_amount) : 0;
	let remaining = share_amount - advance_amount;

	dialog.set_value("advance_amount", advance_amount);
	dialog.fields_dict.payment_summary.$wrapper.html(
		get_payment_summary_html(share_amount, advance_amount, remaining, true)
	);

	// Update required state of payment fields
	if (remaining > 0) {
		dialog.fields_dict.mode_of_payment.df.reqd = 1;
		dialog.fields_dict.payment_account.df.reqd = 1;
	} else {
		dialog.fields_dict.mode_of_payment.df.reqd = 0;
		dialog.fields_dict.payment_account.df.reqd = 0;
	}
	dialog.refresh();
}
