require(['N/record'], function (record) {

  /**
   * Module Description...
   *
   * @exports XXX
   *
   * @copyright 2018 ${organization}
   * @author ${author} <${email}>
   *
   * @NApiVersion 2.0
   */
  var TITLE = 'DEBUGGER';

  var toId = 4074463;
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
    var fulfilledDate = '';
    var receivedDate = '';
    var noRelatedItems = 0;
    for (var r = 0; r < noRelatedRecords; r++) {
      rType = toRecord.getSublistValue({ sublistId: sublistId, line: r, fieldId: 'type' });
      rId = toRecord.getSublistValue({ sublistId: sublistId, line: r, fieldId: 'id' });
      switch (rType) {
        case 'Item Fulfillment': {
          relatedRecord = record.load({ type: record.Type.ITEM_FULFILLMENT, id: rId });
          if (relatedRecord) {
            fulfilledDate = relatedRecord.getValue('trandate');
            TO = fillInItemsDetail('Item Fulfillment', TO, relatedRecord, fulfilledDate);
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

  TO.items = _.map(TO.items, function(item, itemId){return {id: itemId, fulfilledDate: item.fulfilledDate, receivedDate: item.receivedDate}})
  
  log.debug('TO: ', TO);

  function fillInItemsDetail(type, TO, relatedRecord) {
    try {
      var sublistId = 'item';
      var relatedTrandate = relatedRecord.getText('trandate');
      noRelatedItems = relatedRecord.getLineCount({ sublistId: sublistId });
      if (noRelatedItems > 0) {
        var itemId = '';
        for (var ri = 0; ri < noRelatedItems; ri++) {
          itemId = relatedRecord.getSublistValue({sublistId: sublistId, line: ri, fieldId: 'item'});
          if(itemId) {
            if(type === 'Item Fulfillment') {
              TO.items[itemId].fulfilledDate = relatedTrandate;
            }
            if(type === 'Item Receipt') {
              TO.items[itemId].receivedDate = relatedTrandate;
            }
          }
        }
      }
      return TO;
    } catch (err) {

    }
  }

  log.debug(TITLE + '.TO', TO);
});
