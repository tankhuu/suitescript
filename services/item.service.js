/**
 * item.service.js
 * Item Service
 *
 * @exports find, get, getList
 *
 * @copyright 2018 BTJ
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.0
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/search', 'N/record', 'N/error', 'underscore'],
  function (search, record, error, _) {
    var MODULE_NAME = 'ITEM_SERVICE';
    var exports = {};

    /**
     * LIST OF SUPPORTED REQUESTS
     */
    var SUPPORTED_REQUESTS = {
      FIND_BY_ID: 'findById',
      FIND_BY_VENDOR_NAME: 'findByVendorName',
      PATCH_SYNC_STATUS: 'patchSyncStatus'
    };
    // constants
    var WEBSITE_SYNC_STATUSES = {
      SYNCED: 'SYNCED',
      NOT_SYNCED: 'NOT_SYNCED',
      READY_TO_SYNC: 'READY_TO_SYNC',
    };

    function getSupportedRequests() {
      return SUPPORTED_REQUESTS;
    }

    function find(params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.FIND';
        // log.debug(LOG_TITLE + '.params', params);
        var request = params.request;

        switch (request) {
          case SUPPORTED_REQUESTS.FIND_BY_VENDOR_NAME: {
            var items = findByVendorName(params.vendorName) || [];
            return items;
          }
          case SUPPORTED_REQUESTS.FIND_BY_ID:
          default: {
            var items = findById(params.itemid);
            return items;
          }
        }

      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function patch(data, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.PATCH';
        var request = params.request;

        switch (request) {
          case SUPPORTED_REQUESTS.PATCH_SYNC_STATUS: {
            var itemIds = data.itemIds;
            var status = data.status;
            var result = [];

            if (!_.isEmpty(itemIds)) {
              itemIds.forEach(function (id) {
                var patchResult = patchSyncStatus(id, status);
                result.push({ result: patchResult });
              });
            }

            return result;
          }
          default: { }
        }
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function findByVendorName(vendorName) {
      try {
        var LOG_TITLE = MODULE_NAME + '.FIND_BY_VENDOR_NAME';
        log.debug(LOG_TITLE + '.vendorName', vendorName);

        var items = [];
        // log.debug(LOG_TITLE + '.search', search.load);
        var itemSearch = search.load({ id: 'customsearch_rs_search_by_vendor_name' });
        // log.debug(LOG_TITLE + '.itemSearch', itemSearch);
        var vendorNameFilter = search.createFilter({ name: 'vendorname', operator: search.Operator.IS, values: vendorName });

        itemSearch.filters.push(vendorNameFilter);
        log.debug(LOG_TITLE + '.itemSearch', itemSearch);

        itemSearch.run().each(function (item) {
          // log.debug(LOG_TITLE + '.item', item);
          var it = {
            itemNumber: item.getValue('itemid'),
            itemName: item.getValue('displayname'),
            netsuiteProductId: item.getValue('internalid'),
            erplyProductId: item.getValue('custitem_erply_product_id'),
            erplyLocationId: item.getValue({ name: 'custrecord_erply_location_id', join: 'inventoryLocation' }),
            netsuiteLocationId: item.getValue({ name: 'internalid', join: 'inventoryLocation' }),
            custitemSizeList: item.getText('custitem_size_list'),
            custitemGoldType: item.getText('custitem_gold_type')
          };

          items.push(it);
          return true;
        });
        log.debug(LOG_TITLE + '.items', items);

        return items;
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function findById(itemid) {
      try {
        var LOG_TITLE = MODULE_NAME + '.FIND_BY_ID';

      } catch (err) {

      }
    }

    function patchSyncStatus(id, status) {
      try {
        var LOG_TITLE = MODULE_NAME + '.PATCH_SYNC_STATUS';

        // if status not in WEBSITE_SYNC_STATUSES return error

        var itemRecord = record.load({ type: record.Type.INVENTORY_ITEM, id: id });
        itemRecord.setValue({ fieldId: 'custitem_btj_website_sync_status', value: WEBSITE_SYNC_STATUSES[status] });

        var item = itemRecord.save();
        if (item.id) return { internalid: item.id };
        return item;

      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    exports = {
      getSupportedRequests: getSupportedRequests,
      find: find,
      patch: patch
    };

    return exports;
  });