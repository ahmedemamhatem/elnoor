# Copyright (c) 2024, Ahmed Emam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class BulkItemPriceUpdate(Document):
	def on_submit(self):
		self.create_or_update_item_prices()

	def create_or_update_item_prices(self):
		count = 0
		for item in self.items:
			# Check if Item Price already exists for this item, price list and uom
			existing_price = frappe.db.exists("Item Price", {
				"item_code": item.item_code,
				"price_list": self.price_list,
				"uom": item.uom
			})

			if existing_price:
				# Update existing Item Price
				item_price = frappe.get_doc("Item Price", existing_price)
				item_price.price_list_rate = item.rate
				if self.valid_from:
					item_price.valid_from = self.valid_from
				if self.valid_upto:
					item_price.valid_upto = self.valid_upto
				item_price.save()
			else:
				# Create new Item Price
				item_price = frappe.new_doc("Item Price")
				item_price.item_code = item.item_code
				item_price.price_list = self.price_list
				item_price.uom = item.uom
				item_price.price_list_rate = item.rate
				if self.valid_from:
					item_price.valid_from = self.valid_from
				if self.valid_upto:
					item_price.valid_upto = self.valid_upto
				item_price.insert()
			count += 1

		frappe.msgprint(f"Updated/Created {count} Item Prices")


@frappe.whitelist()
def get_all_items(price_list=None, company=None):
	"""Get all items with their stock UOM and existing price if available"""
	filters = {"disabled": 0, "is_sales_item": 1}

	items = frappe.get_all(
		"Item",
		filters=filters,
		fields=["item_code", "item_name", "stock_uom"]
	)

	result = []
	for item in items:
		rate = 0
		if price_list:
			# Get existing price if available
			existing_price = frappe.db.get_value(
				"Item Price",
				{"item_code": item.item_code, "price_list": price_list, "uom": item.stock_uom},
				"price_list_rate"
			)
			if existing_price:
				rate = existing_price

		result.append({
			"item_code": item.item_code,
			"item_name": item.item_name,
			"uom": item.stock_uom,
			"rate": rate
		})

	return result
