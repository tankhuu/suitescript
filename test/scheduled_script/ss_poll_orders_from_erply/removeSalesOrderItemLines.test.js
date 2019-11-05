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
  var TITLE = 'removeSalesOrderItemLines';
  var netsuiteSORecord = record.load({
    type: record.Type.SALES_ORDER,
    id: '415078',
    isDynamic: true
  });
  var noItemLines = netsuiteSORecord.getLineCount({ sublistId: 'item' });
  //log.debug('sublists', netsuiteSORecord.getSublists());
  log.debug(TITLE + '.cleanUpExistsItemsFromSORecord.lines', noItemLines);
  for (var line = noItemLines - 1; line >= 0; line--) {
    netsuiteSORecord.removeLine({ sublistId: 'item', line: line });
  }
  log.debug(TITLE + '.netsuiteSORecord', netsuiteSORecord);
  //netsuiteSORecord.save();
});
