{
    'name': 'Dynamic Warehouse Quantity Columns',
    'version': '17.0.1.0.0',
    'category': 'Inventory/Inventory',
    'summary': 'Display warehouse-specific quantities as dynamic columns in product list',
    'description': """
        This module dynamically displays warehouse-specific product quantities
        in both product.template and product.product tree views.

        Features:
        - Automatically adds/removes columns when warehouses are created/deleted
        - No database schema changes required
        - No Odoo restart needed
        - Shows available quantity per warehouse for each product
        - Works with both product templates and product variants
    """,
    'author': 'Sofiane',
    'license': 'AGPL-3',
    'depends': [
        'product',
        'stock',
        'web',
    ],
    'data': [
        'views/product_template_view.xml',
        'views/product_product_view.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'dnd_dynamic_warehouse_qty/static/src/js/dynamic_warehouse_list_renderer.js',
            'dnd_dynamic_warehouse_qty/static/src/js/patches/ks_lvm_compatibility.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
