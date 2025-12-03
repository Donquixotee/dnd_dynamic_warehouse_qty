/** @odoo-module **/

import { ListRenderer } from "@web/views/list/list_renderer";
import { listView } from "@web/views/list/list_view";
import { registry } from "@web/core/registry";
import { onWillUpdateProps } from "@odoo/owl";

export class DynamicWarehouseListRenderer extends ListRenderer {

    setup() {
        super.setup();
        this.warehouseColumns = [];

        // Populate record.data with warehouse values on initial setup
        this.populateWarehouseData(this.props.list);

        // Hook into Owl's onWillUpdateProps to handle search/filter/group by changes
        onWillUpdateProps((nextProps) => {
            // Clear warehouse cache to detect new/removed warehouses after search/filter/group
            this.warehouseColumns = [];

            // Repopulate record.data for warehouse columns when props change
            // This handles search, filters, grouping, and pagination
            this.populateWarehouseData(nextProps.list);
        });
    }

    populateWarehouseData(list) {
        const supportedModels = ['product.template', 'product.product'];
        if (!list?.resModel || !supportedModels.includes(list.resModel) || !list?.records) {
            return;
        }

        // Get warehouses from current record set
        const warehouseColumns = this.getWarehouseColumnsFromRecords(list.records);

        // Populate record.data with warehouse quantities
        for (const record of list.records) {
            const warehouseQtyMap = record.data.warehouse_qty_map;

            if (warehouseQtyMap && typeof warehouseQtyMap === 'object') {
                for (const wh of warehouseColumns) {
                    const fieldName = `warehouse_${wh.id}`;
                    const qty = warehouseQtyMap[wh.id]?.qty || 0;
                    record.data[fieldName] = qty;
                }
            }
        }

        // Create field definitions for warehouse columns
        warehouseColumns.forEach(wh => {
            const fieldName = `warehouse_${wh.id}`;
            if (!this.fields[fieldName]) {
                this.fields[fieldName] = {
                    name: fieldName,
                    type: 'float',
                    string: wh.label,
                    sortable: false,
                    readonly: true,
                    store: false,
                    searchable: false,
                    aggregator: null,
                    groupable: false,
                    onChange: false,
                    relation: null,
                    required: false,
                };
            }
        });

        // Register warehouse fields with ks_list_view_manager if it's installed
        if (this._registerWarehouseFieldsWithKsLvm) {
            this._registerWarehouseFieldsWithKsLvm();
        }
    }

    getActiveColumns(list) {
        const baseActive = super.getActiveColumns(list);

        const supportedModels = ['product.template', 'product.product'];
        if (!list?.resModel || !supportedModels.includes(list.resModel)) {
            return baseActive;
        }

        // Add warehouse columns, avoiding duplicates
        const warehouseColumns = this.allColumns.filter(col => col.id && col.id.startsWith('wh_col_'));
        const existingIds = new Set(baseActive.map(col => col.id));
        const uniqueWarehouseColumns = warehouseColumns.filter(col => !existingIds.has(col.id));

        return [...baseActive, ...uniqueWarehouseColumns];
    }

    processAllColumn(allColumns, list) {
        const baseProcessed = super.processAllColumn(allColumns, list);

        const supportedModels = ['product.template', 'product.product'];
        if (!list?.resModel || !supportedModels.includes(list.resModel)) {
            return baseProcessed;
        }

        // Avoid duplicates
        const existingIds = new Set(baseProcessed.map(col => col.id));
        const hasWarehouseColumns = Array.from(existingIds).some(id => id && id.startsWith('wh_col_'));

        if (hasWarehouseColumns) {
            return baseProcessed;
        }

        const warehouseColumns = this.getWarehouseColumns();

        if (warehouseColumns.length === 0) {
            return baseProcessed;
        }

        const dynamicColumns = warehouseColumns.map(wh => ({
            id: `wh_col_${wh.id}`,
            name: `warehouse_${wh.id}`,
            type: 'field',
            viewType: 'list',
            label: wh.label,
            string: wh.label,
            class: 'o_list_number_th',
            widget: null,
            optional: 'show',
            readonly: true,
            hasLabel: true,
            attrs: {},
            options: {},
        }));

        return [...baseProcessed, ...dynamicColumns];
    }

    isSortable(column) {
        if (column.name && column.name.startsWith('warehouse_')) {
            return false;
        }
        return super.isSortable(column);
    }

    getFieldFromRecord(record, fieldName) {
        if (fieldName.startsWith('warehouse_')) {
            const whId = fieldName.replace('warehouse_', '');
            const warehouseQtyMap = record.data.warehouse_qty_map;

            if (warehouseQtyMap && warehouseQtyMap[whId]) {
                const qty = warehouseQtyMap[whId].qty || 0;
                return { value: qty, raw: qty };
            }
            return { value: 0, raw: 0 };
        }

        return super.getFieldFromRecord(record, fieldName);
    }

    getWarehouseColumns() {
        if (this.warehouseColumns && this.warehouseColumns.length > 0) {
            return this.warehouseColumns;
        }

        if (!this.props.list || !this.props.list.records) {
            return [];
        }

        this.warehouseColumns = this.getWarehouseColumnsFromRecords(this.props.list.records);
        return this.warehouseColumns;
    }

    getWarehouseColumnsFromRecords(records) {
        const warehouseMap = new Map();

        if (!records) {
            return [];
        }

        for (const record of records) {
            const warehouseQtyMap = record.data.warehouse_qty_map;

            if (warehouseQtyMap && typeof warehouseQtyMap === 'object') {
                for (const [whId, whData] of Object.entries(warehouseQtyMap)) {
                    if (!warehouseMap.has(whId)) {
                        warehouseMap.set(whId, {
                            id: whId,
                            name: whData.name,
                            label: whData.name,
                        });
                    }
                }
            }
        }

        return Array.from(warehouseMap.values());
    }

    getCellTitle(column, record) {
        // Fallback: ensure record.data is populated
        if (column.name && column.name.startsWith('warehouse_')) {
            const whId = column.name.replace('warehouse_', '');
            const warehouseQtyMap = record.data.warehouse_qty_map;

            if (warehouseQtyMap && warehouseQtyMap[whId]) {
                const qty = warehouseQtyMap[whId].qty || 0;
                if (!(column.name in record.data)) {
                    record.data[column.name] = qty;
                }
            } else if (!(column.name in record.data)) {
                record.data[column.name] = 0;
            }
        }
        return super.getCellTitle(column, record);
    }

    canUseFormatter(column, record) {
        if (column.name && column.name.startsWith('warehouse_')) {
            return true;
        }
        return super.canUseFormatter(column, record);
    }

    getFormattedValue(column, record) {
        if (column.name && column.name.startsWith('warehouse_')) {
            const whId = column.name.replace('warehouse_', '');
            const warehouseQtyMap = record.data.warehouse_qty_map;

            if (warehouseQtyMap && warehouseQtyMap[whId]) {
                return warehouseQtyMap[whId].qty || 0;
            }
            return 0;
        }

        return super.getFormattedValue(column, record);
    }
}

DynamicWarehouseListRenderer.components = ListRenderer.components;
DynamicWarehouseListRenderer.props = ListRenderer.props;
DynamicWarehouseListRenderer.defaultProps = ListRenderer.defaultProps;

export const ProductTemplateWarehouseListView = {
    ...listView,
    type: "product_template_warehouse_list",
    Renderer: DynamicWarehouseListRenderer,
};

export const ProductProductWarehouseListView = {
    ...listView,
    type: "product_product_warehouse_list",
    Renderer: DynamicWarehouseListRenderer,
};

registry.category("views").add("product_template_warehouse_list", ProductTemplateWarehouseListView);
registry.category("views").add("product_product_warehouse_list", ProductProductWarehouseListView);
