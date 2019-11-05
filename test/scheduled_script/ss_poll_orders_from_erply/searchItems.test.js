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
  var TITLE = 'getNetsuiteItems';
  var netsuiteItems = [];
  var salesDocumentSKUs = ["805.0", "59.0"]

  log.debug(TITLE + '.salesDocumentSKUs', salesDocumentSKUs);
  // Define search columns
  var columns = [
    { name: 'custitem_erply_product_id' }
  ];

  // Define search filters
  var formula = "CASE WHEN {custitem_erply_product_id} IN('"
    + salesDocumentSKUs.join("','")
    + "') THEN '1' ELSE '0' END";
  var filters = [
    { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] }
  ];

  // Create the search
  var itemsSearch = search.create({
    type: search.Type.ITEM,
    columns: columns,
    filters: filters
  });
  // log.debug(TITLE + '.salesOrderSearch', salesOrderSearch);

  // Run the search
  itemsSearch.run().each(function (item) {
    netsuiteItems.push({
      id: item.id,
      erplyProductId: item.getValue({ name: 'custitem_erply_product_id' })
    });
    return true;
  })
  log.debug(TITLE, netsuiteItems);

  return netsuiteItems;
});
