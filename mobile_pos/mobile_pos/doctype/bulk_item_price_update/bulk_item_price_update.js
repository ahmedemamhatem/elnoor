// Copyright (c) 2024, Ahmed Emam and contributors
// For license information, please see license.txt

frappe.ui.form.on('Bulk Item Price Update', {
	load_items: function(frm) {
		if (!frm.doc.price_list) {
			frappe.msgprint(__('Please select a Price List first'));
			return;
		}
		frappe.call({
			method: 'mobile_pos.mobile_pos.doctype.bulk_item_price_update.bulk_item_price_update.get_all_items',
			args: {
				price_list: frm.doc.price_list
			},
			freeze: true,
			freeze_message: __('Loading Items...'),
			callback: function(r) {
				if (r.message) {
					frm.clear_table('items');
					r.message.forEach(function(item) {
						let row = frm.add_child('items');
						row.item_code = item.item_code;
						row.item_name = item.item_name;
						row.uom = item.uom;
						row.rate = item.rate || 0;
					});
					frm.refresh_field('items');
					frappe.msgprint(__('Loaded {0} items', [r.message.length]));
				}
			}
		});
	},

	apply_update: function(frm) {
		if (!frm.doc.items || frm.doc.items.length === 0) {
			frappe.msgprint(__('Please load items first'));
			return;
		}
		if (!frm.doc.update_value) {
			frappe.msgprint(__('Please enter an update value'));
			return;
		}

		let update_type = frm.doc.update_type || 'Fixed Value';
		let update_value = flt(frm.doc.update_value);

		frm.doc.items.forEach(function(row) {
			let old_rate = flt(row.rate);
			let new_rate = old_rate;

			if (update_type === 'Fixed Value') {
				new_rate = update_value;
			} else if (update_type === 'Percentage Increase') {
				new_rate = old_rate + (old_rate * update_value / 100);
			} else if (update_type === 'Percentage Decrease') {
				new_rate = old_rate - (old_rate * update_value / 100);
			}

			row.rate = Math.max(0, new_rate);
		});

		frm.refresh_field('items');
		frm.dirty();
		frappe.msgprint(__('Rates updated in table. Save and Submit to apply changes to Item Prices.'));
	}
});
