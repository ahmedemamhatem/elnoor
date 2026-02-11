// Copyright (c) 2025, Anthropic and contributors
// For license information, please see license.txt

frappe.query_reports["Share Ledger Report"] = {
	filters: [
		{
			fieldname: "company",
			label: __("الشركة"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
			reqd: 1
		},
		{
			fieldname: "shareholder",
			label: __("الشريك"),
			fieldtype: "Link",
			options: "Shareholder",
			get_query: function() {
				let company = frappe.query_report.get_filter_value("company");
				return {
					filters: {
						company: company,
						is_active: 1
					}
				};
			}
		},
		{
			fieldname: "mini_pos_profile",
			label: __("ملف نقطة البيع"),
			fieldtype: "Link",
			options: "Mini POS Profile",
			get_query: function() {
				let company = frappe.query_report.get_filter_value("company");
				return {
					filters: {
						company: company
					}
				};
			}
		},
		{
			fieldname: "from_date",
			label: __("من تاريخ"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			reqd: 1
		},
		{
			fieldname: "to_date",
			label: __("إلى تاريخ"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1
		},
		{
			fieldname: "transaction_type",
			label: __("نوع العملية"),
			fieldtype: "Select",
			options: [
				"",
				{"value": "Sales", "label": __("مبيعات")},
				{"value": "Sales Return", "label": __("مرتجع")},
				{"value": "Expense", "label": __("مصروف")}
			]
		},
		{
			fieldname: "voucher_type",
			label: __("نوع المستند"),
			fieldtype: "Select",
			options: [
				"",
				{"value": "Sales Invoice", "label": __("فاتورة مبيعات")},
				{"value": "Journal Entry", "label": __("قيد يومية")}
			]
		},
		{
			fieldname: "is_settled",
			label: __("حالة التسوية"),
			fieldtype: "Select",
			options: [
				"",
				{"value": "Yes", "label": __("تمت")},
				{"value": "No", "label": __("لم تتم")}
			]
		},
		{
			fieldname: "group_by",
			label: __("تجميع حسب"),
			fieldtype: "Select",
			options: [
				"",
				{"value": "item", "label": __("صنف")},
				{"value": "shareholder", "label": __("الشريك")},
				{"value": "mini_pos_profile", "label": __("ملف نقطة البيع")}
			]
		},
		{
			fieldname: "settlement_reference",
			label: __("مرجع التسوية"),
			fieldtype: "Link",
			options: "Shareholder Settlement"
		}
	],

	onload: function(report) {
		report.page.add_inner_button(__("إنشاء تسوية"), function() {
			let shareholder = frappe.query_report.get_filter_value("shareholder");
			let mini_pos_profile = frappe.query_report.get_filter_value("mini_pos_profile");
			let from_date = frappe.query_report.get_filter_value("from_date");
			let to_date = frappe.query_report.get_filter_value("to_date");
			let company = frappe.query_report.get_filter_value("company");

			if (!shareholder) {
				frappe.msgprint(__("يرجى اختيار الشريك أولاً"));
				return;
			}

			frappe.new_doc("Shareholder Settlement", {
				shareholder: shareholder,
				mini_pos_profile: mini_pos_profile,
				from_date: from_date,
				to_date: to_date,
				company: company
			});
		});

		report.page.add_inner_button(__("ملخص الشركاء"), function() {
			let mini_pos_profile = frappe.query_report.get_filter_value("mini_pos_profile");
			let from_date = frappe.query_report.get_filter_value("from_date");
			let to_date = frappe.query_report.get_filter_value("to_date");
			let company = frappe.query_report.get_filter_value("company");

			frappe.call({
				method: "mobile_pos.mobile_pos.report.share_ledger_report.share_ledger_report.get_shareholders_summary",
				args: {
					mini_pos_profile: mini_pos_profile,
					from_date: from_date,
					to_date: to_date,
					company: company
				},
				callback: function(r) {
					if (r.message) {
						show_shareholders_summary_dialog(r.message, from_date, to_date, company);
					}
				}
			});
		});
	}
};

function show_shareholders_summary_dialog(data, from_date, to_date, company) {
	let shareholders_html = "";

	if (data.length > 0) {
		let total_share = data.reduce((sum, sh) => sum + (sh.share_amount || 0), 0);
		let total_pending = data.reduce((sum, sh) => sum + (sh.pending_amount || 0), 0);
		let total_settled = data.reduce((sum, sh) => sum + (sh.settled_amount || 0), 0);

		shareholders_html = `
			<div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
				<div style="flex: 1; min-width: 150px; background: #cce5ff; padding: 15px; border-radius: 10px; text-align: center;">
					<div style="font-size: 0.85em; color: #004085;">إجمالي الحصص</div>
					<div style="font-size: 1.5em; font-weight: bold; color: #007bff;">${format_currency(total_share)}</div>
				</div>
				<div style="flex: 1; min-width: 150px; background: #d4edda; padding: 15px; border-radius: 10px; text-align: center;">
					<div style="font-size: 0.85em; color: #155724;">تمت التسوية</div>
					<div style="font-size: 1.5em; font-weight: bold; color: #28a745;">${format_currency(total_settled)}</div>
				</div>
				<div style="flex: 1; min-width: 150px; background: #fff3cd; padding: 15px; border-radius: 10px; text-align: center;">
					<div style="font-size: 0.85em; color: #856404;">معلق</div>
					<div style="font-size: 1.5em; font-weight: bold; color: #ffc107;">${format_currency(total_pending)}</div>
				</div>
			</div>

			<table class="table table-bordered" style="margin-top: 15px;">
				<thead style="background: #f8f9fa;">
					<tr>
						<th style="text-align: right;">اسم الشريك</th>
						<th style="text-align: right;">ملفات نقاط البيع</th>
						<th style="text-align: center;">عدد العمليات</th>
						<th style="text-align: left;">إجمالي الحصة</th>
						<th style="text-align: left;">تمت التسوية</th>
						<th style="text-align: left;">معلق</th>
					</tr>
				</thead>
				<tbody>
					${data.map(sh => `
						<tr>
							<td style="text-align: right; font-weight: bold;">
								<a href="/app/shareholder/${sh.shareholder}" style="color: #667eea;">${sh.shareholder_name || sh.shareholder}</a>
							</td>
							<td style="text-align: right; font-size: 0.9em;">
								${sh.profiles ? sh.profiles.map(p => `<span class="badge badge-light">${p}</span>`).join(' ') : '-'}
							</td>
							<td style="text-align: center;">${sh.transaction_count || 0}</td>
							<td style="text-align: left; font-weight: bold; color: #007bff;">${format_currency(sh.share_amount)}</td>
							<td style="text-align: left; color: #28a745;">${format_currency(sh.settled_amount)}</td>
							<td style="text-align: left; color: ${sh.pending_amount > 0 ? '#ffc107' : '#6c757d'}; font-weight: ${sh.pending_amount > 0 ? 'bold' : 'normal'};">
								${format_currency(sh.pending_amount)}
							</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;
	} else {
		shareholders_html = `<p style="text-align: center; color: #6c757d; margin-top: 20px;">لا توجد بيانات للشركاء في هذه الفترة</p>`;
	}

	let d = new frappe.ui.Dialog({
		title: __("ملخص حصص الشركاء"),
		size: "extra-large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "summary_html",
				options: `
					<div style="direction: rtl; text-align: right;">
						<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
							<h4 style="margin: 0 0 10px; color: white;">ملخص جميع الشركاء</h4>
							<p style="margin: 0; opacity: 0.9;">الفترة: من ${frappe.datetime.str_to_user(from_date)} إلى ${frappe.datetime.str_to_user(to_date)}</p>
						</div>
						${shareholders_html}
					</div>
				`
			}
		]
	});

	d.show();
	d.$wrapper.find('.modal-dialog').css('max-width', '900px');
}
