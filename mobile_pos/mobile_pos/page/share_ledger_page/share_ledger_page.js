frappe.pages['share-ledger-page'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'سجل حصص الشركاء',
		single_column: true
	});

	new ShareLedgerPage(page);
}

class ShareLedgerPage {
	constructor(page) {
		this.page = page;
		this.filters = {};
		this.data = [];

		this.setup_page();
		this.render_filters();
		this.load_data();
	}

	setup_page() {
		// Add buttons
		this.page.set_primary_action('تحديث', () => this.load_data(), 'refresh');

		this.page.add_inner_button('إنشاء تسوية', () => this.create_settlement());
		this.page.add_inner_button('تفاصيل الشركاء', () => this.show_shareholders_breakdown());

		// Main container
		this.page.main.html(`
			<div class="share-ledger-page" dir="rtl">
				<div class="filters-section"></div>
				<div class="summary-cards"></div>
				<div class="data-section">
					<div class="section-header">
						<span class="section-title">سجل العمليات</span>
						<span class="record-count"></span>
					</div>
					<div class="table-container"></div>
				</div>
				<div class="shareholders-section" style="display: none;">
					<div class="section-header">
						<span class="section-title">حصص الشركاء</span>
					</div>
					<div class="shareholders-grid"></div>
				</div>
			</div>
		`);

		this.$filters = this.page.main.find('.filters-section');
		this.$summary = this.page.main.find('.summary-cards');
		this.$table = this.page.main.find('.table-container');
		this.$shareholders = this.page.main.find('.shareholders-section');
		this.$count = this.page.main.find('.record-count');
	}

	render_filters() {
		const today = frappe.datetime.get_today();
		const month_ago = frappe.datetime.add_months(today, -1);

		this.$filters.html(`
			<div class="filters-row">
				<div class="filter-field">
					<label>الشركة</label>
					<div class="company-field"></div>
				</div>
				<div class="filter-field">
					<label>ملف نقطة البيع</label>
					<div class="profile-field"></div>
				</div>
				<div class="filter-field">
					<label>من تاريخ</label>
					<div class="from-date-field"></div>
				</div>
				<div class="filter-field">
					<label>إلى تاريخ</label>
					<div class="to-date-field"></div>
				</div>
				<div class="filter-field">
					<label>نوع العملية</label>
					<div class="txn-type-field"></div>
				</div>
				<div class="filter-field">
					<label>حالة التسوية</label>
					<div class="settled-field"></div>
				</div>
			</div>
		`);

		// Company field
		this.company_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				options: 'Company',
				fieldname: 'company',
				placeholder: 'اختر الشركة',
				default: frappe.defaults.get_user_default("Company"),
				change: () => {
					this.filters.company = this.company_field.get_value();
					this.load_data();
				}
			},
			parent: this.$filters.find('.company-field'),
			render_input: true
		});
		this.company_field.set_value(frappe.defaults.get_user_default("Company"));
		this.filters.company = frappe.defaults.get_user_default("Company");

		// Profile field
		this.profile_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Link',
				options: 'Mini POS Profile',
				fieldname: 'mini_pos_profile',
				placeholder: 'اختر ملف نقطة البيع',
				get_query: () => {
					return { filters: { company: this.filters.company } };
				},
				change: () => {
					this.filters.mini_pos_profile = this.profile_field.get_value();
					this.load_data();
				}
			},
			parent: this.$filters.find('.profile-field'),
			render_input: true
		});

		// From date
		this.from_date_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Date',
				fieldname: 'from_date',
				default: month_ago,
				change: () => {
					this.filters.from_date = this.from_date_field.get_value();
					this.load_data();
				}
			},
			parent: this.$filters.find('.from-date-field'),
			render_input: true
		});
		this.from_date_field.set_value(month_ago);
		this.filters.from_date = month_ago;

		// To date
		this.to_date_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Date',
				fieldname: 'to_date',
				default: today,
				change: () => {
					this.filters.to_date = this.to_date_field.get_value();
					this.load_data();
				}
			},
			parent: this.$filters.find('.to-date-field'),
			render_input: true
		});
		this.to_date_field.set_value(today);
		this.filters.to_date = today;

		// Transaction type
		this.txn_type_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Select',
				fieldname: 'transaction_type',
				options: '\nمبيعات\nمرتجع\nمصروف',
				change: () => {
					const val = this.txn_type_field.get_value();
					const map = {'مبيعات': 'Sales', 'مرتجع': 'Sales Return', 'مصروف': 'Expense'};
					this.filters.transaction_type = map[val] || '';
					this.load_data();
				}
			},
			parent: this.$filters.find('.txn-type-field'),
			render_input: true
		});

		// Settled status
		this.settled_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Select',
				fieldname: 'is_settled',
				options: '\nتمت\nلم تتم',
				change: () => {
					const val = this.settled_field.get_value();
					const map = {'تمت': 'Yes', 'لم تتم': 'No'};
					this.filters.is_settled = map[val] || '';
					this.load_data();
				}
			},
			parent: this.$filters.find('.settled-field'),
			render_input: true
		});
	}

	load_data() {
		this.$table.html('<div class="loading-state"><i class="fa fa-spinner fa-spin"></i> جاري التحميل...</div>');

		frappe.call({
			method: 'mobile_pos.mobile_pos.page.share_ledger_page.share_ledger_page.get_share_ledger_data',
			args: { filters: this.filters },
			callback: (r) => {
				if (r.message) {
					this.data = r.message.data || [];
					this.summary = r.message.summary || {};
					this.shareholders = r.message.shareholders || [];

					this.render_summary();
					this.render_table();
					this.render_shareholders();
				}
			}
		});
	}

	render_summary() {
		const s = this.summary;
		const profit_class = s.net_profit >= 0 ? '' : 'negative';

		this.$summary.html(`
			<div class="summary-card revenue">
				<div class="card-title">إجمالي الإيرادات</div>
				<div class="card-value">${this.format_currency(s.total_revenue || 0)}</div>
			</div>
			<div class="summary-card expense">
				<div class="card-title">إجمالي المصروفات</div>
				<div class="card-value">${this.format_currency(s.total_expense || 0)}</div>
			</div>
			<div class="summary-card profit ${profit_class}">
				<div class="card-title">صافي الربح</div>
				<div class="card-value">${this.format_currency(s.net_profit || 0)}</div>
			</div>
			<div class="summary-card count">
				<div class="card-title">عدد العمليات</div>
				<div class="card-value">${s.total_count || 0}</div>
			</div>
			<div class="summary-card settled">
				<div class="card-title">تمت التسوية</div>
				<div class="card-value">${s.settled_count || 0}</div>
			</div>
			<div class="summary-card unsettled">
				<div class="card-title">لم تتم التسوية</div>
				<div class="card-value">${s.unsettled_count || 0}</div>
			</div>
		`);
	}

	render_table() {
		if (!this.data.length) {
			this.$table.html(`
				<div class="empty-state">
					<i class="fa fa-inbox"></i>
					<p>لا توجد بيانات للعرض</p>
				</div>
			`);
			this.$count.text('');
			return;
		}

		this.$count.text(`(${this.data.length} سجل)`);

		const rows = this.data.map(row => `
			<tr>
				<td><a href="/app/share-ledger/${row.name}">${row.name}</a></td>
				<td>${frappe.datetime.str_to_user(row.posting_date)}</td>
				<td>${this.get_txn_badge(row.transaction_type)}</td>
				<td>${this.get_voucher_type_label(row.voucher_type)}</td>
				<td><a href="/app/${this.get_voucher_route(row.voucher_type)}/${row.voucher_no}">${row.voucher_no}</a></td>
				<td class="currency ${row.revenue_amount > 0 ? 'positive' : ''}">${this.format_currency(row.revenue_amount)}</td>
				<td class="currency ${row.expense_amount > 0 ? 'negative' : ''}">${this.format_currency(row.expense_amount)}</td>
				<td class="currency ${row.net_amount >= 0 ? 'positive' : 'negative'}">${this.format_currency(row.net_amount)}</td>
				<td>${this.get_settled_badge(row.is_settled)}</td>
				<td>${row.settlement_reference ? `<a href="/app/shareholder-settlement/${row.settlement_reference}">${row.settlement_reference}</a>` : '-'}</td>
			</tr>
		`).join('');

		this.$table.html(`
			<table class="share-ledger-table">
				<thead>
					<tr>
						<th>الرقم</th>
						<th>التاريخ</th>
						<th>نوع العملية</th>
						<th>نوع المستند</th>
						<th>رقم المستند</th>
						<th>الإيرادات</th>
						<th>المصروفات</th>
						<th>الصافي</th>
						<th>التسوية</th>
						<th>مرجع التسوية</th>
					</tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>
		`);
	}

	render_shareholders() {
		if (!this.shareholders.length || !this.filters.mini_pos_profile) {
			this.$shareholders.hide();
			return;
		}

		const cards = this.shareholders.map(sh => `
			<div class="shareholder-card">
				<div class="name">${sh.shareholder_name}</div>
				<div class="percentage">${sh.percentage}%</div>
				<div class="amount">${this.format_currency(sh.share_amount)}</div>
			</div>
		`).join('');

		this.$shareholders.find('.shareholders-grid').html(cards);
		this.$shareholders.show();
	}

	get_txn_badge(type) {
		const badges = {
			'Sales': '<span class="status-badge sales">مبيعات</span>',
			'Sales Return': '<span class="status-badge return">مرتجع</span>',
			'Expense': '<span class="status-badge expense">مصروف</span>'
		};
		return badges[type] || type;
	}

	get_voucher_type_label(type) {
		const labels = {
			'Sales Invoice': 'فاتورة مبيعات',
			'Journal Entry': 'قيد يومية',
			'Expense Entry': 'قيد مصروفات'
		};
		return labels[type] || type;
	}

	get_voucher_route(type) {
		const routes = {
			'Sales Invoice': 'sales-invoice',
			'Journal Entry': 'journal-entry',
			'Expense Entry': 'expense-entry'
		};
		return routes[type] || 'form';
	}

	get_settled_badge(is_settled) {
		return is_settled
			? '<span class="status-badge settled">تمت</span>'
			: '<span class="status-badge unsettled">لم تتم</span>';
	}

	format_currency(value) {
		return format_currency(value || 0, 'EGP');
	}

	create_settlement() {
		if (!this.filters.mini_pos_profile) {
			frappe.msgprint('يرجى اختيار ملف نقطة البيع أولاً');
			return;
		}

		frappe.new_doc('Shareholder Settlement', {
			mini_pos_profile: this.filters.mini_pos_profile,
			from_date: this.filters.from_date,
			to_date: this.filters.to_date,
			company: this.filters.company
		});
	}

	show_shareholders_breakdown() {
		if (!this.filters.mini_pos_profile) {
			frappe.msgprint('يرجى اختيار ملف نقطة البيع أولاً');
			return;
		}

		frappe.call({
			method: 'mobile_pos.mobile_pos.page.share_ledger_page.share_ledger_page.get_shareholder_breakdown',
			args: {
				mini_pos_profile: this.filters.mini_pos_profile,
				from_date: this.filters.from_date,
				to_date: this.filters.to_date,
				company: this.filters.company
			},
			callback: (r) => {
				if (r.message) {
					this.show_breakdown_dialog(r.message);
				}
			}
		});
	}

	show_breakdown_dialog(data) {
		let shareholders_html = '';

		if (data.shareholders && data.shareholders.length > 0) {
			shareholders_html = `
				<table class="table table-bordered" style="margin-top: 15px;">
					<thead style="background: #f8f9fa;">
						<tr>
							<th style="text-align: right;">اسم الشريك</th>
							<th style="text-align: center;">النسبة %</th>
							<th style="text-align: left;">المبلغ المستحق</th>
						</tr>
					</thead>
					<tbody>
						${data.shareholders.map(sh => `
							<tr>
								<td style="text-align: right; font-weight: bold;">${sh.shareholder_name}</td>
								<td style="text-align: center;">${sh.percentage}%</td>
								<td style="text-align: left; color: ${sh.share_amount > 0 ? '#28a745' : '#6c757d'}; font-weight: bold;">
									${format_currency(sh.share_amount, 'EGP')}
								</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			`;
		} else {
			shareholders_html = '<p style="text-align: center; color: #6c757d; margin-top: 20px;">لا يوجد شركاء مسجلين</p>';
		}

		let d = new frappe.ui.Dialog({
			title: 'تفاصيل حصص الشركاء',
			size: 'large',
			fields: [{
				fieldtype: 'HTML',
				fieldname: 'breakdown_html',
				options: `
					<div style="direction: rtl; text-align: right;">
						<div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
							<div style="flex: 1; min-width: 150px; background: #d4edda; padding: 15px; border-radius: 10px; text-align: center;">
								<div style="font-size: 0.85em; color: #155724;">إجمالي الإيرادات</div>
								<div style="font-size: 1.5em; font-weight: bold; color: #28a745;">${format_currency(data.total_revenue, 'EGP')}</div>
							</div>
							<div style="flex: 1; min-width: 150px; background: #f8d7da; padding: 15px; border-radius: 10px; text-align: center;">
								<div style="font-size: 0.85em; color: #721c24;">إجمالي المصروفات</div>
								<div style="font-size: 1.5em; font-weight: bold; color: #dc3545;">${format_currency(data.total_expense, 'EGP')}</div>
							</div>
							<div style="flex: 1; min-width: 150px; background: ${data.net_profit >= 0 ? '#cce5ff' : '#f8d7da'}; padding: 15px; border-radius: 10px; text-align: center;">
								<div style="font-size: 0.85em; color: ${data.net_profit >= 0 ? '#004085' : '#721c24'};">صافي الربح</div>
								<div style="font-size: 1.5em; font-weight: bold; color: ${data.net_profit >= 0 ? '#007bff' : '#dc3545'};">${format_currency(data.net_profit, 'EGP')}</div>
							</div>
						</div>
						<h5 style="border-bottom: 2px solid #667eea; padding-bottom: 10px; color: #333;">حصص الشركاء</h5>
						${shareholders_html}
					</div>
				`
			}],
			primary_action_label: 'إنشاء تسوية',
			primary_action: () => {
				d.hide();
				this.create_settlement();
			}
		});

		d.show();
	}
}
