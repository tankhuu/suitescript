require(['N/search'], function (search) {

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
  var TITLE = 'lookupFields';
  var nsSOTotal = 0;
  var salesOrderTotalField = search.lookupFields({
    type: search.Type.SALES_ORDER, id: '342715', columns: 'total'
  });
  // if(!_.isEmpty(salesOrderTotalField.total))
    nsSOTotal = parseFloat(salesOrderTotalField.total);
  log.debug(TITLE + '.nsSOTotal', nsSOTotal);
});
