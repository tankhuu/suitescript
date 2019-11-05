/**
 * ss_export_inventory_quantity.js
 * Export Inventory Quantity From Netsuite To AWS S3
 * Title: BI-SS-exportInventoryQuantity
 * ID: _ss_export_inventory_qty
 * SaveSearchTitle: BI-ExtractInventoryQuantity
 * SaveSearchId: customsearch_bi_extract_inventory_qty
 *
 * @exports execute
 *
 * @copyright 2018 BTJ
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/search', 'N/error', 'configurations', 'helpers', 'moment', 'underscore'],
  function (search, error, configurations, helpers, moment, _) {

    var exports = {};
    var governance = 0;
    var MODULE_NAME = 'EXPORT_INVENTORY_QUANTITY';

    /**
     *  CONSTANTS
     */
    // THE PAGING NUMBER FOR EVERY NETSUITE SEARCH
    var BATCH = 1000;

    /**
     * MASTER DATA
     */

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
      var TITLE = MODULE_NAME + '.execute';
      try {
        log.debug(TITLE, '<< START >>');
        var startTime = moment();
        var env = helpers.getEnvironment() || 'stage';
        log.debug(TITLE + '.environment', env);

        /* Variables */
        var stockItems = [];

        /* Extract Data from Netsuite */
        var NETSUITE_CONFIG = configurations.getConfig(env, 'netsuite');
        var savedSearchId = NETSUITE_CONFIG.savedSearchId.inventoryStocks;
        var itemsSearch = search.load({ id: savedSearchId });

        var itemsPagedData = itemsSearch.runPaged({ pageSize: 1000 });
        itemsPagedData.pageRanges.forEach(function (pageRange) {
          // log.debug(TITLE + 'pageRange', pageRange);
          var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
          itemsPage.data.forEach(function (item) {
            var stockItem = {
              sku: item.getValue({ name: 'vendorname', summary: 'GROUP' }),
              qtyInTransit: item.getValue({ name: 'locationquantityintransit', summary: 'SUM' }),
              qtyOnHand: item.getValue({ name: 'locationquantityonhand', summary: 'SUM' }),
            };
            stockItems.push(stockItem);
          });
          return;
        });
        log.debug(TITLE + '.stockItems', stockItems.length);

        /* Stream data into AWS S3 */
        var fileContent = stockItems;
        log.debug(TITLE + '.uploadToS3.fileContent', fileContent.length);
        // log.debug(TITLE + '.uploadToS3.fileContent', fileContent);
        if (!_.isEmpty(fileContent)) {
          var result = helpers.sendToS3(env, 'exportInventoryQuantity', fileContent);
          log.debug(TITLE + '.uploadToS3.result', result);
        }

        log.debug(TITLE + '.governance', governance);
        log.debug(TITLE, '<< END >>');
      } catch (err) {
        var TITLE = MODULE_NAME + '.execute';
        log.error(TITLE, err);
        var slackMessageFields = [];
        slackMessageFields.push({ title: TITLE, value: err.message });
        !_.isEmpty(slackMessageFields) && helpers.sendMessageToSlack(env, 'danger', TITLE, slackMessageFields);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    exports = {
      execute: execute,
      governance: governance
    };
    return exports;
  });
