/**
 * ss_export_inventory_count.js
 * Export Products From Netsuite To AWS S3
 * Title: PRECITA-SS-exportProducts
 * ID: _ss_export_products
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
define(['N/search', 'N/error', 'configurations', 'helpers', 'moment', 'underscore'],
  function (search, error, configurations, helpers, moment, _) {

    var exports = {};
    var governance = 0;
    var MODULE_NAME = 'EXPORT_PRODUCTS';

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
        var FIELDS = {
          value: [
            'itemid',
            'custitem_btjcode_copy',
            'custitem_btj_mtk_name',
            'vendorname',
            'baseprice',
            'custitem_gold_weight',
            'custitem_stone_weight',
            'custitem_plating_colour',
            'custitem_detail_of_stone',
            'custitem_total_weight',
            'custitem_diamond_qty',
            'custitem_diamond_weight',
            'custitem_diamond_shape',
            'custitem_color_stone_quantity_1',
            'custitem_color_stone_shape_1',
            'custitem_color_stone_weight_1',
            'custitem_color_stone_quantity_2',
            'custitem_color_stone_shape_2',
            'custitem_color_stone_weight_2',
            'custitem_color_stone_qty_3',
            'custitem_color_stone_shape_3',
            'custitem_color_stone_weight_3',
            'custitem_location_vendor',
            'custitem_btj_width',
            'custitem_btj_height',
            'custitem_btj_length',
            'custitem_btj_width_of_pattern',
            'custitem_btj_length_of_pattern',
            'custitem_btj_main_stone',
            'custitem_btj_main_stone_size',
            'custitem_btj_main_stone_qty',
            'custitem_btj_new_measure_applied',
            'custitem_btj_total_stone_qty',
          ],
          text: [
            'custitem_product_group_list',
            'custitem_theme_list',
            'custitem_category_list',
            'custitem_category_series_list',
            'custitem_metal_colour_list',
            'custitem_size_list',
            'custitem_stone_group_list',
            'custitem_gold_type',
            'custitem_diamond_clarity',
            'custitem_color_stone_name_1',
            'custitem_color_stone_name_2',
            'custitem_color_stone_name_3',
            'custitem_btj_occasion',
            'custitem_btj_gender',
            'custitem_btj_style',
            'custitem_btj_no_of_stones',
          ]
        };

        /* Extract Data from Netsuite */
        var NETSUITE_CONFIG = configurations.getConfig(env, 'netsuite');
        var savedSearchId = NETSUITE_CONFIG.savedSearchId.availableProducts;
        var itemsSearch = search.load({ id: savedSearchId });

        var itemsPagedData = itemsSearch.runPaged({ pageSize: 1000 });
        itemsPagedData.pageRanges.forEach(function (pageRange) {
          // log.debug(TITLE + 'pageRange', pageRange);
          var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
          itemsPage.data.forEach(function (item) {
            var stockItem = { internalid: item.id };

            FIELDS.value.forEach(function (value) { return stockItem[value] = item.getValue({ name: value }) });
            FIELDS.text.forEach(function (text) { return stockItem[text] = item.getText({ name: text }) });

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
          var result = helpers.sendToS3(env, 'syncProducts', fileContent);
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
