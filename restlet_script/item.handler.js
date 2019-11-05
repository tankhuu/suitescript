/**
 * item.handler.js
 * Item Handler
 *
 * @exports get, post, put, patch, delete
 *
 * @copyright 2019 BTJ
 * @author TanKhuu <tanktm@btj.vn>
 *
 * @NApiVersion 2.0
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['underscore', 'ItemService'], function (_, ItemService) {
  var MODULE_NAME = 'ITEM_HANDLER';
  var SUPPORTED_REQUESTS = ItemService.getSupportedRequests();

  return {
    post: function (body) {
      try {
        var LOG_TITLE = MODULE_NAME + '.POST';
        // log.debug(LOG_TITLE + '.body: ', body);
        var request = body.request;
        // log.debug(LOG_TITLE + '.request: ', request);
        if (!_.isEmpty(request)) {
          switch (request) {
            case SUPPORTED_REQUESTS.FIND_BY_VENDOR_NAME: {
              var items = [];
              var params = {
                request: body.request,
                vendorName: body.vendorName
              };
              // log.debug(MODULE_NAME + '.params', params);

              items = ItemService.find(params);
              // log.debug(MODULE_NAME, items);

              return items;
            }
            case SUPPORTED_REQUESTS.PATCH_SYNC_STATUS: {
              var data = { status: body.status, itemIds: body.internalids };
              var params = { request: body.request };
              // log.debug(MODULE_NAME + '.params', params);
              var result = ItemService.patch(data, params);
              // log.debug(MODULE_NAME + '.result', result);

              return result;
              // return 'patched';
            }
            case SUPPORTED_REQUESTS.FIND_BY_ID: {
              return 'Not implemented yet!!!';
            }
            default: {
              return 'Request: ' + request + ' is unsupported!!!';
            }
          }

        } else {
          return 'Missing argument: request!!!';
        }
      } catch (err) {
        throw new Error(LOG_TITLE + err.message);
      }
    }
  }
});