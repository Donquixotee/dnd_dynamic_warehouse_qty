import json
from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    warehouse_qty_map = fields.Json(
        string='Warehouse Quantities',
        compute='_compute_warehouse_qty_map',
        store=False,
        help='Dictionary mapping warehouse IDs to their quantities and names'
    )

    @api.depends('product_variant_ids.stock_quant_ids.quantity',
                 'product_variant_ids.stock_quant_ids.location_id',
                 'product_variant_ids.stock_quant_ids.reserved_quantity')
    def _compute_warehouse_qty_map(self):
        StockQuant = self.env['stock.quant']
        warehouses = self.env['stock.warehouse'].search([])

        for template in self:
            qty_map = {}
            product_variant = template.product_variant_id
            if not product_variant:
                template.warehouse_qty_map = {}
                continue
            for warehouse in warehouses:
                qty = StockQuant._get_available_quantity(product_variant,warehouse.lot_stock_id,allow_negative=True)
                qty_map[str(warehouse.id)] = {'name': warehouse.name,'qty': qty}
            template.warehouse_qty_map = qty_map
