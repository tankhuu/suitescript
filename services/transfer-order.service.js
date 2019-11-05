
/**
 * transfer-order.service.js
 * Transfer Order Service
 *
 * @exports find, get, getList, create, update, patch, remove, fulfill, receive
 *
 * @copyright 2018 BTJ
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.0
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/record', 'N/error', 'underscore'],
  function (record, error, _) {
    var MODULE_NAME = 'TRANSFER_ORDER_SERVICE';
    var exports = {};

    /**
     * CONSTANTS
     */
    var DEFAULT_SUBSIDIARY = '2'; // BT Gold Subsidiary
    var DEFAULT_DEPARTMENT = '12'; // Merchandising Department
    var DEFAULT_TRANSFER_LOCATION = '456'; // E-commerce Location
    var DEFAULT_TO_STATUS = 'B'; // Pending Fulfillment Status
    var DEFAULT_MEMO = MODULE_NAME;

    /**
     * LIST OF SUPPORTED REQUESTS
     */
    var SUPPORTED_REQUESTS = {
      FIND_BY_ID: 'findById',
      CREATE_TRANSFER_ORDER: 'createTransferOrder',
      GET_TRANSFER_ORDER: 'getTransferOrder'
    };

    function getSupportedRequests() {
      return SUPPORTED_REQUESTS;
    }

    function find(params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.FIND';

      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function get(id, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.GET_TRANSFER_ORDER';
        log.debug(LOG_TITLE + '.id', id);

        return getTransferOrder(id);
      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function getList(data, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.GET_TRANSFER_ORDERS';

      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function create(data, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.CREATE';

        return createTransferOrder(data);
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function update(id, data, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.UPDATE';

      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function patch(id, data, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.PATCH';

      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function remove(id, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.REMOVE';

      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function fulfill(TOList, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.FULFILL';



      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }

    function receive(TOList, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.RECEIVE';



      } catch (err) {
        log.debug(LOG_TITLE, err.message);
      }
    }


    function getTransferOrder(toId) {
      try {
        var LOG_TITLE = MODULE_NAME + '.getTransferOrder';
        var TO = {};
        var toRecord = record.load({ type: record.Type.TRANSFER_ORDER, id: toId });
        TO.id = toRecord.id;
        TO.status = toRecord.getValue({ fieldId: 'status' });
        TO.trandate = toRecord.getText({ fieldId: 'trandate' });
        TO.items = {};

        var sublistId = 'item';
        var noItems = toRecord.getLineCount({ sublistId: sublistId });
        if (noItems > 0) {
          var item = {};
          var itemId = '';
          for (var l = 0; l < noItems; l++) {
            item = {
              fulfilledDate: '',
              receivedDate: ''
            };
            itemId = toRecord.getSublistValue({ sublistId: sublistId, line: l, fieldId: 'item' });
            if (item) {
              TO.items[itemId] = item;
            }
          }
        }

        sublistId = 'links';
        var noRelatedRecords = toRecord.getLineCount({ sublistId: sublistId });
        if (noRelatedRecords > 0) {
          var rType;
          var rId;
          var relatedRecord;
          for (var r = 0; r < noRelatedRecords; r++) {
            rType = toRecord.getSublistValue({ sublistId: sublistId, line: r, fieldId: 'type' });
            rId = toRecord.getSublistValue({ sublistId: sublistId, line: r, fieldId: 'id' });
            switch (rType) {
              case 'Item Fulfillment': {
                relatedRecord = record.load({ type: record.Type.ITEM_FULFILLMENT, id: rId });
                if (relatedRecord) {
                  TO = fillInItemsDetail('Item Fulfillment', TO, relatedRecord);
                }
                break;
              }
              case 'Item Receipt': {
                relatedRecord = record.load({ type: record.Type.ITEM_RECEIPT, id: rId });
                if (relatedRecord) {
                  TO = fillInItemsDetail('Item Receipt', TO, relatedRecord);
                }
                break;
              }
              default: {
                return;
              }
            }

          }
        }

        // Convert Items Object to List of Items
        TO.items = _.map(TO.items, function (item, itemId) {
          return { id: itemId, fulfilledDate: item.fulfilledDate, receivedDate: item.receivedDate };
        });

        return TO;
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    /**
     * Create Transfer Order
     * @param {*} data 
     * // var TO = {
        //   subsidiary: DEFAULT_SUBSIDIARY,
        //   department: DEFAULT_DEPARTMENT,
        //   status: DEFAULT_TO_STATUS,
        //   memo: DEFAULT_MEMO,
        //   location: '', // from location internalid
        //   trandate: '', // netsuite date '9/3/2019'
        //   transferlocation: '', // to location internalid
        //   items: [
        //     {item: ''} // item internalid
        //   ]
        // };
     */
    function createTransferOrder(data) {
      try {
        var LOG_TITLE = MODULE_NAME + '.createTransferOrder';

        // Add TO default attribute
        data.subsidiary = DEFAULT_SUBSIDIARY;
        data.department = DEFAULT_DEPARTMENT;
        data.status = DEFAULT_TO_STATUS;
        // data.memo = DEFAULT_MEMO;

        // Create Netsuite TransferOrder
        var transferOrderRecord = record.create({
          type: record.Type.TRANSFER_ORDER
        });
        Object.keys(data).forEach(function (field) {
          if (field === 'trandate') {
            transferOrderRecord.setText({ fieldId: field, text: data[field] });
            return;
          }
          // Set Sublist Items
          if (field === 'items') {
            data[field].forEach(function (item, idx) {
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
          return transferOrderRecord.setValue({ fieldId: field, value: data[field] });
        });
        // Save the TO Record.
        var TOId = transferOrderRecord.save({ ignoreMandatoryFields: true });

        return TOId;
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function fulfillTransferOrder(data) {
      try {
        var LOG_TITLE = MODULE_NAME + '.fulfillTransferOrder';
        var itemFulfillmentRecord = record.transform({
          fromType: record.Type.TRANSFER_ORDER,
          fromId: TOId,
          toType: record.Type.ITEM_FULFILLMENT
        });
        itemFulfillmentRecord.setValue({ fieldId: 'shipstatus', value: 'C' });
        itemFulfillmentRecord.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: 0, value: true });
        // Save the IF Record
        fixedItem.nIFId = itemFulfillmentRecord.save({ ignoreMandatoryFields: true });
      } catch (err) {

      }
    }

    function receiveTransferOrder(data) {
      try {
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
      } catch (err) {

      }
    }

    function fillInItemsDetail(type, TO, relatedRecord) {
      try {
        var LOG_TITLE = MODULE_NAME + '.fillInItemsDetail';
        var sublistId = 'item';
        var relatedTrandate = relatedRecord.getText('trandate');
        var noRelatedItems = relatedRecord.getLineCount({ sublistId: sublistId });
        if (noRelatedItems > 0) {
          var itemId = '';
          for (var ri = 0; ri < noRelatedItems; ri++) {
            itemId = relatedRecord.getSublistValue({ sublistId: sublistId, line: ri, fieldId: 'item' });
            if (itemId) {
              if (type === 'Item Fulfillment') {
                TO.items[itemId].fulfilledDate = relatedTrandate;
              }
              if (type === 'Item Receipt') {
                TO.items[itemId].receivedDate = relatedTrandate;
              }
            }
          }
        }
        return TO;
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
      get: get,
      getList: getList,
      create: create,
      update: update,
      patch: patch,
      remove: remove,
      fulfill: fulfill,
      receive: receive
    };

    return exports;
  });