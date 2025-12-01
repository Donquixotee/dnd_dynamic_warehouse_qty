/** @odoo-module **/

import { ListRenderer } from "@web/views/list/list_renderer";
import { patch } from "@web/core/utils/patch";

/**
 * Compatibility patch for ks_list_view_manager
 *
 * This patch ensures dynamic warehouse columns work correctly with the
 * ks_list_view_manager module by registering them in the fields_data
 * structure before resize operations.
 */
patch(ListRenderer.prototype, {

    setup() {
        super.setup(...arguments);

        // Register dynamic warehouse fields with ks_list_view_manager if it's installed
        if (this.ks_list_data && this.ks_list_data.fields_data) {
            this._registerWarehouseFieldsWithKsLvm();
        }
    },

    _registerWarehouseFieldsWithKsLvm() {
        // Check if this is a product.template list and has warehouse columns
        if (this.props.list?.resModel !== 'product.template') {
            return;
        }

        // Get all warehouse fields from this.fields
        for (const fieldName in this.fields) {
            if (fieldName.startsWith('warehouse_') && !this.ks_list_data.fields_data[fieldName]) {
                // Register the warehouse field with ks_list_view_manager
                this.ks_list_data.fields_data[fieldName] = {
                    ks_width: null,
                    name: fieldName,
                    string: this.fields[fieldName].string || fieldName,
                    type: 'float',
                    sortable: false,
                    readonly: true,
                };
            }
        }
    },

    onStartResize(ev) {
        // Before calling parent's onStartResize, ensure warehouse fields are registered
        if (this.ks_list_data && this.ks_list_data.fields_data) {
            const th = ev.target.closest("th");
            if (th && th.dataset && th.dataset.name) {
                const fieldName = th.dataset.name;

                // If this is a warehouse field and not yet in ks_list_data.fields_data, add it
                if (fieldName.startsWith('warehouse_') && !this.ks_list_data.fields_data[fieldName]) {
                    this.ks_list_data.fields_data[fieldName] = {
                        ks_width: null,
                        name: fieldName,
                        string: th.textContent.trim() || fieldName,
                        type: 'float',
                        sortable: false,
                        readonly: true,
                    };
                }
            }
        }

        // Now safely call parent's onStartResize
        return super.onStartResize(...arguments);
    },
});
