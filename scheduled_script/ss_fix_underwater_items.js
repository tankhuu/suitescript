/**
 * ss_fix_underwater_items.js
 * Schedule Script Fix Underwater Items
 * Title: PRECITA-SS-fixUnderwaterItems
 * ID: _ss_fix_underwater_items
 * SaveSearchTitle: E-COMMERCE - Underwater Inventory - Collect Items
 * SaveSearchId: _ecom_underwater_items
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
define(['N/error', 'N/record', 'N/search', 'configurations', 'helpers', 'underscore', 'moment'],
  function (error, record, search, configurations, helpers, _, moment) {
    var exports = {};
    var MODULE_NAME = 'FIX_UNDERWATER_ITEMS';

    /**
     * CONSTANTS
     */
    var DEFAULT_SUBSIDIARY = '2'; // BT Gold Subsidiary
    var DEFAULT_DEPARTMENT = '11'; // Merchandising Department
    var DEFAULT_TRANSFER_LOCATION = '447'; // E-commerce Location
    var DEFAULT_TO_STATUS = 'B'; // Pending Fulfillment Status
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

        var listUnderwaterItems = [];
        var uItemInvoices = [];
        var uItemLocations = [];
        var transferOrdersInfo = [];
        var itemsWillBeFixed = []; // List of Items that satisfy the conditions and can be fixed
        var itemsCantBeFixed = []; // List of Items that can't be fixed automatically
        var listFixedItems = [];

        /**
         * Collect List of Underwater Items
         */
        var NETSUITE_CONFIG = configurations.getConfig(ENV, 'netsuite');
        var invoicesSearch = search.load({ id: NETSUITE_CONFIG.savedSearchId.underwaterItems });
        var itemsPagedData = invoicesSearch.runPaged({ pageSize: 1000 });
        itemsPagedData.pageRanges.forEach(function (pageRange) {
          var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
          itemsPage.data.forEach(function (item) {
            var uItem = {
              internalid: '',
              itemid: ''
            };
            for (var field in uItem) {
              uItem[field] = item.getValue({ name: field });
            }
            listUnderwaterItems.push(uItem);
          });
        });
        // log.debug(TITLE + '.listUnderwaterItems', listUnderwaterItems);

        /**
         * Extract TransferOrder Information
         */
        // Extract the Receipt Information of underwater Items
        if (!_.isEmpty(listUnderwaterItems)) {
          uItemInvoices = extractNetsuiteItemInvoices(listUnderwaterItems.map(function (item) { return item.internalid }));
        }
        // Group the invoices by item
        if (!_.isEmpty(uItemInvoices)) {
          uItemInvoices = _.groupBy(uItemInvoices, function (invc) { return invc.item });
        }
        // log.debug(TITLE + '.uItemInvoices', uItemInvoices);

        // Filter List of Items that can and can't be fixed
        if (!_.isEmpty(uItemInvoices)) {
          for (var internalid in uItemInvoices) {
            var item = {
              internalid: internalid
            };
            var noOfInvoices = uItemInvoices[internalid].length;
            // Items that have too many invoices, can't be fixed
            if (noOfInvoices > 1) {
              item.reason = 'Item has ' + noOfInvoices + ' invoices.'
              itemsCantBeFixed.push(item);
            } else {
              // Only fix for item that has 1 invoice and the invoice location is E-commerce
              // log.debug(TITLE + '.item', uItemInvoices[internalid][0])
              if (uItemInvoices[internalid][0].location === DEFAULT_TRANSFER_LOCATION) {
                item.trandate = uItemInvoices[internalid][0].trandate;
                // Get list of itemid for getting the current location of item
                var cItem = _.find(listUnderwaterItems, function (it) { return it.internalid === internalid });
                if (!_.isEmpty(cItem)) {
                  if (cItem.itemid)
                    item.itemid = cItem.itemid;
                }
                itemsWillBeFixed.push(item);
              } else {
                item.reason = 'Invoice is in ' + uItemInvoices[internalid][0].location + ' location';
                itemsCantBeFixed.push(item);
              }
            }
          }
        }
        // log.debug(TITLE + '.transferOrderInfo', transferOrdersInfo);
        // log.debug(TITLE + '.itemsWillBeFixed', itemsWillBeFixed);
        log.debug(TITLE + '.itemsCantBeFixed', itemsCantBeFixed);

        // Extract current Location of items
        uItemLocations = helpers.extractNetsuiteItemsLocation(itemsWillBeFixed.map(function (it) { return it.itemid }));
        // log.debug(TITLE + '.uItemLocations', uItemLocations);
        if (!_.isEmpty(uItemLocations) && !_.isEmpty(itemsWillBeFixed)) {
          transferOrdersInfo = transferTransferOrdersInfo(uItemLocations, itemsWillBeFixed);
        }
        log.debug(TITLE + '.transferOrdersInfo', transferOrdersInfo);

        /**
         * Fix Underwater Items in Netsuite
         */
        listFixedItems = fixUnderwaterItems(transferOrdersInfo);
        log.debug(TITLE + '.listFixedItems', listFixedItems);


        /* Notify To Slack */
        // Send Message To Slack
        slackMessageFields = [];
        if (!_.isEmpty(listUnderwaterItems)) {
          slackMessageFields.push({
            title: 'Total Underwater Items',
            value: JSON.stringify(listUnderwaterItems.length)
          });
          slackMessageFields.push({
            title: 'List Underwater Items',
            value: JSON.stringify(listUnderwaterItems)
          });
          // !_.isEmpty(itemsWillBeFixed) && slackMessageFields.push({
          //   title: 'Items Will Be Fixed',
          //   value: JSON.stringify(itemsWillBeFixed)
          // });
          !_.isEmpty(listFixedItems) && slackMessageFields.push({
            title: 'Items Fixed',
            value: JSON.stringify(listFixedItems)
          });
          !_.isEmpty(itemsCantBeFixed) && slackMessageFields.push({
            title: 'Items Cant Be Fixed',
            value: JSON.stringify(itemsCantBeFixed)
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
     * Extract netsuite Item Invoices
     * @param {*} itemInternalIds 
     */
    function extractNetsuiteItemInvoices(itemInternalIds) {
      try {
        var TITLE = MODULE_NAME + '.';
        var uItemInvoices = [];
        // Search related Invoices of Items
        var resultColumns = [
          { name: 'trandate', summary: search.Summary.GROUP },
          { name: 'tranid', summary: search.Summary.GROUP },
          { name: 'location', summary: search.Summary.GROUP },
          { name: 'item', summary: search.Summary.GROUP }
        ];
        var searchFilter = [
          { name: 'item', operator: search.Operator.ANYOF, values: itemInternalIds },
          { name: 'trandate', operator: search.Operator.ONORAFTER, values: 'startofthisyear' }
        ];
        // log.debug(TITLE + '.searchFilter', searchFilter);

        var invoicesSearch = search.create({
          type: search.Type.INVOICE,
          columns: resultColumns,
          filters: searchFilter
        });
        invoicesSearch.run().each(function (invoice) {
          var invc = {
            trandate: '',
            tranid: '',
            location: '',
            item: ''
          };
          for (var field in invc) {
            invc[field] = invoice.getValue({ name: field, summary: search.Summary.GROUP });
          }

          uItemInvoices.push(invc);
          return true;
        });

        return uItemInvoices;
      } catch (err) {
        log.error(TITLE + '.Error', err.message);
      }
    }

    /**
     * Transfer TransferOrders Information
     * @param {*} uItemLocations 
     * @param {*} itemsWillBeFixed 
     */
    function transferTransferOrdersInfo(uItemLocations, itemsWillBeFixed) {
      try {
        var TITLE = MODULE_NAME + '.transferTransferOrdersInfo';
        var transferOrdersInfo = [];
        uItemLocations.forEach(function (uItemLoc) {
          if (uItemLoc.location !== DEFAULT_TRANSFER_LOCATION) {
            var toItem = _.find(itemsWillBeFixed, function (fItem) {
              return fItem.itemid === uItemLoc.itemid;
            });
            if (!_.isEmpty(toItem)) {
              /**
               * Transfer TransferOrder Information
               */
              var toData = {
                trandate: toItem.trandate,
                subsidiary: DEFAULT_SUBSIDIARY,
                location: uItemLoc.location,
                transferlocation: DEFAULT_TRANSFER_LOCATION,
                status: DEFAULT_TO_STATUS,
                department: DEFAULT_DEPARTMENT,
                items: [{ item: toItem.internalid }]
              };
              // Add data into list of TO that will be created for fixing underwater Items
              transferOrdersInfo.push(toData);
            }
          }
        });

        return transferOrdersInfo;
      } catch (err) {
        log.error(TITLE + '.Error', err.message);
      }
    }

    /**
     * Fix Underwater Items
     * @param {*} transferOrdersInfo 
     */
    function fixUnderwaterItems(transferOrdersInfo) {
      try {
        var TITLE = MODULE_NAME + '.fixUnderwaterItems';
        var fixedItems = [];

        if (!_.isEmpty(transferOrdersInfo)) {
          transferOrdersInfo.forEach(function (TOData) {
            var fixedItem = {
              nTOId: '',
              nIFId: '',
              nIRId: ''
            };

            // Create Netsuite TransferOrder
            var transferOrderRecord = record.create({
              type: record.Type.TRANSFER_ORDER
            });

            try {
              Object.keys(TOData).forEach(function (field) {
                if (field === 'trandate') {
                  transferOrderRecord.setText({ fieldId: field, text: TOData[field] });
                  return;
                }
                // Set Sublist Items
                if (field === 'items') {
                  TOData[field].forEach(function (item, idx) {
                    transferOrderRecord.insertLine({ sublistId: 'item', line: idx });
                    Object.keys(item).forEach(function (itemField) {
                      transferOrderRecord.setSublistValue({
                        sublistId: 'item',
                        line: idx,
                        fieldId: itemField,
                        value: item[itemField]
                      });
                    });
                  });
                  return;
                }
                return transferOrderRecord.setValue({ fieldId: field, value: TOData[field] });
              });
            } catch (err) {
              log.debug('Set value failed', err.message)
            }
            // Save the TO Record.
            try {
              fixedItem.nTOId = transferOrderRecord.save({ ignoreMandatoryFields: true });
            } catch (err) {
              log.debug('Save record failed, gonna delete TO and return', err.message)
              return;
            }

            // Transform TO to ItemFulfillment
            if (fixedItem.nTOId) {
              var itemFulfillmentRecord = record.transform({
                fromType: record.Type.TRANSFER_ORDER,
                fromId: fixedItem.nTOId,
                toType: record.Type.ITEM_FULFILLMENT
              });
              itemFulfillmentRecord.setValue({ fieldId: 'shipstatus', value: 'C' });
              itemFulfillmentRecord.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: 0, value: true });
              // Save the IF Record
              fixedItem.nIFId = itemFulfillmentRecord.save({ ignoreMandatoryFields: true });

              // Transform TO to ItemReceipt
              if (fixedItem.nIFId) {
                var itemReceiptRecord = record.transform({
                  fromType: record.Type.TRANSFER_ORDER,
                  fromId: fixedItem.nTOId,
                  toType: record.Type.ITEM_RECEIPT
                });
                itemReceiptRecord.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: 0, value: true });
                // Save the IR Record
                fixedItem.nIRId = itemReceiptRecord.save({ ignoreMandatoryFields: true });

              }
            }

            fixedItems.push(fixedItem);
          });
        }

        return fixedItems;
      } catch (err) {
        log.error(TITLE, err.message);
        var slackMessageFields = [];
        slackMessageFields.push({ title: TITLE, value: err.message });
        !_.isEmpty(slackMessageFields) && helpers.sendMessageToSlack(ENV, 'danger', TITLE, slackMessageFields);
      }
    }

    exports = {
      execute: execute
    };
    return exports;
  });