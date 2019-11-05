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
  var TITLE = 'getSublistValue';
  var soRecord = record.load({type: record.Type.SALES_ORDER, id: '342715'});
  var line1TaxAmt = soRecord.getSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: 0 });

  log.debug(TITLE + '.soRecord', soRecord);
  log.debug(TITLE + '.line1TaxAmt', line1TaxAmt);
});
