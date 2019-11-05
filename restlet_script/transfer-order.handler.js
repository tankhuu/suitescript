/**
 * transfer-order.handler.js
 * Transfer Order Handler
 *
 * @exports get, post, put, patch, delete
 *
 * @copyright 2019 BTJ
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.0
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/record', 'N/error', 'underscore', 'TransferOrderService', 'EmailService'], function (record, error, _, TransferOrderService, EmailService) {
  var MODULE_NAME = 'TRANSFER_ORDER_HANDLER';
  var SUPPORTED_REQUESTS = TransferOrderService.getSupportedRequests();

  return {
    post: function (body) {
      try {
        var LOG_TITLE = MODULE_NAME + '.POST';
        log.debug(LOG_TITLE + '.body', body);
        var request = body.request;
        // log.debug(LOG_TITLE + '.request', request);
        if (!_.isEmpty(request)) {
          switch (request) {
            case SUPPORTED_REQUESTS.FIND_BY_ID: {
              return 'Not implemented yet!!!';
            }
            case SUPPORTED_REQUESTS.CREATE_TRANSFER_ORDER: {
              var result = {};
              var data = body.data;
              var SOs = [];
              if (!_.isEmpty(data)) {
                if (!_.isEmpty(data.SOs)) {
                  SOs = data.SOs;
                  // remove SOs information
                  delete data.SOs;
                }
                // Create TO
                var id = TransferOrderService.create(data);
                // id = '2029587';
                log.debug(LOG_TITLE + '.id', id);

                if (!_.isEmpty(id) || id) {
                  result.id = id;
                  // Send TO Created Email
                  var TORecord = record.load({ type: record.Type.TRANSFER_ORDER, id: id });
                  // log.debug(LOG_TITLE + '.TORecord', TORecord);
                  result.number = TORecord.getValue({ fieldId: 'tranid' });

                  // Send Email TO Created
                  var sendEmailResult = EmailService.send(TORecord, { template: 'transferOrderCreated' });
                  log.debug(LOG_TITLE + '.sendEmailResult', sendEmailResult);
                  // Send Email Customer Information of SO
                  log.debug(LOG_TITLE + '.SOs', SOs);
                  if (!_.isEmpty(SOs)) {
                    var callCustomerData = { toLocationId: TORecord.getValue({ fieldId: 'transferlocation' }), SOs: SOs };
                    var sendCallCustomerEmailResult = EmailService.send(callCustomerData, { template: 'callCustomers' });
                    log.debug(LOG_TITLE + '.sendCallCustomerEmailResult', sendCallCustomerEmailResult);
                  }
                }
              }

              return result;
            }
            case SUPPORTED_REQUESTS.GET_TRANSFER_ORDER: {
              var result = {};
              var data = body.data;
              log.debug(LOG_TITLE + '.data', data);
              if (data) {
                result = TransferOrderService.get(data);
              }

              return result;
            }
            default: {
              throw error.create({
                name: LOG_TITLE,
                message: 'Request: ' + request + ' is unsupported!!!'
              });
            }
          }

        } else {
          throw error.create({
            name: LOG_TITLE,
            message: 'Missing argument: request!!!'
          });
        }
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }
  }
});