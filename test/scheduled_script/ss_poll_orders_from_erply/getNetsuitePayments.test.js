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
  var TITLE = 'getNetsuitePayments';
  var salesDocumentIds = [4969];
  var netsuitePayments = [];

  // Define search columns
  var columns = [{ name: 'custbody_erply_payment_id', join: 'applyingTransaction' }];

  // Define search filters
  var formula = "CASE WHEN {custbody_erply_sales_doc_id} in ('"
    + salesDocumentIds.join("','") + "') THEN 1 ELSE 0 END ";
  var filters = [
    { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] },
    { name: 'mainline', operator: search.Operator.IS, values: ['T'] }
  ];

  var salesOrderSearch = search.create({
    type: search.Type.SALES_ORDER,
    columns: columns,
    filters: filters
  });

  salesOrderSearch.run().each(function (result) {
    var erplyPaymentId = result.getValue({ name: 'custbody_erply_payment_id', join: 'applyingTransaction' });
    netsuitePayments.push(erplyPaymentId);
  });

  log.debug(TITLE + '.netsuitePayments', netsuitePayments);

  return netsuitePayments;
});
