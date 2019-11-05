require(['N/record', 'N/format'], function (record, format) {

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
  var TITLE = 'setSublistValue';
  function formatNSDate(st) {
    var nwDate = new Date();
    var arrDates = st.split('-');
    nwDate.setFullYear(arrDates[0]);
    nwDate.setMonth(arrDates[1] - 1);
    nwDate.setDate(arrDates[2]);
    log.debug(TITLE, format.format({type: format.Type.DATE, value: nwDate}));
    return format.format({type: format.Type.DATE, value: nwDate});
  }
  var soRecord = record.load({type: record.Type.SALES_ORDER, id: '342715'});
  log.debug(TITLE+'.soRecord', soRecord)
  soRecord.setValue({
    fieldId: 'trandate', value: formatNSDate('2018-06-27'),
    ignoreFieldChange: true
  });
  soRecord.selectNewLine({ sublistId: 'item' });
  log.debug(TITLE+'.soRecord', soRecord)
});
