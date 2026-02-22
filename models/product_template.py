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
        warehouses = self.env['stock.warehouse'].search([])
        if not warehouses:
            for template in self:
                template.warehouse_qty_map = {}
            return

        # Collect all variant IDs across all templates in the recordset
        all_variant_ids = self.product_variant_ids.ids
        template_variant_map = {t.id: t.product_variant_ids.ids for t in self}

        # Build result map: {template_id: {wh_id: entry}}
        template_wh_qty = {t.id: {} for t in self}
        StockQuant = self.env['stock.quant']
        for wh in warehouses:
            groups = StockQuant._read_group(
                domain=[
                    ('product_id', 'in', all_variant_ids),
                    ('location_id', 'child_of', wh.lot_stock_id.id),
                    ('location_id.usage', '=', 'internal'),
                ],
                groupby=['product_id'],
                aggregates=['quantity:sum', 'reserved_quantity:sum'],
            )
            # Aggregate per-variant qty back up to template level
            variant_qtys = {
                product_rec.id: qty_sum - reserved_sum
                for product_rec, qty_sum, reserved_sum in groups
            }
            for template in self:
                total = sum(variant_qtys.get(vid, 0) for vid in template_variant_map[template.id])
                template_wh_qty[template.id][str(wh.id)] = {'name': wh.name, 'qty': total}

        # Batch-fetch reorder rules for all variants, keyed by (template_id, warehouse_id)
        # Use the minimum min_qty across all variants of a template (most conservative threshold)
        orderpoints = self.env['stock.warehouse.orderpoint'].search_read(
            [('product_id', 'in', all_variant_ids)],
            ['product_id', 'warehouse_id', 'product_min_qty'],
        )
        # Build reverse map: variant_id → template_id
        variant_to_tmpl = {
            vid: tmpl_id
            for tmpl_id, vids in template_variant_map.items()
            for vid in vids
        }
        tmpl_wh_min = {}  # {(template_id, warehouse_id): min_qty}
        for op in orderpoints:
            vid = op['product_id'][0]
            wid = op['warehouse_id'][0]
            tmpl_id = variant_to_tmpl.get(vid)
            if tmpl_id is None:
                continue
            key = (tmpl_id, wid)
            current = tmpl_wh_min.get(key)
            if current is None or op['product_min_qty'] < current:
                tmpl_wh_min[key] = op['product_min_qty']

        for template in self:
            qty_map = {}
            for wh in warehouses:
                entry = template_wh_qty[template.id].get(
                    str(wh.id), {'name': wh.name, 'qty': 0}
                )
                min_qty = tmpl_wh_min.get((template.id, wh.id))
                if min_qty is not None:
                    entry['min_qty'] = min_qty
                qty_map[str(wh.id)] = entry
            template.warehouse_qty_map = qty_map
