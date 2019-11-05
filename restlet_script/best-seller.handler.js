/**
 * best-seller.handler.js
 * Get list of best seller vendor code
 *
 * @exports get
 *
 * @copyright 2019 BTJ
 * @author LanBui <lanbn@btj.vn>
 *
 * @NApiVersion 2.0
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/search', 'configurations', 'underscore'], function (search, configurations, _) {
    var MODULE_NAME = 'BEST_SELLER_HANDLER';
    /**
     *  CONSTANTS
     */
        // THE PAGING NUMBER FOR EVERY NETSUITE SEARCH
    var BATCH = 1000;

    return {
        get: function () {
            var TITLE = MODULE_NAME + '.get()';
            //log.debug(TITLE, '<< START >>');
            /* Extract Data from Netsuite */
            var NETSUITE_CONFIG = configurations.getConfig('production', 'netsuite');
            var savedSearchId = NETSUITE_CONFIG.savedSearchId.exportBestSeller;
            var bestSellerSearch = search.load({ id: savedSearchId });
            var itemsPagedData = bestSellerSearch.runPaged({pageSize: BATCH});
            var vendorList = [];
            itemsPagedData.pageRanges.forEach(function (pageRange) {
                var itemsPage = itemsPagedData.fetch({index: pageRange.index});
                itemsPage.data.forEach(function (item) {
                    var vendorCode = item.getValue({name: 'custrecord_btj_best_seller_vendor_code'});
                    if (!_.isEmpty(vendorCode)) {
                        vendorList.push(vendorCode)
                    }
                });
            });
            //log.debug(TITLE + ' Result', vendorList);

            return vendorList;
        }
    }
});
