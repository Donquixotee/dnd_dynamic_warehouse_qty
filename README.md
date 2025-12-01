# Dynamic Warehouse Quantity Columns

## Overview

This module dynamically displays warehouse-specific product quantities as separate columns in the `product.template` tree view.

## Features

- **Dynamic Columns**: Automatically adds one column per warehouse
- **No Schema Changes**: Uses computed JSON field, no database modifications
- **No Restart Required**: When warehouses are added/deleted, just refresh the page
- **Real-time Quantities**: Shows available quantity per warehouse for each product
- **Automatic Detection**: Scans all products to detect which warehouses to display

## Technical Implementation

### Python Side
- Adds a computed JSON field `warehouse_qty_map` to `product.template`
- Computes quantities using `stock.quant._get_available_quantity()`
- Returns a dictionary like:
  ```json
  {
    "1": {"name": "WH/Algiers", "qty": 120},
    "3": {"name": "WH/Oran", "qty": 55}
  }
  ```

### JavaScript Side
- Custom `ListRenderer` extension: `DynamicWarehouseListRenderer`
- Reads `warehouse_qty_map` from all records
- Builds a union of all warehouses
- Dynamically injects columns into the tree view
- Renders quantity values in each cell

## Usage

1. Install the module
2. Navigate to **Inventory > Products > Products**
3. The tree view will show:
   - Standard product columns (Name, Category, etc.)
   - Dynamic warehouse columns (one per warehouse)
   - Quantity values for each product-warehouse combination

## Example Display

| Product | Category | WH/Algiers | WH/Oran | WH/Setif |
|---------|----------|------------|---------|----------|
| Product A | Consumable | 120 | 55 | 0 |
| Product B | Service | 0 | 0 | 200 |
| Product C | Stockable | 45 | 80 | 120 |

## Performance

- Quantities are computed on-the-fly (not stored)
- Uses product's main variant only
- Warehouse list is cached per renderer instance
- No repeated queries per record

## Dependencies

- `product`
- `stock`
- `web`

## Author

Sofiane

## License

AGPL-3
