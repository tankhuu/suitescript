/**
 * ss_export_invoices_to_fb_offline_events.js
 * Export Invoices From Netsuite To Facebook Offline Events
 * Title: PRECITA-SS-exportInvoicesToFb
 * ID: _ss_export_invoices_to_fb
 * SaveSearchTitle:
 * SaveSearchId:
 *
 * @exports execute
 *
 * @copyright 2019 BTJ
 * @author LanBui <lanbn@btj.vn>
 *
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 */
define(['N/search', 'N/record', 'N/file', 'N/https', 'N/crypto', 'N/encode', 'configurations', 'moment', 'underscore'],
    function (search, record, file, https, crypto, encode, configurations, moment, _) {
        var exports = {};
        var MODULE_NAME = 'EXPORT_INVOICES_TO_FB';
        /*
        * The Identity of ExportInvoicesToFbOfflineEvents folder
        * */
        var EXPORT_INVOICES_TO_FB_OFFLINE_EVENTS_FOLDER = 47237;
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
            var TITLE = MODULE_NAME + '.execute()';
            var FIELDS = {
                value: {
                    order_number: 'custbody_erply_order_number',
                    invoice_number: 'tranid',
                    invoice_date: 'trandate',
                    payment_amount: 'amount',
                    customer_internal_id: 'entity',
                    customer_email: 'customer.email',
                    customer_phone: 'customer.phone',
                    customer_mobile: 'customer.mobilephone',
                    order_created_at: 'custbodybtj_date_created_from_erply'
                },
                text: {
                    customer_entity: 'entity'
                }
            };
            log.debug(TITLE, '<< START >>');
            /* Extract Data from Netsuite */
            var NETSUITE_CONFIG = configurations.getConfig('production', 'netsuite');
            var savedSearchId = NETSUITE_CONFIG.savedSearchId.exportInvoicesToFb;

            // load last sync invoice to tracking table
            var trackingRecord = record.load({
                type: 'customrecord_btj_social_sync_tracking',
                id: 1
            });
            var lastSyncDate = trackingRecord.getValue({ fieldId: 'custrecord_btj_social_sync_tracking_date' });
            var lastSyncId = trackingRecord.getValue({ fieldId: 'custrecord_btj_social_sync_tracking_id' });
            var invoicesSearch = search.load({ id: savedSearchId });
            var trxDateFilter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.ONORAFTER,
                values: moment(lastSyncDate, 'D/M/YYYY').format('D/M/YYYY')
            });
            invoicesSearch.filters.push(trxDateFilter);
            // var filterExpression = invoicesSearch.filterExpression;
            // filterExpression.push('AND');
            // var phoneFilters = [
            //     ['customer.phone', search.Operator.ISNOTEMPTY, ''],
            //     'OR',
            //     ['customer.mobilephone', search.Operator.ISNOTEMPTY, '']
            // ];
            // filterExpression.push(phoneFilters);
            // invoicesSearch.filterExpression = filterExpression;
            log.debug('filterExpression', invoicesSearch.filterExpression);
            var itemsPagedData = invoicesSearch.runPaged({ pageSize: BATCH });
            var invoiceItems = [];
            var ignore = !_.isEmpty(lastSyncId);
            itemsPagedData.pageRanges.forEach(function (pageRange) {
                var itemsPage = itemsPagedData.fetch({ index: pageRange.index });
                itemsPage.data.forEach(function (item) {
                    if (ignore) {
                        if (item.id == lastSyncId) {
                            ignore = false;
                        }
                    } else {
                        var invoiceItem = { internal_id: item.id };
                        Object.keys(FIELDS.value).forEach(function (field) {
                            var name = FIELDS.value[field];
                            if (name.indexOf('.') > 0) {
                                var nameParts = name.split('.');
                                return invoiceItem[field] = item.getValue({ name: nameParts[1], join: nameParts[0] });
                            } else {
                                return invoiceItem[field] = item.getValue({ name: name });
                            }
                        });
                        Object.keys(FIELDS.text).forEach(function (field) {
                            return invoiceItem[field] = item.getText({ name: FIELDS.text[field] });
                        });
                        var spacePos = invoiceItem['customer_entity'].indexOf(' ');
                        invoiceItem['customer_id'] = invoiceItem['customer_entity'].substr(0, spacePos);
                        invoiceItem['customer_name'] = invoiceItem['customer_entity'].substr(spacePos).trim();
                        delete invoiceItem['customer_entity'];
                        if (_.isEmpty(invoiceItem['customer_phone'].trim()) && _.isEmpty(invoiceItem['customer_mobile'].trim())) {
                            log.debug({
                                title: TITLE + ' Ignore invoice that missing phone/mobile number!',
                                details: invoiceItem
                            });
                        } else {
                            invoiceItems.push(invoiceItem);
                        }
                    }
                });
            });
            log.debug({ title: TITLE + ' Total invoice items', details: invoiceItems.length });
            if (invoiceItems.length > 0) {
                uploadOfflineEventsToFb(invoiceItems);
                saveToFileCabinet(invoiceItems);
                // save last sync invoice to tracking table
                var lastInvoice = invoiceItems.pop();
                trackingRecord.setValue({
                    fieldId: 'custrecord_btj_social_sync_tracking_date',
                    value: moment(lastInvoice['invoice_date'], 'D/M/YYYY').toDate(),
                    ignoreFieldChange: true
                });
                trackingRecord.setValue({
                    fieldId: 'custrecord_btj_social_sync_tracking_id',
                    value: lastInvoice['internal_id'],
                    ignoreFieldChange: true
                });

                trackingRecord.save();
                log.debug({ title: TITLE + ' Last synced invoice', details: trackingRecord });
            }
        };

        function transformDataToCSVFile(invoiceItems) {
            var COLUMNS = {
                header: [
                    'Invoice Number',
                    'Customer ID',
                    'Customer Name',
                    'Customer Email',
                    'Customer Phone',
                    'Customer Mobile',
                    'Payment Amount',
                    'Order Date',
                    'Invoice Internal ID',
                    'Customer Internal ID'
                ],
                source: [
                    'invoice_number',
                    'customer_id',
                    'customer_name',
                    'customer_email',
                    'customer_phone',
                    'customer_mobile',
                    'payment_amount',
                    'order_created_at',
                    'internal_id',
                    'customer_internal_id'
                ]
            };
            var csvContentLines = [];
            // Output the csv header
            csvContentLines.push(COLUMNS.header.join(','));
            invoiceItems.forEach(function (invoiceItem) {
                var lineCols = [];
                COLUMNS.source.forEach(function (field) {
                    switch (field) {
                        case 'customer_name':
                            lineCols.push('"' + invoiceItem[field] + '"');
                            break;
                        case 'customer_phone':
                        case 'customer_mobile':
                            lineCols.push(formatPhone(invoiceItem[field]));
                            break;
                        case 'payment_amount':
                            lineCols.push(formatPrice(invoiceItem[field]));
                            break;
                        case 'order_created_at':
                            lineCols.push(formatDateTime(invoiceItem[field]));
                            break;
                        default:
                            lineCols.push(invoiceItem[field]);
                    }
                });
                csvContentLines.push(lineCols);
            });

            return csvContentLines;
        };

        function formatPhone(phone) {
            var MOBILE_PHONE_PREFIX = /^032|033|034|035|036|037|038|039|052|056|058|059|070|079|077|076|078|083|084|085|081|082|090|091|092|093|094|096|097|098|099|0162|0163|0164|0165|0166|0167|0168|0169|0120|0121|0122|0126|0128|0123|0124|0125|0127|0129|0199/;
            phone = phone.trim();
            if (phone.match(/^84/)) {
                return '+' + phone;
            }
            if (phone.match(MOBILE_PHONE_PREFIX)) {
                return '+84' + phone.substr(1);
            }

            return phone;
        };

        function formatPrice(amount) {
            var dotPos = amount.indexOf('.');
            return dotPos > 0 ? amount.substr(0, dotPos) : amount;
        };

        function formatDateTime(date) {
            return moment(date + ' +0000', 'D/M/YYYY h:m:s A Z').toISOString();
        };

        function formatUnixTimestamp(date) {
            return moment(date + ' +0000', 'D/M/YYYY h:m:s A Z').unix();
        };

        function saveToFileCabinet(invoiceItems) {
            var csvContentLines = transformDataToCSVFile(invoiceItems);
            var csvFileName = 'OfflineInvoice-' + moment().format('YYYYMMDDHHmm') + '.csv';

            var csvFile = file.create({
                name: csvFileName,
                folder: EXPORT_INVOICES_TO_FB_OFFLINE_EVENTS_FOLDER,
                fileType: file.Type.CSV,
                encoding: file.Encoding.UTF8
            });
            csvContentLines.forEach(function (line) {
                csvFile.appendLine({
                    value: line
                });
            });
            var csvFileId = csvFile.save();
            log.debug({
                title: MODULE_NAME + '.saveToFileCabinet() CSV File Path',
                details: '/ExportInvoicesToFbOfflineEvents/' + csvFileName
            });
            //log.debug({title: MODULE_NAME + '.saveToFileCabinet() CSV File Id', details: csvFileId});
        };

        function hashSHA256(value) {
            var hashObj = crypto.createHash({
                algorithm: crypto.HashAlg.SHA256
            });
            hashObj.update({
                input: value,
                inputEncoding: encode.Encoding.UTF_8
            });

            var hashedStr = hashObj.digest({
                outputEncoding: encode.Encoding.HEX
            });

            return hashedStr.toLowerCase();
        };

        function transformToFbEventData(invoiceItem) {
            var phone = formatPhone(invoiceItem['customer_phone']);
            var mobile = formatPhone(invoiceItem['customer_mobile']);
            var hashedPhones = [];
            if (!_.isEmpty(phone)) {
                hashedPhones.push(hashSHA256(phone));
            }
            if (!_.isEmpty(mobile) && phone !== mobile) {
                hashedPhones.push(hashSHA256(mobile));
            }

            var matchKeys = {
                phone: hashedPhones,
                fn: hashSHA256(invoiceItem['customer_name']),
                extern_id: invoiceItem['customer_id']
            };
            if (!_.isEmpty(invoiceItem['customer_email'])) {
                matchKeys['email'] = hashSHA256(invoiceItem['customer_email']);
            }

            return {
                match_keys: matchKeys,
                event_time: formatUnixTimestamp(invoiceItem['order_created_at']),
                event_name: 'Purchase',
                currency: 'VND',
                value: parseInt(invoiceItem['payment_amount']),
                order_id: invoiceItem['invoice_number']
            };
        };

        function uploadOfflineEventsToFb(invoiceItems) {
            var numOfUploadedItems = 0;

            if (invoiceItems.length > 0) {
                var firstId = invoiceItems[0]['internal_id'];
                var lastId = invoiceItems[invoiceItems.length - 1]['internal_id'];
                var uploadTag = 'OfflineInvoice-' + moment().format('YYYYMMDDHHmm') + '-' + firstId + '-' + lastId;
                var i = 0;
                var batch = [];
                invoiceItems.forEach(function (invoiceItem) {
                    i++;
                    batch.push(transformToFbEventData(invoiceItem));
                    if (i === BATCH || i === invoiceItems.length) {
                        try {
                            var FACEBOOK_CONFIG = configurations.getConfig('production', 'facebook');
                            var body = {
                                access_token: FACEBOOK_CONFIG.api.key,
                                upload_tag: uploadTag,
                                data: JSON.stringify(batch)
                            };
                            var response = https.post({
                                url: FACEBOOK_CONFIG.api.url + FACEBOOK_CONFIG.api.offlineEvents.endpoint,
                                body: body
                            });
                            if (!_.isEmpty(response)) {
                                var responseCode = Number(response.code);
                                var responseBody = response.body;
                                if (responseCode === 200) {
                                    if (!_.isEmpty(responseBody)) {
                                        var data = JSON.parse(responseBody);
                                        numOfUploadedItems += data['num_processed_entries'];
                                    }
                                } else {
                                    log.debug({
                                        title: MODULE_NAME + '.uploadOfflineEventsToFb() Request body',
                                        details: body
                                    });
                                    log.debug({
                                        title: MODULE_NAME + '.uploadOfflineEventsToFb() Response',
                                        details: response
                                    });
                                }
                            }
                        } catch (err) {
                            log.debug({
                                title: MODULE_NAME + '.uploadOfflineEventsToFb() error. Reason',
                                details: err.message
                            });
                        }
                        i = 0;
                        batch = [];
                    }
                });
            }
            log.debug({
                title: MODULE_NAME + '.uploadOfflineEventsToFb() Total uploaded items',
                details: numOfUploadedItems
            });

            return numOfUploadedItems;
        };

        exports = {
            execute: execute
        };

        return exports;
    });