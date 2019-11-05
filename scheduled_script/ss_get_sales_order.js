define(['N/search'],
  function (search) {

    /**
     * Module Description...
     *
     * @exports XXX
     *
     * @copyright 2018 BTJ
     * @author TanKhuu <jackiekhuu.work@gmail.com>
     *
     * @NApiVersion 2.0
     * @NScriptType ScheduledScript
     * @NModuleScope SameAccount
     */
    var exports = {};

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
    function execute(context) {
      var netsuiteSalesOrderStatuses = [];
      var TITLE = 'GET_SALES_ORDER';
      // Define search columns
      var columns = [{ name: 'custbody_erply_sales_doc_id' }, { name: 'status' }];

      // Define search filters
      // var formula = "CASE WHEN {custbody_erply_sales_doc_id} IN('"
      //   + [1045, 4969].join("','")
      //   + "') THEN '1' ELSE '0' END";
      var filters = [
        // {name: 'type', operator: search.Operator.ANYOF, values: ['SalesOrd']},
        // { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] },
        { name: 'mainline', operator: search.Operator.IS, values: ['T'] }
      ];
      // Create the search
      // var salesOrderSearch = search.load({id: 'customsearch_ss_get_sales_order'});
      var salesOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        // columns: columns,
        filters: filters
      });
      log.debug({
        title: TITLE + '.salesOrderSearch: ',
        details: JSON.stringify(salesOrderSearch)
      });

      // Run the search
      salesOrderSearch.run().each(function (result) {
        log.debug({
          title: TITLE + '.netsuiteSalesOrderStatuses: ',
          details: result.getValue({ name: 'custbody_erply_sales_doc_id' })
        });
        return true;
      });
      log.debug({
        title: TITLE + '.netsuiteSalesOrderStatuses: ',
        details: netsuiteSalesOrderStatuses
      });
    }

    exports.execute = execute;
    return exports;
  });
