/**
 * ss_poll_orders_from_erply.js
 * Polling Sales Orders from Erply then updating into Netsuite
 * Title: PRE-SS-PollSalesOrderFromErply
 * ID: _ss_poll_orders_from_erply
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
define(['N/search', 'N/record', 'N/error', 'erply_api', 'helpers', 'underscore'],
  function (search, record, error, erply, helpers, _) {

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
    // NETSUITE CUSTOMER IDS OF ERPLY SALES DOCUMENTS
    var NETSUITE_CUSTOMERS = [];
    // NETSUITE SALES REPS OF ERPLY EMPLOYEE IDS
    var NETSUITE_SALES_REPS = [];
    // NETSUITE ITEM IDS OF ERPLY SALES DOCUMENTS ROWS
    var NETSUITE_ITEMS = [];

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
        // Get Data for ERPLY_LOCATIONS_IN_NETSUITE
        ERPLY_LOCATIONS_IN_NETSUITE = helpers.getNetsuiteLocationsForErply();
        log.debug(TITLE + '.ERPLY_LOCATIONS_IN_NETSUITE', ERPLY_LOCATIONS_IN_NETSUITE);

        /* Connect to Erply API */
        // Get the Environment Erply API Configurations
        var eConfig = erply.getErplyConfig('stage');
        // log.debug(TITLE + '.eConfig: ', eConfig);
        // Initiation for Erply API
        var EAPI = new erply.erplyAPI(eConfig.url, eConfig.clientCode, eConfig.username, eConfig.password);
        // log.debug(TITLE + '.EAPI: ', JSON.stringify(EAPI));

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
        // log.debug(TITLE + '.EAPI.afterRequest: ', JSON.stringify(EAPI));
        // log.debug(TITLE + '.EAPI.erplyResonse: ', JSON.stringify(erplyResponse));
        // Calculate Netsuite Request Governance
        governance += erply.getGovernance();
        // Get Sales Documents from Response
        salesDocuments = erplyResponse.records;
        log.debug(TITLE + '.EAPI.salesDocuments: ', salesDocuments);
        // log.debug(TITLE + '.EAPI.salesDocumentsLength: ', salesDocuments.length);

        /* Filter Sales Orders those need to be updated */
        if (!_.isEmpty(salesDocuments)) {
          var salesDocumentClientIds = [];
          var salesDocumentEmployeeIds = [];
          var salesDocumentIds = [];
          var salesDocumentSKUs = [];

          // List of salesDocumentIds for Getting Netsuite SalesOrder Statuses
          _.each(salesDocuments, function (document) {
            // Collect data for salesDocumentIds
            salesDocumentIds.push(document.id);
            // Collect data for salesDocumentClientIds
            salesDocumentClientIds.push(document.clientID + '.0');
            // Collect data for salesDocumentEmployeeIds
            salesDocumentEmployeeIds.push(document.employeeID.toString());
            // Collect data for salesDocumentItemIds
            if (!_.isEmpty(document.rows)) {
              _.each(document.rows, function (item) {
                salesDocumentSKUs.push(item.productID + '.0');
              });
            }
          });
          log.debug(TITLE + '.salesDocumentIds', salesDocumentIds);
          log.debug(TITLE + '.salesDocumentClientIds', salesDocumentClientIds);
          log.debug(TITLE + '.salesDocumentEmployeeIds', salesDocumentEmployeeIds);
          log.debug(TITLE + '.salesDocumentSKUs', salesDocumentSKUs);

          /* Get Master Data */
          // Get Data for NETSUITE_CUSTOMER_IDS
          NETSUITE_CUSTOMERS = helpers.getNetsuiteCustomers(salesDocumentClientIds);
          log.debug(TITLE + '.NETSUITE_CUSTOMERS', NETSUITE_CUSTOMERS);
          // Get Data for NETSUITE_SALES_REPS
          NETSUITE_SALES_REPS = helpers.getNetsuiteSaleReps(salesDocumentEmployeeIds);
          log.debug(TITLE + '.NETSUITE_SALES_REPS', NETSUITE_SALES_REPS);
          // Get Data for NETSUITE ITEM IDS
          NETSUITE_ITEMS = helpers.getNetsuiteItems(salesDocumentSKUs);
          log.debug(TITLE + '.NETSUITE_ITEMS', NETSUITE_ITEMS);

          // Get netsuite sales order statuses from erply sales document ids
          var netsuiteSOStatuses = helpers.getNetsuiteSOStatuses(salesDocumentIds) || [];
          log.debug(TITLE + '.netsuiteSOStatuses', netsuiteSOStatuses);
          var netsuiteSOStatus = {};
          _.each(salesDocuments, function (salesDocument) {
            netsuiteSOStatus = _.find(netsuiteSOStatuses, function (soStatus) {
              return soStatus.erplySalesDocumentId == salesDocument.id;
            });

            // Skip the Sales Document which is exists SO and status is not pendingFulfillment
            if (!_.isEmpty(netsuiteSOStatus) && netsuiteSOStatus.status !== 'pendingFulfillment') {
              log.debug(TITLE + '.ignored.salesDocument', salesDocument);
              return;
            }

            // Skip the Sales Document which has no data
            if (_.isEmpty(salesDocument.rows)) {
              log.debug(TITLE + '.ignored.salesDocument', salesDocument);
              return;
            }

            /* Upsert Sales Orders on Netsuite */
            log.debug(TITLE + '.upsertNetsuiteSalesOrder.salesDocument', salesDocument);
            log.debug(TITLE + '.upsertNetsuiteSalesOrder.netsuiteSOStatus', netsuiteSOStatus);
            upsertNetsuiteSalesOrder(EAPI, salesDocument, netsuiteSOStatus);
          });
        }

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

    /**
     * Insert Or Update Netsuite Sales Order from Erply
     * @param EAPI
     * @param salesDocument
     * @param netsuiteSOStatus
     * @return {string}
     */
    function upsertNetsuiteSalesOrder(EAPI, salesDocument, netsuiteSOStatus) {
      var TITLE = 'upsertNetsuiteSalesOrder';
      var governance = 0;
      var netsuiteSOId = '';
      // log.debug(TITLE + '.EAPI', EAPI);
      // log.debug(TITLE + '.salesDocument', salesDocument);
      // log.debug(TITLE + '.netsuiteSOStatus', netsuiteSOStatus);
      try {
        /* Only handle the salesDocument type in ERPLY_SALES_DOCUMENT_TYPES */
        if (ERPLY_SALES_DOCUMENT_TYPES.indexOf(salesDocument.type) === -1) {
          log.debug(TITLE, 'Not handle salesDocument Type: ' + salesDocument.type);
          return netsuiteSOId;
        }

        /* Handle Erply Sales Document Types: ORDER & PREPAYMENT */
        // Get customerId for create Customer Deposit
        var customerId = getNetsuiteCustomerId(salesDocument.clientID);
        log.debug(TITLE + '.customerId', customerId);

        // Cleanup Items on Exists Netsuite SO
        // Or Create new Netsuite SO Record
        var netsuiteSORecord = null;
        // Handling Transaction records: 10 usage units
        governance += 10;
        // Remove Items in SO Record if It was exists
        if (!_.isEmpty(netsuiteSOStatus)) {
          var netsuiteSORecord = record.load({
            type: record.Type.SALES_ORDER,
            id: netsuiteSOStatus.id,
            isDynamic: true
          });
          var noItemLines = netsuiteSORecord.getLineCount({ sublistId: 'item' });
          // log.debug(TITLE + '.cleanUpExistsItemsFromSORecord.lines', noItemLines);
          for (var line = noItemLines - 1; line >= 0; line--) {
            netsuiteSORecord.removeLine({ sublistId: 'item', line: line });
          }
        } else {
          netsuiteSORecord = record.create({
            type: record.Type.SALES_ORDER,
            isDynamic: true,
            defaultValues: {
              entity: customerId
            }
          });
          log.debug(TITLE + '.createNewSORecord', netsuiteSORecord);
        }

        /* Enrich Netsuite Sales Order Data with Erply Fields */
        // Get Erply Location Information
        var erplyLocation = getErplyLocationInformation(salesDocument.warehouseID);

        // Add Erply Sales Rep
        var erplyEmployeeId = salesDocument.employeeID.toString();
        var salesRep = getSalesRep(erplyEmployeeId);
        if (!_.isEmpty(salesRep)) {
          netsuiteSORecord.setValue({ fieldId: 'salesrep', value: salesRep });
          log.debug(TITLE + '.salesRep.added', salesRep);
        }

        // Add Cashinvoice information
        //This is not in AAA
        var cashInvoiceBaseDocument = _.find(salesDocument.baseDocuments, function (baseDocument) {
          return baseDocument.type === ERPLY_SALES_DOCUMENT_TYPES.CASHINVOICE;
        });
        if (!_.isEmpty(cashInvoiceBaseDocument)) {
          netsuiteSORecord.setValue('custbody_erply_cashinvoice_id', cashInvoiceBaseDocument.id);
          netsuiteSORecord.setValue('custbody_erply_cashinvoice_num', cashInvoiceBaseDocument.number);
        }

        // Erply Sales Document Id
        log.debug(TITLE + '.netsuiteSORecord.custbody_erply_sales_doc_id', salesDocument.id.toString());
        netsuiteSORecord.setValue({ fieldId: 'custbody_erply_sales_doc_id', value: salesDocument.id.toString() });
        // Erply Sales Document Number
        log.debug(TITLE + '.netsuiteSORecord.custbody_erply_order_number', salesDocument.number);
        netsuiteSORecord.setValue({ fieldId: 'custbody_erply_order_number', value: salesDocument.number });

        // Set trandate field in Netsuite Sales Order
        netsuiteSORecord.setText({
          fieldId: 'trandate', text: helpers.formatNSDate(salesDocument.date),
          ignoreFieldChange: true
        });

        // Set notes from Erply POS in Netsuite Sales Order
        if (!_.isEmpty(salesDocument.internalNotes)) {
          log.debug(TITLE + '.netsuiteSORecord.custbody_pos_notes', salesDocument.internalNotes);
          netsuiteSORecord.setValue({ fieldId: 'custbody_pos_notes', value: salesDocument.internalNotes });
        }

        // Add memo for Netsuite Sales Order
        if (!_.isEmpty(salesDocument.notes)) {
          log.debug(TITLE + '.netsuiteSORecord.memo', salesDocument.notes);
          netsuiteSORecord.setValue({ fieldId: 'memo', value: salesDocument.notes });
        }

        // Add Erply Location Id
        if (!_.isEmpty(salesDocument.warehouseID)) {
          log.debug(TITLE + '.netsuiteSORecord.location', erplyLocation.location);
          netsuiteSORecord.setText({ fieldId: 'location', text: erplyLocation.location });
        }

        /* Add Items into Netsuite Sales Order */
        // Get List of Item SKUs
        var items = salesDocument.rows;
        var hasItem = false;

        _.each(items, function (item) {
          var erplyProductId = item.productID + '.0';
          var itemId = getItemId(erplyProductId);
          if (!_.isEmpty(itemId)) {
            hasItem = true;
            log.debug(TITLE + '.createItemLineInSO');
            netsuiteSORecord.selectNewLine({ sublistId: 'item' });
            netsuiteSORecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
            log.debug(TITLE + '.sublist.item', itemId);
            netsuiteSORecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.amount });
            log.debug(TITLE + '.sublist.quantity', item.amount);
            netsuiteSORecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'grossamt', value: item.rowTotal });
            log.debug(TITLE + '.sublist.grossamt', item.rowTotal);
            netsuiteSORecord.commitLine({ sublistId: 'item' });
          }
        });

        if (hasItem) {
          netsuiteSOId = netsuiteSORecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
          log.debug(TITLE + '.netsuiteSOId.save', netsuiteSOId);

          // Check if Neto total match with Netsuite Total
          var nsSOTotal = 0;
          var salesOrderTotalField = search.lookupFields({
            type: search.Type.SALES_ORDER, id: netsuiteSOId, columns: 'total'
          });
          if (!_.isEmpty(salesOrderTotalField.total)) {
            nsSOTotal = parseFloat(salesOrderTotalField.total);
            log.debug(TITLE + '.nsSOTotal', nsSOTotal);
          }
          var erplySOTotal = parseFloat(salesDocument.total);
          log.debug(TITLE + '.erplySOTotal', erplySOTotal);

          if (nsSOTotal !== erplySOTotal) {
            // Create Tax Line
            var diff = erplySOTotal - nsSOTotal;
            var soRecord = record.load({ type: search.Type.SALES_ORDER, id: netsuiteSOId });
            var line1TaxAmt = soRecord.getSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: 0 });
            var newTaxAmt = (parseFloat(line1TaxAmt) + diff);
            soRecord.setSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: 0, value: newTaxAmt });
            // Save Tax Line
            netsuiteSORecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

            // Create Customer Deposit if Exists
            var erplyPayments = getErplyPayments(EAPI, salesDocument);
            var netsuitePayments = getNetsuitePayments([salesDocument.id]);
            _.each(erplyPayments, function (payment) {
              // Return if Payment already exists in Nesuite Sales Order
              if (netsuitePayments.indexOf(payment.paymentID) !== -1) {
                return;
              }
              createCustomerDeposit(ERPLY_LOCATIONS_IN_NETSUITE, erplyLocation, payment, netsuiteSOId, customerId, salesDocument);
              log.debug(TITLE + '.createCustomerDeposit', 'gonna create!');
            });
          }
        } else {
          log.debug(TITLE, 'No match item found!');
        }

        return netsuiteSOId;
      } catch (err) {
        log.error(TITLE, err.message);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Get Erply Location Information from Netsuite
     * @param erplyLocationId
     * @return {*}
     */
    function getErplyLocationInformation(erplyLocationId) {
      return _.find(ERPLY_LOCATIONS_IN_NETSUITE, function (location) {
        return location.id = erplyLocationId;
      });
    }

    /**
     * Get Erply Payments Information from Erply
     * @param EAPI
     * @param salesDocument
     * @return {Array}
     */
    function getErplyPayments(EAPI, salesDocument) {
      var erplyPayments = [];
      var parameters = {
        getRowsForAllInvoices: '1',
        responseMode: 'detail',
        documentID: salesDocument.id,
      };

      var response = EAPI.sendRequest('getPayments', parameters);
      if (!_.isEmpty(response.records))
        erplyPayments = response.records;

      return erplyPayments;
    }

    /**
     * Get Netsuite Payments from Netsuite
     * @param salesDocumentIds
     * @return {Array}
     */
    function getNetsuitePayments(salesDocumentIds) {
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

      return netsuitePayments;
    }

    /**
     * Create Customer Deposit
     * @param NETSUITE_ERPLY_LOCATIONS
     * @param payment
     * @param netsuiteSOId
     * @param customerId
     * @param salesDocument
     * @return {*}
     */
    function createCustomerDeposit(NETSUITE_ERPLY_LOCATIONS, erplyLocation, payment, netsuiteSOId, customerId, salesDocument) {
      var TITLE = 'createCustomerDeposit';
      var customerDepositId = '';
      var deparment = {
        id: id,
        name: name,
        department: '14'
      };

      if (_.isEmpty(NETSUITE_PAYMENT_TYPES[payment.type])) {
        log.debug({ title: TITLE, details: 'No valid payment for: ' + payment.paymentID })
        return customerDepositId;
      }

      // Create Customer Deposit Record
      // var customerDepositRecord = nlapiCreateRecord('customerdeposit', {
      var customerDepositRecord = record.create({
        type: 'customerdeposit', isDynamic: true,
        defaultValues: {
          entity: customerId,
          salesorder: netsuiteSOId
        }
      });

      customerDepositRecord.setText({ fieldId: 'trandate', text: helpers.formatNSDate(salesDocument.date) });
      customerDepositRecord.setValue({ fieldId: 'payment', value: payment.sum });
      customerDepositRecord.setValue({ fieldId: 'paymentmethod', value: NETSUITE_PAYMENT_TYPES[payment.type] });
      customerDepositRecord.setValue({ fieldId: 'custbody_erply_payment_id', value: payment.paymentID.toString() });
      if (!_.isEmpty(salesDocument.warehouseID)) {
        customerDepositRecord.setText({ fieldId: 'location', text: erplyLocation.location });
        customerDepositRecord.setValue({ fieldId: 'account', value: erplyLocation.account });
        customerDepositRecord.setValue({ fieldId: 'department', value: '14' });
      }

      customerDepositId = customerDepositRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

      return customerDepositId;
    }

    /**
     * Get Netsuite Customer Id from erplyClientId
     * @param erplyClientId
     * @return {string}
     */
    function getNetsuiteCustomerId(erplyClientId) {
      var TITLE = 'getNetsuiteCustomerId';
      try {
        var netsuiteCustomerId = '';

        var netsuiteCustomer = _.find(NETSUITE_CUSTOMERS, function (netsuiteCustomer) {
          return netsuiteCustomer.erplyClientId === erplyClientId + '.0';
        });
        if (!_.isEmpty(netsuiteCustomer)) {
          netsuiteCustomerId = netsuiteCustomer.id;
        }

        return netsuiteCustomerId;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Get Netsuite Employee Id from erplyEmployeeId
     * @param erplyEmployeeId
     * @return {string}
     */
    function getSalesRep(erplyEmployeeId) {
      var TITLE = 'getSalesRep';
      try {
        var salesRep = '';

        var netsuiteEmployee = _.find(NETSUITE_SALES_REPS, function (salesRep) {
          return salesRep.erplyEmployeeId === erplyEmployeeId;
        });
        if (!_.isEmpty(netsuiteEmployee)) {
          salesRep = netsuiteEmployee.id;
        }

        return salesRep;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }


    /**
     * Get Item Id from Erply ProductId
     * @param erplyProductId
     * @return {string}
     */
    function getItemId(erplyProductId) {
      var TITLE = 'getItemId';
      try {
        var itemId = '';

        var netsuiteItem = _.find(NETSUITE_ITEMS, function (item) {
          return item.erplyProductId === erplyProductId;
        });
        if (!_.isEmpty(netsuiteItem)) {
          itemId = netsuiteItem.id;
        }

        return itemId;
      } catch (err) {
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
