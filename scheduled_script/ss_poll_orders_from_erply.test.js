/**
 * ss_poll_orders_from_erply.test.js
 * Test Polling Sales Orders from Erply then updating into Netsuite
 * Title: TEST-PRE-SS-PollSalesOrderFromErply
 * ID: _t_ss_poll_orders_from_erply
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
define(['N/search', 'N/format', 'N/error', 'erply_api', 'helpers', 'underscore'],
  function (search, format, error, erply, helpers, _) {

    var exports = {};
    var governance = 0;
    var MODULE_NAME = 'POLL_ORDERS_FROM_ERPLY';

    /**
     *  CONSTANTS
     */
    // THE PAGING NUMBER FOR EVERY NETSUITE SEARCH
    var BATCH = 100;
    // ERPLY SALES DOCUMENT TYPES
    var ERPLY_SALES_DOCUMENT_TYPES = [];
    // NETSUITE PAYMENT TYPES
    var NETSUITE_PAYMENT_TYPES = {};
    /**
     *  MASTER DATA
     */
    // THE ERPLY LOCATIONS DETAIL IN NETSUITE
    var ERPLY_LOCATIONS_IN_NETSUITE = [];

    BATCH = 100;
    ERPLY_SALES_DOCUMENT_TYPES = ['ORDER', 'PREPAYMENT'];
    NETSUITE_PAYMENT_TYPES = {
      CASH: '1',
      CARD: '7'
    };

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
        ERPLY_LOCATIONS_IN_NETSUITE = helpers.getNetsuiteLocationsForErply();

        /* Connect to Erply API */
        // Get the Environment Erply API Configurations
        var eConfig = erply.getErplyConfig('stage');
        // log.debug(TITLE + '.eConfig', eConfig);
        // Initiation for Erply API
        var EAPI = new erply.erplyAPI(eConfig.url, eConfig.clientCode, eConfig.username, eConfig.password);
        // log.debug(TITLE + '.EAPI', EAPI);

        /* Get Sales Documents from Erply */
        var salesDocuments = [];
        // Define Request Parameters
        var parameters = {
          getRowsForAllInvoices: '1',
          responseMode: 'detail',
          dateFrom: '2018-06-23',
          types: [ERPLY_SALES_DOCUMENT_TYPES.ORDER, ERPLY_SALES_DOCUMENT_TYPES.PREPAYMENT].join(),
          changedSince: 1529821800,
          recordsOnPage: BATCH
        };
        var erplyResponse = EAPI.sendRequest('getSalesDocuments', parameters);
        // log.debug(TITLE + '.EAPI.afterRequest', EAPI);
        // log.debug(TITLE + '.EAPI.erplyResonse', erplyResponse);
        // Calculate Netsuite Request Governance
        governance += erply.getGovernance();
        // Get Sales Documents from Response
        salesDocuments = erplyResponse.records;
        log.debug(TITLE + '.EAPI.salesDocuments', salesDocuments);
        log.debug(TITLE + '.EAPI.salesDocumentsLength', salesDocuments.length);

        var erplyLocation = getLocation(salesDocuments[0].warehouseID.toString());
        log.debug(TITLE + '.erplyLocation', erplyLocation);

        log.debug(TITLE + '.governance', governance);
        log.debug(TITLE, '<< END >>');
      } catch (err) {
        log.error(TITLE, err.message);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    function getLocation(erplyLocationId) {
      var TITLE = 'getLocation';
      log.debug(TITLE, ERPLY_LOCATIONS_IN_NETSUITE);
      return _.find(ERPLY_LOCATIONS_IN_NETSUITE, function (location) {
        return location.id === erplyLocationId;
      });
    }

    exports = {
      execute: execute,
      governance: governance
    };
    return exports;
  });
