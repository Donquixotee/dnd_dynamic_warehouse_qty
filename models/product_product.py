from odoo import api, fields, models


class ProductProduct(models.Model):
    _inherit = 'product.product'

    warehouse_qty_map = fields.Json(
        string='Warehouse Quantities',
        compute='_compute_warehouse_qty_map',
        store=False,
        help='Dictionary mapping warehouse IDs to their quantities and names'
    )

    @api.depends('stock_quant_ids.quantity',
                 'stock_quant_ids.location_id',
                 'stock_quant_ids.reserved_quantity')
    def _compute_warehouse_qty_map(self):
        warehouses = self.env['stock.warehouse'].search([])
        if not warehouses:
            for product in self:
                product.warehouse_qty_map = {}
            return

        # Build result map: {product_id: {wh_id: entry}}
        product_wh_qty = {product.id: {} for product in self}
        StockQuant = self.env['stock.quant']
        for wh in warehouses:
            groups = StockQuant._read_group(
                domain=[
                    ('product_id', 'in', self.ids),
                    ('location_id', 'child_of', wh.lot_stock_id.id),
                    ('location_id.usage', '=', 'internal'),
                ],
                groupby=['product_id'],
                aggregates=['quantity:sum', 'reserved_quantity:sum'],
            )
            for product_rec, qty_sum, reserved_sum in groups:
                pid = product_rec.id
                if pid in product_wh_qty:
                    product_wh_qty[pid][str(wh.id)] = {
                        'name': wh.name,
                        'qty': qty_sum - reserved_sum,
                    }

        # Batch-fetch reorder rules: {(product_id, warehouse_id): min_qty}
        orderpoints = self.env['stock.warehouse.orderpoint'].search_read(
            [('product_id', 'in', self.ids)],
            ['product_id', 'warehouse_id', 'product_min_qty'],
        )
        orderpoint_map = {
            (op['product_id'][0], op['warehouse_id'][0]): op['product_min_qty']
            for op in orderpoints
        }

        for product in self:
            qty_map = {}
            for wh in warehouses:
                entry = product_wh_qty[product.id].get(
                    str(wh.id), {'name': wh.name, 'qty': 0}
                )
                min_qty = orderpoint_map.get((product.id, wh.id))
                if min_qty is not None:
                    entry['min_qty'] = min_qty
                qty_map[str(wh.id)] = entry
            product.warehouse_qty_map = qty_map
