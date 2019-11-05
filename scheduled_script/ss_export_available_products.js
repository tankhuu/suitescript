/**
 * ss_export_available_products.js
 * Export Products From Netsuite To AWS S3
 * Title: PRECITA-SS-exportAvailableProducts
 * ID: _ss_export_avai_products
 * SaveSearchTitle: E-commerce - Check - AvailableProducts
 * SaveSearchId: customsearch_ecom_available_products
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
    var MODULE_NAME = 'EXPORT_AVAILABLE_PRODUCTS';

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
        var savedSearchId = NETSUITE_CONFIG.savedSearchId.checkAvailableProducts;
        var itemsSearch = search.load({ id: savedSearchId });

        var itemsPagedData = itemsSearch.runPaged({ pageSize: 1000 });
        itemsPagedData.pageRanges.forEach(function (pageRange) {
          // log.debug(TITLE + 'pageRange', pageRange);
          var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
          itemsPage.data.forEach(function (item) {
            var stockItem = {};

            stockItem.sku = item.getValue({ name: 'vendorname', summary: search.Summary.GROUP })
            stockItem.theme = item.getText({ name: 'custitem_theme_list', summary: search.Summary.GROUP })
            stockItem.category = item.getText({ name: 'custitem_category_list', summary: search.Summary.GROUP })
            stockItem.totalOnHand = item.getValue({ name: 'locationquantityonhand', summary: search.Summary.SUM })
            stockItem.price = item.getValue({ name: 'baseprice', summary: search.Summary.MAX })
            stockItem.onlineExclusive = item.getValue({ name: 'custitem_btj_online_exclusive', summary: search.Summary.GROUP })
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
          var result = helpers.sendToS3(env, 'exportAvailableProducts', fileContent);
          log.debug(TITLE + '.uploadToS3.result', result);
        }

        /* Notify To Slack */
        // Send Message To Slack
        var slackMessageFields = [];
        if (!_.isEmpty(stockItems)) {
          slackMessageFields.push({
            title: 'Total Products Exported',
            value: JSON.stringify(stockItems.length)
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
