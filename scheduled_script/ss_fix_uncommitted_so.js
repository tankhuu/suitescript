/**
 * ss_fix_uncommitted_so.js
 * Schedule Script Fix Uncommitted SO
 * Title: PRECITA-SS-fixUncommittedSO
 * ID: _ss_fix_uncommitted_so
 *
 * @exports execute
 *
 * @copyright 2018 BTJ
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/runtime', 'N/error', 'N/record', 'N/search', 'erply_api', 'moment', 'configurations', 'helpers', 'underscore'],
  function (runtime, error, record, search, erply, moment, configurations, helpers, _) {
    var exports = {};
    var MODULE_NAME = 'FIX_UNCOMMITTED_SO';

    /**
     * CONSTANTS
     */
    var DEFAULT_SUBSIDIARY = '2';
    var DEFAULT_DEPARTMENT = '11';
    var DEFAULT_ADJUST_QUANTITY = '1';
    var DEFAULT_TRANSFER_LOCATION = '447';
    var DEFAULT_MEMO = MODULE_NAME;
    var ENV = helpers.getEnvironment() || 'stage';
    log.debug(MODULE_NAME + '.environment', ENV);

    /**
     * <code>execute</code> event handler
     *
     * @governance XXX
     *
     * @param context
     *    {Object}
     * @param context.type
     *        {InvocationTypes} Enumeration that holds the string values for
     *            scheduled script execution contexts
     *
     * @return {void}
     *
     * @static
     * @function execute
     */
    function execute() {
      try {
        var TITLE = MODULE_NAME + '.execute';
        log.debug(TITLE, '<< START >>');
        var startTime = moment();

        var unCommittedSOs = [];
        var eInvoiceIds = []; // Erply Invoice Ids
        var nSOIds = []; // Netsuite Sales Order Ids

        var eInvoicesInfo = [];
        var nSOsInfo = [];
        var nInventoryTransfersInfo = [];
        var nInventoryTransfersResult = [];
        var slackMessageFields = [];

        /**
         * Get unCommittedSOs from params
         */
        unCommittedSOs = getUnCommittedSOs();
        log.debug(TITLE + '.unCommittedSOs', unCommittedSOs);

        /* Notify To Slack */
        // Send Message To Slack
        slackMessageFields = [];
        slackMessageFields.push({
          title: 'List unCommitted SOs',
          value: JSON.stringify(unCommittedSOs)
        });
        slackMessageFields.push({
          title: 'Start Time',
          value: startTime.format('LLLL')
        });
        slackMessageFields.push({
          title: 'Run Time',
          value: moment().diff(startTime, 'minutes') + ' minutes'
        });
        if (!_.isEmpty(slackMessageFields))
          helpers.sendMessageToSlack(ENV, 'normal', TITLE, slackMessageFields);

        /**
         * Collect Erply & Netsuite Ids
         */
        if (!_.isEmpty(unCommittedSOs))
          unCommittedSOs.forEach(function (so) {
            if (so.length === 2) {
              eInvoiceIds.push(so[0]);
              nSOIds.push(so[1]);
            }
            // if (so.eInvoiceId)
            //   eInvoiceIds.push(so.eInvoiceId);
            // if (so.nSOId)
            //   nSOIds.push(so.nSOId);
          });
        log.debug(TITLE + '.eInvoiceIds', eInvoiceIds);
        log.debug(TITLE + '.nSOIds', nSOIds);

        /**
         * Extract Erply Invoice Information
         */
        if (!_.isEmpty(eInvoiceIds))
          eInvoicesInfo = extractErplyInvoiceInfo(ENV, eInvoiceIds);
        // log.debug(TITLE + '.eInvoicesInfo', eInvoicesInfo);

        /**
         * Extract Netsuite SO Information
         */
        if (!_.isEmpty(nSOIds))
          nSOsInfo = extractNetsuiteSOsInfo(nSOIds);
        // log.debug(TITLE + '.nSOInfo', nSOsInfo);

        /**
         * Transfer Data for Netsuite InventoryTransfer
         */
        if (!_.isEmpty(eInvoicesInfo) && !_.isEmpty(nSOsInfo))
          nInventoryTransfersInfo = transferNetsuiteInventoryTransferInfo(eInvoicesInfo, nSOsInfo);
        log.debug(TITLE + '.nInventoryTransfersInfo', nInventoryTransfersInfo);

        /**
         * Load InventoryTransfers into Netsuite
         */
        if (!_.isEmpty(nInventoryTransfersInfo))
          nInventoryTransfersResult = createNetsuiteInventoryTransfers(nInventoryTransfersInfo);
        // log.debug(TITLE + '.nInventoryTransfersResult', nInventoryTransfersResult);

        /* Notify To Slack */
        // Send Message To Slack
        slackMessageFields = [];
        if (!_.isEmpty(nInventoryTransfersResult)) {
          slackMessageFields.push({
            title: 'Total InventoryTransfers Created',
            value: JSON.stringify(nInventoryTransfersResult.length)
          });
          slackMessageFields.push({
            title: 'List InventoryTransfers Created',
            value: nInventoryTransfersResult.join()
          });
          slackMessageFields.push({
            title: 'Start Time',
            value: startTime.format('LLLL')
          });
          slackMessageFields.push({
            title: 'Run Time',
            value: moment().diff(startTime, 'minutes') + ' minutes'
          });
        }
        if (!_.isEmpty(slackMessageFields))
          helpers.sendMessageToSlack(ENV, 'normal', TITLE, slackMessageFields);

        log.debug(TITLE, '<< END >>');
      } catch (err) {
        log.error(TITLE, err.message);
        var slackMessageFields = [];
        slackMessageFields.push({ title: TITLE, value: err.message });
        !_.isEmpty(slackMessageFields) && helpers.sendMessageToSlack(ENV, 'danger', TITLE, slackMessageFields);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Get unCommittedSOs from Scheduled Script Parameter
     * @returns {any | Array}
     */
    function getUnCommittedSOs() {
      try {
        var scriptObj = runtime.getCurrentScript();
        var unCommittedSOs = [];

        var listSOs = scriptObj.getParameter({ name: 'custscript_uncommitted_sos' }) || '';
        if (!_.isEmpty(listSOs)) {
          unCommittedSOs = JSON.parse(listSOs);
        }

        return unCommittedSOs;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Extract Erply Invoice Information
     * @param env
     * @param eInvoiceIds
     * @returns {Array}
     */
    function extractErplyInvoiceInfo(env, eInvoiceIds) {
      try {
        var TITLE = MODULE_NAME + '.extractErplyInvoiceInfo';
        var eInvoicesInfo = [];

        if (!_.isEmpty(eInvoiceIds)) {
          /* Connect to Erply API */
          // Get the Environment Erply API Configurations
          var ERPLY_CONFIG = configurations.getConfig(env, 'erply').api;
          // log.debug(TITLE + '.ERPLY_CONFIG: ', ERPLY_CONFIG);
          // Initiation for Erply API
          var EAPI = new erply.erplyAPI(ERPLY_CONFIG.url, ERPLY_CONFIG.clientCode, ERPLY_CONFIG.username, ERPLY_CONFIG.password);
          // log.debug(TITLE + '.EAPI: ', JSON.stringify(EAPI));

          // Define Request Parameters
          var parameters = {
            ids: eInvoiceIds.join()
          };
          var eResponse = EAPI.sendRequest('getSalesDocuments', parameters);
          // log.debug(TITLE + '.erplyResponse', eResponse);

          if (eResponse.status) {
            if (eResponse.status.errorCode === 0) {
              if (!_.isEmpty(eResponse.records)) {
                eResponse.records.forEach(function (eRecord) {
                  var eInvoice = {
                    id: '',
                    number: '',
                    date: '',
                    inventoryTransactionDate: '',
                    warehouseID: '',
                    warehouseName: ''
                  };
                  for (var field in eInvoice) {
                    eInvoice[field] = eRecord[field];
                  }
                  if (!_.isEmpty(eRecord.rows)) {
                    eInvoice.items = [];
                    eRecord.rows.forEach(function (row) {
                      var item = {
                        productID: '',
                        code: ''
                      };
                      for (var field in item) {
                        item[field] = row[field];
                      }

                      eInvoice.items.push(item);
                    });
                  }

                  eInvoicesInfo.push(eInvoice);
                });
              }
            } else {
              throw error.create({
                name: TITLE,
                message: eResponse.status.responseStatus
              });
            }
          }
        }

        return eInvoicesInfo;
      } catch (err) {
        log.error(TITLE, err.message);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Extract Netsuite Sales Orders Information
     * @param nSOIds
     * @returns {Array}
     */
    function extractNetsuiteSOsInfo(nSOIds) {
      try {
        var TITLE = MODULE_NAME + '.extractNetsuiteSOInfo';
        var gov = 0;
        var nSOsInfo = [];

        if (!_.isEmpty(nSOIds)) {
          nSOIds.forEach(function (soId) {
            var soInfo = {
              id: '',
              tranid: '',
              location: ''
            };
            var soRecord = record.load({ type: record.Type.SALES_ORDER, id: soId });
            gov += 10;
            // log.debug(TITLE + '.soRecord', soRecord);

            for (var field in soInfo) {
              soInfo[field] = soRecord.getValue({ fieldId: field });
            }
            soInfo.items = [];
            var sublistId = 'item';
            var noItems = soRecord.getLineCount({ sublistId: sublistId });
            if (noItems > 0) {
              for (var i = 0; i < noItems; i++) {
                var soItem = {
                  item: '',
                  item_display: '',
                  quantitycommitted: '',
                  quantitybackordered: ''
                };
                var itemType = soRecord.getSublistValue({ sublistId: sublistId, fieldId: 'itemtype', line: i });
                // Only process the inventory item (no handle for discount item)
                if (itemType === 'InvtPart') {
                  for (var field in soItem) {
                    soItem[field] = soRecord.getSublistValue({ sublistId: sublistId, fieldId: field, line: i });
                  }
                  soInfo.items.push(soItem);
                }
              }
            }

            nSOsInfo.push(soInfo);
          });
        }

        return nSOsInfo;
      } catch (err) {
        log.error(TITLE, err.message);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Transfer Data for Netsuite InventoryTransfer Information
     * @param eInvoicesInfo
     * @param nSOsInfo
     * @returns {Array}
     */
    function transferNetsuiteInventoryTransferInfo(eInvoicesInfo, nSOsInfo) {
      try {
        var TITLE = MODULE_NAME + '.transferNetsuiteInventoryTransferInfo';

        var nInventoryTransferInfo = [];
        var listErplyItems = [];
        var eItemCodes = [];
        var eItemLocations = [];
        var listNetsuiteItems = [];


        // log.debug(TITLE + '.eInvoicesInfo', eInvoicesInfo);
        // log.debug(TITLE + '.nSOsInfo', nSOsInfo);

        /**
         * Filter Items that need to do Inventory Transfer
         */
        // Erply Items
        eInvoicesInfo.forEach(function (invoice) {
          // Only handle the E-commerce Invoice
          if (invoice.warehouseID === 11) {
            if (!_.isEmpty(invoice.items)) {
              invoice.items.forEach(function (item) {
                var eItem = {};
                eItem.itemid = item.code;
                eItem.trandate = helpers.formatNSDate(invoice.date);

                eItemCodes.push(eItem.itemid);
                listErplyItems.push(eItem);
              });
            }
          }
        });
        eItemLocations = helpers.extractNetsuiteItemsLocation(eItemCodes);
        // log.debug(TITLE + '.eItemLocations', eItemLocations);
        // Netsuite Items
        nSOsInfo.forEach(function (so) {
          // Only handle the E-commerce SO
          if (Number(so.location) === 447) {
            if (!_.isEmpty(so.items)) {
              so.items.forEach(function (item) {
                var itemid = item.item_display.split(' ')[0].toString();
                if (!_.isEmpty(itemid)) {
                  // Only handle the item that exists in the Erply Invoice
                  if (~_.find(listErplyItems, function (eItem) {
                    return eItem.itemid === itemid;
                  })) {
                    // Only handle the uncommitted items
                    if (item.quantitycommitted === 0 && item.quantitybackordered === 1) {
                      var nItem = {};
                      nItem.itemid = itemid;
                      nItem.item = item.item;
                      nItem.transferlocation = so.location;
                      listNetsuiteItems.push(nItem);
                    }
                  }
                }
              });
            }
          }
        });
        // log.debug(TITLE + '.listErplyItems', listErplyItems);
        // log.debug(TITLE + '.listNetsuiteItems', listNetsuiteItems);

        listErplyItems.map(function (eItem) {
          var nInventoryTransfer = {
            trandate: eItem.trandate,
            subsidiary: DEFAULT_SUBSIDIARY,
            department: DEFAULT_DEPARTMENT,
            location: '',
            transferlocation: DEFAULT_TRANSFER_LOCATION,
            memo: DEFAULT_MEMO,
            inventory: []
          };

          // collect item source location to transfer
          var itemLocation = _.find(eItemLocations, function (item) {
            return item.itemid === eItem.itemid;
          });
          if (!_.isEmpty(itemLocation)) {
            nInventoryTransfer.location = itemLocation.location;
          }

          // collect item information to transfer
          var inv = {};
          var nItem = _.find(listNetsuiteItems, function (nItem) {
            return nItem.itemid === eItem.itemid;
          });
          if (!_.isEmpty(nItem)) {
            inv.item = nItem.item;
            inv.adjustqtyby = DEFAULT_ADJUST_QUANTITY;

            nInventoryTransfer.inventory.push(inv);
          }

          nInventoryTransferInfo.push(nInventoryTransfer);
        });

        return nInventoryTransferInfo;
      } catch (err) {
        log.error(TITLE, err.message);
      }

    }

    /**
     * Create Netsuite Inventory Transfers
     * @param nInventoryTransferInfo
     * @returns {Array}
     */
    function createNetsuiteInventoryTransfers(nInventoryTransferInfo) {
      try {
        var TITLE = MODULE_NAME + '.createNetsuiteInventoryTransfers';
        var createInventoryTransfersResult = [];

        log.debug(TITLE + '.nInventoryTransferInfo', nInventoryTransferInfo);
        if (!_.isEmpty(nInventoryTransferInfo)) {
          nInventoryTransferInfo.forEach(function (inventoryTransferData) {
            // Create Transfer Order
            var inventoryTransferRecord = record.create({
              type: record.Type.INVENTORY_TRANSFER,
              isDynamic: false
            });

            // We have to set the subsidiary first for setting the location
            inventoryTransferRecord.setValue({ fieldId: 'subsidiary', value: inventoryTransferData.subsidiary });

            Object.keys(inventoryTransferData).forEach(function (field) {
              if (field === 'subsidiary') return;
              if (field === 'trandate') {
                inventoryTransferRecord.setText({ fieldId: field, text: inventoryTransferData[field] });
                return;
              }
              // Set Sublist Items
              if (field === 'inventory') {
                inventoryTransferData[field].forEach(function (item, idx) {
                  inventoryTransferRecord.insertLine({ sublistId: field, line: idx });
                  Object.keys(item).forEach(function (itemField) {
                    inventoryTransferRecord.setSublistValue({
                      sublistId: field,
                      line: idx,
                      fieldId: itemField,
                      value: item[itemField]
                    });
                  });
                });
                return;
              }
              return inventoryTransferRecord.setValue({ fieldId: field, value: inventoryTransferData[field] });
            });

            // log.debug(TITLE + '.inventoryTransferRecord', inventoryTransferRecord);
            // Save the record.
            var inventoryTransferId = inventoryTransferRecord.save({
              // enableSourcing: true,
              ignoreMandatoryFields: true
            });
            createInventoryTransfersResult.push(inventoryTransferId);
          });
        }

        return createInventoryTransfersResult;
      } catch (err) {
        log.error(TITLE, err.message);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    exports = {
      execute: execute
    };
    return exports;
  });