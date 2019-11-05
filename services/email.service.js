/**
 * email.service.js
 * Email Service
 *
 * @exports find, get, getList
 *
 * @copyright 2018 BTJ
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.0
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/record', 'N/email', 'N/render', 'N/error', 'N/file', 'underscore', 'moment'],
  function (record, email, render, error, file, _, moment) {
    var MODULE_NAME = 'EMAIL_SERVICE';
    var exports = {};

    /**
     * CONSTANTS
     */
    var DEFAULT_SUBSIDIARY = '2'; // BT Gold Subsidiary
    var DEFAULT_DEPARTMENT = '12'; // Merchandising Department
    var DEFAULT_TRANSFER_LOCATION = '456'; // E-commerce Location
    var DEFAULT_TO_STATUS = 'B'; // Pending Fulfillment Status
    var DEFAULT_MEMO = MODULE_NAME;
    var EMAIL_TEMPLATES = {
      transferOrderCreated: {
        name: 'transferOrderCreated',
        id: 'TEMPLATE_FILE_ID'
      },
      callCustomers: {
        name: 'callCustomers',
        id: 'TEMPLATE_FILE_ID'
      },
    };
    var LISTENER = 'emails.123.234.ABC123@emails.na3.netsuite.com';
    var MAGENTO_LISTENER = 'emails.321.234.ABC123@emails.na3.netsuite.com';
    var ECOM_SALES_REP = ['sales@rep.vn'];


    /**
    * LIST OF SUPPORTED REQUESTS
    */
    var SUPPORTED_REQUESTS = {
      SEND_EMAIL: 'sendEmail'
    };

    function getSupportedRequests() {
      return SUPPORTED_REQUESTS;
    }

    function send(data, params) {
      try {
        var LOG_TITLE = MODULE_NAME + '.send';
        var template = params.template;
        switch (template) {
          case EMAIL_TEMPLATES.transferOrderCreated.name: {
            return sendTOCreated(data, template);
          }
          case EMAIL_TEMPLATES.callCustomers.name: {
            return sendCallCustomers(data, template);
          }
          default: {
            throw error.create({
              name: LOG_TITLE,
              message: 'Template can not be empty!'
            });
          }
        }
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function getNoReplySender() {
      return SENDER_ID;
    }

    function checkTemplateExists(templateId) {
      if (!_.isEmpty(EMAIL_TEMPLATES[templateId])) return true;
      return false;
    }

    function createBody(data, template) {
      try {
        var LOG_TITLE = MODULE_NAME + '.createBody';
        // log.debug(LOG_TITLE + '.data', data);
        // log.debug(LOG_TITLE + '.params', params);

        var emailData = {};
        var templateFile = file.load(EMAIL_TEMPLATES[template].id);
        if (!_.isEmpty(templateFile)) {
          var renderer = render.create();

          renderer.templateContent = templateFile.getContents();
          switch (template) {
            case EMAIL_TEMPLATES.transferOrderCreated.name: {
              var itemsList = data.TO.items.map(function (item) { return item.name }).join(',');
              itemsList += '|';
              emailData = {
                listener: LISTENER,
                mlistener: MAGENTO_LISTENER,
                // sender: data.cc.join(),
                sender: '',
                receiver: data.recipients.join(),
                id: data.TO.id,
                number: data.TO.number,
                from: data.TO.from,
                to: data.TO.to,
                status: data.TO.status,
                date: moment(data.TO.date).format('D/M/YYYY'),
                items: data.TO.items,
                itemsList: itemsList
              };
              break;
            }
            case EMAIL_TEMPLATES.callCustomers.name: {
              emailData = {
                SOs: data.SOs
              };
              break;
            }
            default: {
              emailData = {};
            }
          }

          log.debug(LOG_TITLE + '.emailData', emailData);
          renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: "content",
            data: emailData
          });

          return renderer.renderAsString();
        }

        return '';
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function sendTOCreated(data, template) {
      try {
        var LOG_TITLE = MODULE_NAME + '.sendTOCreated';
        var TORecord = data;

        var emailData = {
          subject: '',
          recipients: [],
          // recipients: data.recipients,
          cc: ECOM_SALES_REP,
          // replyTo: data.replyTo,
          TO: {
            id: TORecord.id,
            number: TORecord.getValue({ fieldId: 'tranid' }),
            from: TORecord.getValue({ fieldId: 'location' }),
            to: TORecord.getValue({ fieldId: 'transferlocation' }),
            status: TORecord.getValue({ fieldId: 'status' }),
            date: TORecord.getValue({ fieldId: 'trandate' }),
            memo: TORecord.getValue({ fieldId: 'memo' }),
            items: []
          }
        };
        emailData.subject = 'Transfer Order ' + emailData.TO.number + ' is created';
        var totalItems = TORecord.getLineCount({ sublistId: 'item' });
        for (var i = 0; i < totalItems; i++) {
          var item = {};
          item.id = TORecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
          var itemName = TORecord.getSublistValue({ sublistId: 'item', fieldId: 'item_display', line: i }).split(' ');
          item.name = itemName[0];
          item.isclosed = TORecord.getSublistValue({ sublistId: 'item', fieldId: 'isclosed', line: i });
          item.quantitycommitted = TORecord.getSublistValue({ sublistId: 'item', fieldId: 'quantitycommitted', line: i });
          item.quantityreceived = TORecord.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: i });
          item.quantityfulfilled = TORecord.getSublistValue({ sublistId: 'item', fieldId: 'quantityfulfilled', line: i });
          item.status = getItemStatus(item);

          emailData.TO.items.push(item);
        }
        // Add Locations Information
        var fromLocation = getLocationInfo(emailData.TO.from);
        var toLocation = getLocationInfo(emailData.TO.to);
        emailData.TO.from = fromLocation.name;
        emailData.TO.to = toLocation.name;
        // Add Recipients
        emailData.recipients.push(getLocationManagerEmail(fromLocation.custrecord_btj_loc_manager));
        emailData.recipients.push(getLocationManagerEmail(toLocation.custrecord_btj_loc_manager));
        log.debug(LOG_TITLE + '.emailData', JSON.stringify(emailData));

        var body = createBody(emailData, template);
        // log.debug(LOG_TITLE + '.body', body);

        if (!_.isEmpty(body)) {
          var options = {
            author: getNoReplySender(),
            recipients: emailData.recipients,
            // replyTo : emailData.replyTo,
            cc: emailData.cc,
            subject: emailData.subject,
            body: body,
          };

          // log.debug(LOG_TITLE + '.options', options);
          return email.send(options);
        }
        else throw error.create({
          name: LOG_TITLE,
          message: 'Can not create Email body!!'
        });
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }

    function sendCallCustomers(data, template) {
      try {
        var LOG_TITLE = MODULE_NAME + '.sendCallCustomers';

        var emailData = {
          SOs: data.SOs
        };
        log.debug(LOG_TITLE + '.emailData', emailData);

        var body = createBody(emailData, template);

        if (!_.isEmpty(body)) {
          var options = {
            subject: 'Call Customers',
            author: getNoReplySender(),
            // replyTo: getNoReplySender(),
            recipients: [],
            cc: ECOM_SALES_REP,
            body: body
          };


          var toLocation = getLocationInfo(data.toLocationId);
          options.recipients.push(getLocationManagerEmail(toLocation.custrecord_btj_loc_manager));

          log.debug(LOG_TITLE + '.options', options);
          return email.send(options);
        }
        else throw error.create({
          name: LOG_TITLE,
          message: 'Can not create Email body!!'
        });
      } catch (err) {
        throw error.create({
          name: LOG_TITLE,
          message: err.message
        });
      }
    }


    function getItemStatus(item) {
      var status = '';
      if (item.isclosed) {
        status = 'closed';
      } else if (item.quantitycommitted > 0) {
        status = 'ready to fulfill';
      } else if (item.quantityreceived > 0) {
        status = 'received'
      } else if (item.quantityfulfilled > 0) {
        status = 'fulfilled, waiting for receipt';
      }
      log.debug('getItemStatus.status: ', status);
      return status;
    }

    function getLocationInfo(id) {
      var location = {
        id: '',
        name: '',
        custrecord_btj_loc_manager: ''
      };
      var locationRecord = record.load({ type: record.Type.LOCATION, id: id });
      for (var fieldId in location) {
        location[fieldId] = locationRecord.getValue({ fieldId: fieldId });
      }

      return location;
    }

    function getLocationManagerEmail(id) {
      var email;

      var locationManagerRecord = record.load({ type: record.Type.EMPLOYEE, id: id });
      email = locationManagerRecord.getText({ fieldId: 'email' });

      return email;
    }

    exports = {
      getSupportedRequests: getSupportedRequests,
      send: send,
      createBody: createBody,
      getLocationInfo: getLocationInfo,
    };

    return exports;
  });