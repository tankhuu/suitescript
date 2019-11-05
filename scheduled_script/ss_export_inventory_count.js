/**
 * ss_export_inventory_count.js
 * Export Products Inventory Count From Netsuite To AWS S3
 * Title: PRECITA-SS-exportInventoryCount
 * ID: _ss_export_inventory_count
 * SaveSearchTitle:
 * SaveSearchId:
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
define(['N/runtime', 'N/search', 'N/error', 'N/https', 'configurations', 'helpers', 'moment', 'underscore'],
  function (runtime, search, error, https, configurations, helpers, moment, _) {

    var exports = {};
    var governance = 0;
    var MODULE_NAME = 'EXPORT_INVENTORY_COUNT';

    /**
     *  CONSTANTS
     */
    // THE PAGING NUMBER FOR EVERY NETSUITE SEARCH
    var BATCH = 10;

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
        var vendorCodes = [];
        var listUpdateStocks = [];

        /* Extract Data from Netsuite */
        var NETSUITE_CONFIG = configurations.getConfig(env, 'netsuite');
        var savedSearchId = NETSUITE_CONFIG.savedSearchId.availableStocks;
        var itemsSearch = search.load({ id: savedSearchId });

        var itemsPagedData = itemsSearch.runPaged({ pageSize: 1000 });
        itemsPagedData.pageRanges.forEach(function (pageRange) {
          // log.debug(TITLE + 'pageRange', pageRange);
          var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
          itemsPage.data.forEach(function (item) {
            var stockItem = {};
            stockItem.vendor_code = item.getValue({ name: 'vendorname' });
            stockItem.netsuite_id = item.id;
            stockItem.btj_code = item.getValue({ name: 'custitem_btjcode_copy' });
            stockItem.qty = 1;
            stockItem.price = item.getValue({ name: 'baseprice' });
            stockItem.size = item.getText({ name: 'custitem_size_list' });
            stockItem.gold_type = item.getText({ name: 'custitem_gold_type' });

            if (!_.isEmpty(stockItem.price)) {
              stockItems.push(stockItem);
            }
          });
        });
        log.debug(TITLE + '.stockItems', stockItems.length);

        if (!_.isEmpty(stockItems)) {
          stockItems = _.groupBy(stockItems, 'vendor_code');
          if (!_.isEmpty(stockItems)) {
            vendorCodes = _.keys(stockItems);
            vendorCodes.forEach(function (vendorCode) {
              listUpdateStocks.push({
                vendor_code: vendorCode,
                items: stockItems[vendorCode]
              });
            });
          }
        }
        log.debug(TITLE + '.listUpdateStocks', listUpdateStocks.length);

        /* Load Data into AWS S3 */
        var numberUpdatingStocks = 0;
        var totalUpdateStocks = listUpdateStocks.length;
        var fileContent = [];

        while (numberUpdatingStocks < totalUpdateStocks) {
          var runningStocksId = numberUpdatingStocks + BATCH;
          var data = { vendors: [], stockItems: [] };

          // add list vendor Codes in the first batch
          if (numberUpdatingStocks === 0) {
            data.vendors = vendorCodes;
          }

          for (var i = numberUpdatingStocks; i < runningStocksId; i++) {
            if (!_.isEmpty(listUpdateStocks[i])) {
              data.stockItems.push(listUpdateStocks[i]);
            }
            numberUpdatingStocks++;
          }
          fileContent.push(data);
        }

        /* Stream data into AWS S3 */
        log.debug(TITLE + '.uploadToS3.fileContent', fileContent.length);
        // log.debug(TITLE + '.uploadToS3.fileContent', fileContent);
        var result = helpers.sendToS3(env, 'syncInventoryCount', fileContent);
        log.debug(TITLE + '.uploadToS3.result', result);

        /* Notify To Slack */
        // Send Message To Slack
        var slackMessageFields = [];
        if (!_.isEmpty(listUpdateStocks)) {
          slackMessageFields.push({
            title: 'Total Inventory Items Exported',
            value: JSON.stringify(listUpdateStocks.length)
          });
          slackMessageFields.push({
            title: 'Start Time',
            value: startTime.format('LLLL')
          });
          slackMessageFields.push({
            title: 'Run Time',
            value: moment().diff(startTime, 'minutes') + ' minutes'
          });
        }

        if (!_.isEmpty(slackMessageFields))
          helpers.sendMessageToSlack(env, 'normal', TITLE, slackMessageFields);

        log.debug(TITLE + '.governance', governance);
        log.debug(TITLE, '<< END >>');
      } catch (err) {
        var TITLE = MODULE_NAME + '.execute';
        log.error(TITLE, err.message);
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
