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
  var TITLE = 'setNewLineValue';

  var netsuiteSORecord = record.create({
    type: record.Type.SALES_ORDER,
    isDynamic: true,
    defaultValues: {
      entity: 5541
    }
  });
  netsuiteSORecord.selectNewLine({ sublistId: 'item' });
  netsuiteSORecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 1270 });
  // log.debug(TITLE + '.sublist.item', itemId);
  // soRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.amount });
  // log.debug(TITLE + '.sublist.quantity', item.amount);
  // soRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'grossamt', value: item.rowTotal });
  // log.debug(TITLE + '.sublist.grossamt', item.rowTotal);
  netsuiteSORecord.commitLine({ sublistId: 'item' });
  log.debug(TITLE+'.netsuiteSORecord', netsuiteSORecord)
});
