/**
 * helpers.js
 * Helpers
 *
 * @exports XXX
 *
 * @copyright 2018
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */
define(['N/https', 'N/runtime', 'N/error', 'N/search', 'N/format', 'configurations', 'underscore'],
  function (https, runtime, error, search, format, configurations, _) {
    var MODULE_NAME = 'HELPERS';
    var exports = {};


    /* CONSTANTS */
    var DATE_FORMAT = 'YYYY-MM-DD';
    var NS_DATE_FORMAT = 'DD/MM/YYYY';

    /**
     * Get the Netsuite SalesOrder Statuses of Erply Sales Documents
     * @param {array} erplySalesDocumentIds
     * @return {object | netsuiteSOStatuses}
     */
    function getNetsuiteSOStatuses(erplySalesDocumentIds) {
      var TITLE = MODULE_NAME + '.getNetsuiteSOStatuses';
      try {
        // log.debug(TITLE, erplySalesDocumentIds);
        var netsuiteSOStatuses = [];

        // Define search columns
        var columns = [
          { name: 'custbody_erply_sales_doc_id', type: 'text' },
          { name: 'status', type: 'select' }
        ];

        // Define search filters
        var formula = "CASE WHEN {custbody_erply_sales_doc_id} IN('"
          + erplySalesDocumentIds.join("','")
          + "') THEN '1' ELSE '0' END";
        var filters = [
          { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] },
          { name: 'mainline', operator: search.Operator.IS, values: ['T'] }
        ];

        // Create the search
        var salesOrderSearch = search.create({
          type: search.Type.SALES_ORDER,
          columns: columns,
          filters: filters
        });
        // log.debug(TITLE + '.salesOrderSearch', salesOrderSearch);

        // Run the search
        salesOrderSearch.run().each(function (result) {
          netsuiteSOStatuses.push({
            id: result.id,
            status: result.getValue({ name: 'status' }),
            erplySalesDocumentId: result.getValue({ name: 'custbody_erply_sales_doc_id' })
          });

          return true;
        });

        return netsuiteSOStatuses;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Encode QueryParams for the API Request with URL Encode
     * @param parameters
     * @returns {string | string}
     */
    function createQueryString(parameters) {
      var TITLE = MODULE_NAME + '.createQueryString';
      try {
        var queryString = '';
        queryString = _.map(parameters, function (value, key) {
          if (!_.isEmpty(value)) {
            //encodeURIComponent for escape special characters
            var queryParam = key + '=' + encodeURIComponent(value);
            return queryParam;
          }
        }).join('&');
        // log.debug({ title: MODULE_NAME + '.request.queryParams: ', details: queryParams });
        return queryString;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Return time since Unix epoch
     * @returns {number}
     */
    function time() {
      return new Date().getTime();
    }

    /**
     * Collect Netsuite Locations Information for Erply Locations
     *
     * @return {Array}
     */
    function getNetsuiteLocationsForErply() {
      var TITLE = MODULE_NAME + '.getNetsuiteLocationsForErply';
      try {
        var locations = [];
        var locationsSearch = search.create({
          type: search.Type.LOCATION,
          columns: [
            { name: 'custrecord_erply_location_id' },
            { name: 'name' },
            { name: 'custrecord_erply_sales_account' }
          ],
          filters: [
            { name: 'custrecord_erply_location_id', operator: search.Operator.ISNOTEMPTY }
          ]
        });

        locationsSearch.run().each(function (location) {
          locations.push({
            netsuiteLocationId: location.id,
            id: location.getValue({ name: 'custrecord_erply_location_id' }),
            location: location.getValue({ name: 'name' }),
            account: location.getValue({ name: 'custrecord_erply_sales_account' })
          });
          return true;
        });

        // log.debug('getLocations', locations.length);
        return locations;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    function getNetsuiteCustomers(salesDocumentClientIds) {
      var TITILE = MODULE_NAME + '.getNetsuiteCustomers';
      try {
        var netsuiteCustomerIds = [];

        if (!_.isEmpty(salesDocumentClientIds)) {
          // Define search columns
          var columns = [
            { name: 'custentity_erply_customer_id' }
          ];

          // Define search filters
          var formula = "CASE WHEN {custentity_erply_customer_id} IN('"
            + salesDocumentClientIds.join("','")
            + "') THEN '1' ELSE '0' END";
          var filters = [
            { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] }
          ];

          // Create the search
          var customerSearch = search.create({
            type: search.Type.CUSTOMER,
            columns: columns,
            filters: filters
          });
          // log.debug(TITLE + '.salesOrderSearch', salesOrderSearch);

          // Run the search
          customerSearch.run().each(function (customer) {
            netsuiteCustomerIds.push({
              id: customer.id,
              erplyClientId: customer.getValue({ name: 'custentity_erply_customer_id' })
            });
            return true;
          })
        }

        return netsuiteCustomerIds;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    function getNetsuiteSaleReps(salesDocumentEmployeeIds) {
      var TITLE = MODULE_NAME + '.getNetsuiteSaleReps';
      try {
        var netsuiteSaleReps = [];

        if (!_.isEmpty(salesDocumentEmployeeIds)) {
          // log.debug(TITLE + '.salesDocumentEmployeeIds', salesDocumentEmployeeIds);
          // Define search columns
          var columns = [
            { name: 'custentity_erply_employee_id' }
          ];

          // Define search filters
          var formula = "CASE WHEN {custentity_erply_employee_id} IN('"
            + salesDocumentEmployeeIds.join("','")
            + "') THEN '1' ELSE '0' END";
          var filters = [
            { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] }
          ];

          // Create the search
          var employeeSearch = search.create({
            type: search.Type.EMPLOYEE,
            columns: columns,
            filters: filters
          });
          // log.debug(TITLE + '.salesOrderSearch', salesOrderSearch);

          // Run the search
          employeeSearch.run().each(function (employee) {
            netsuiteSaleReps.push({
              id: employee.id,
              erplyEmployeeId: employee.getValue({ name: 'custentity_erply_employee_id' })
            });
            return true;
          })
        }

        return netsuiteSaleReps;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    function getNetsuiteItems(salesDocumentSKUs) {
      var TITLE = MODULE_NAME + '.getNetsuiteItems';
      try {
        var netsuiteItems = [];

        if (!_.isEmpty(salesDocumentSKUs)) {
          // Define search columns
          var columns = [
            { name: 'custitem_erply_product_id' }
          ];

          // Define search filters
          var formula = "CASE WHEN {custitem_erply_product_id} IN('"
            + salesDocumentSKUs.join("','")
            + "') THEN '1' ELSE '0' END";
          var filters = [
            { name: 'formulatext', formula: formula, operator: search.Operator.IS, values: ['1'] },
            { name: 'isinactive', operator: search.Operator.IS, values: ['F'] }
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
        }

        return netsuiteItems;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Format Netsuite Date
     * @param date - YYYY-MM-DD
     * @return {string}
     */
    function formatNSDate(date) {
      var dateSplitted = date.split('-');
      var year = dateSplitted[0];
      var month = dateSplitted[1];
      var day = dateSplitted[2];
      var dateFormatted = format.format({
        value: [day, month, year].join('/'),
        type: format.Type.DATE
      })
      return dateFormatted.toString();
    }

    /**
     * Format Netsuite Date
     * @param date
     * @returns {string}
     */
    function formatNetsuiteDate(date) {
      var TITLE = MODULE_NAME + '.formatNetsuiteDate';
      try {
        var dateFormatted = '';

        if (!_.isEmpty(date)) {
          var mDate = moment(date, DATE_FORMAT);
          dateFormatted = format.format({
            type: format.Type.DATE,
            value: mDate.format(NS_DATE_FORMAT)
          }).toString();
        }

        return dateFormatted.toString();
      } catch (err) {
        log.error(TITLE, err.message);
      }
    }

    /**
     * Send Message To Slack
     * @param env
     * @param color
     * @param message
     * @param fields
     */
    function sendMessageToSlack(env, color, message, fields) {
      var TITLE = MODULE_NAME + '.sendMessageToSlack';
      try {
        _.isEmpty(env) && (env = 'stage');
        var SLACK_CONFIGURATION = configurations.getConfig(env, 'slack');
        var slackUrl = SLACK_CONFIGURATION.url;
        var color = SLACK_CONFIGURATION.colors[color];
        if (_.isEmpty(color)) {
          color = SLACK_CONFIGURATION.colors.normal;
        }
        (_.isEmpty(message)) && (message = 'No Message Entered!!!');
        (_.isEmpty(fields)) && (fields = [
          { title: 'field 1 title', value: 'field 1 value', short: true },
          { title: 'field 2 title', value: 'field 2 value', short: true }
        ]);

        var payload = {
          attachments: [
            {
              text: message,
              color: color,
              mrkdwn_in: 'text',
              fields: fields
            }
          ]
        };

        var postResult = https.post({ url: slackUrl, body: JSON.stringify(payload) });
        log.debug(TITLE + '.postResult', postResult);
      } catch (err) {
        log.error(TITLE + '.error', err.message);
      }
    }

    function sendToS3(env, request, content) {
      var TITLE = MODULE_NAME + '.sendToS3';
      try {
        _.isEmpty(env) && (env = 'stage');
        var S3_CONFIGURATION = configurations.getConfig(env, 'aws');
        // log.debug(TITLE + '.S3_CONFIGURATION', S3_CONFIGURATION);
        var options = {
          method: S3_CONFIGURATION.api[request].method,
          url: S3_CONFIGURATION.api.url + S3_CONFIGURATION.api[request].endpoint,
          headers: {
            'Content-Type': 'application/json',
            'x-amz-docs-region': S3_CONFIGURATION.api.region,
            'x-api-key': S3_CONFIGURATION.api.key
          },
          body: JSON.stringify(content)
        };
        // log.debug(TITLE + '.options', JSON.stringify(options));
        var result = https.request(options);
        // log.debug(TITLE + '.result', result);
        if (result.code >= 300) {
          var slackMessageFields = [];
          slackMessageFields.push({ title: TITLE + '.code.' + result.code, value: JSON.parse(result.body).message });
          !_.isEmpty(slackMessageFields) && sendMessageToSlack(env, 'danger', TITLE, slackMessageFields);
        }

        return result;
      } catch (err) {
        log.error(TITLE, err);
        var slackMessageFields = [];
        slackMessageFields.push({ title: TITLE, value: err.message });
        !_.isEmpty(slackMessageFields) && sendMessageToSlack(env, 'danger', TITLE, slackMessageFields);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    /**
     * Get Running Environment
     * @param paramName - netsuite script field name
     * @returns {any | string} (stage | production)
     */
    function getEnvironment() {
      var TITLE = MODULE_NAME + '.getEnvironment';
      try {
        var env = 'stage';
        switch (runtime.envType) {
          case 'PRODUCTION': {
            env = 'production';
            break;
          }
          case 'SANDBOX':
          default:
            env = 'stage';
        }

        return env;
      } catch (err) {
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    function transferNetsuiteSearchList(list) {
      try {
        var TITLE = MODULE_NAME + '.transferNetsuiteSearchList';
        var nList = '';

        if (!_.isEmpty(list)) {
          nList = list.map(function (name) {
            return "'" + name + "'";
          }).join();
        }

        return nList;
      } catch (err) {
        log.debug(TITLE + '.error', err.message);
      }
    }

    /**
     * Extract Netsuite Items Information
     * @param itemCodes
     * @returns {Array}
     */
    function extractNetsuiteItemsLocation(itemCodes) {
      try {
        var TITLE = MODULE_NAME + '.extractNetsuiteItemsLocation';
        var gov = 0;
        var nItemsLocation = [];

        if (!_.isEmpty(itemCodes)) {
          var resultColumns = ['internalid', 'inventorylocation', 'name', 'custitem_btj_last_transfered_date'];
          var formula = "formulanumeric: case when {name} in (" + transferNetsuiteSearchList(itemCodes) + ") then 1 else 0 end";
          // log.debug(TITLE + '.transferNetsuiteSearchList', transferNetsuiteSearchList(itemCodes));
          var searchFilters = [
            [formula.toString(), "equalto", "1"],
            'and',
            ['locationquantityonhand', 'greaterthan', '0']
          ];

          var itemsSearch = search.create({
            type: search.Type.INVENTORY_ITEM,
            columns: resultColumns,
            filters: searchFilters
          });
          itemsSearch.run().each(function (item) {
            var itemLocation = {};
            itemLocation.itemid = item.getValue({ name: 'name' });
            itemLocation.location = item.getValue({ name: 'inventorylocation' });

            nItemsLocation.push(itemLocation);
            return true;
          });
        }

        return nItemsLocation;
      } catch (err) {
        log.error(TITLE, err.message);
        throw error.create({
          name: TITLE,
          message: err.message
        });
      }
    }

    exports = {
      getNetsuiteSOStatuses: getNetsuiteSOStatuses,
      getNetsuiteLocationsForErply: getNetsuiteLocationsForErply,
      getNetsuiteCustomers: getNetsuiteCustomers,
      getNetsuiteSaleReps: getNetsuiteSaleReps,
      getNetsuiteItems: getNetsuiteItems,
      createQueryString: createQueryString,
      formatNSDate: formatNSDate,
      time: time,
      sendMessageToSlack: sendMessageToSlack,
      getEnvironment: getEnvironment,
      sendToS3: sendToS3,
      extractNetsuiteItemsLocation: extractNetsuiteItemsLocation,
      transferNetsuiteSearchList: transferNetsuiteSearchList
    };

    return exports;
  });
