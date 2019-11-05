/**
 * ss_export_store_availability.js
 * Export Stores Availability From Netsuite To AWS S3
 * Title: PRECITA-SS-exportStoresAvailability
 * ID: _ss_export_available_stores
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
define(['N/search', 'N/error', 'N/https', 'helpers', 'configurations', 'moment', 'underscore'],
  function (search, error, https, helpers, configurations, moment, _) {

    var exports = {};
    var governance = 0;
    var MODULE_NAME = 'EXPORT_STORE_AVAILABILITY';

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
        var savedSearchId = NETSUITE_CONFIG.savedSearchId.availableStores;
        var itemsSearch = search.load({ id: savedSearchId });

        var itemsPagedData = itemsSearch.runPaged({ pageSize: 1000 });
        itemsPagedData.pageRanges.forEach(function (pageRange) {
          // log.debug(TITLE + 'pageRange', pageRange);
          var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
          itemsPage.data.forEach(function (item) {
            var stockItem = {};
            stockItem.vendor_code = item.getValue('vendorname');
            stockItem.inventory_location_id = item.getValue('inventorylocation');
            stockItem.inventory_location_name = item.getText('inventorylocation');
            stockItem.size = item.getText({ name: 'custitem_size_list' });
            stockItem.gold_type = item.getText({ name: 'custitem_gold_type' });
            stockItem.netsuite_item_id = item.getValue({ name: 'internalid' });
            stockItem.item_number = item.getValue({ name: 'itemid' });
            stockItem.erply_product_id = item.getValue({ name: 'custitem_erply_product_id' });

            var sizeId = item.getValue({ name: 'custitem_size_list' });
            var goldTypeId = item.getValue({ name: 'custitem_gold_type' });
            stockItem.itemId = [stockItem.vendor_code, sizeId, goldTypeId].join('-');

            stockItems.push(stockItem);
          });
        });
        log.debug(TITLE + '.stockItems', stockItems.length);
        // log.debug(TITLE + '.stockItems', stockItems);

        if (!_.isEmpty(stockItems)) {
          stockItems = _.groupBy(stockItems, 'itemId');
          if (!_.isEmpty(stockItems)) {
            var itemIds = Object.keys(stockItems);
            itemIds.forEach(function (itemId) {
              var itemLocationIds = _.map(_.find(stockItems, function (itemData, stockItemId) {
                return stockItemId === itemId
              }), function (item) {
                return item.inventory_location_id;
              });

              var firstStockItem = stockItems[itemId][0];
              listUpdateStocks.push({
                vendor_code: firstStockItem.vendor_code,
                size: firstStockItem.size,
                gold_type: firstStockItem.gold_type,
                locationIds: _.uniq(itemLocationIds)
              });
            });
          }
        }
        log.debug(TITLE + '.listUpdateStocks', listUpdateStocks.length);
        // log.debug(TITLE + '.listUpdateStocks', listUpdateStocks);

        /* Load Data into AWS S3 */
        var numberUpdatingStocks = 0;
        var totalUpdateStocks = listUpdateStocks.length;
        var fileContent = [];

        while (numberUpdatingStocks < totalUpdateStocks) {
          var runningStocksId = numberUpdatingStocks + BATCH;
          var data = { stockItems: [] };

          for (var i = numberUpdatingStocks; i < runningStocksId; i++) {
            if (!_.isEmpty(listUpdateStocks[i])) {
              data.stockItems.push(listUpdateStocks[i]);
              numberUpdatingStocks++;
            }
          }
          fileContent.push(data);
        }

        /* Stream data into AWS S3 */
        log.debug(TITLE + '.uploadToS3.fileContent', fileContent.length);
        // log.debug(TITLE + '.uploadToS3.fileContent', fileContent);
        var result = helpers.sendToS3(env, 'syncStoresAvailability', fileContent);
        log.debug(TITLE + '.uploadToS3.result', result);

        /* Notify To Slack */
        // Send Message To Slack
        var slackMessageFields = [];
        if (!_.isEmpty(listUpdateStocks)) {
          slackMessageFields.push({
            title: 'Total Store Items Exported',
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
