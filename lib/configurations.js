/**
 * configurations.js
 * Stage Configurations
 *
 * @exports XXX
 *
 * @copyright 2018
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */
define(['N/error'],
  function (error) {
    var MODULE_NAME = 'CONFIGURATIONS';
    var exports = {};


    /**
     * Get API Configurations
     * @param service - netsuite | magento | aws | slack
     * @return {*}
     */
    var configurations = {
      production: {
        netsuite: {
          savedSearchId: {
            underwaterItems: 'customsearch_ecom_underwater_items',
            availableStocks: 'customsearch_mage_get_available_stocks',
            availableStores: 'customsearch_mage_get_available_stores',
            availableProducts: 'customsearch_mage_get_available_products',
            checkAvailableProducts: 'customsearch_ecom_available_products',
            inventoryStocks: 'customsearch_bi_extract_inventory_qty',
            exportInvoicesToFb: 'customsearch_invoices_fb_offline_events',
            exportBestSeller: 'customsearch_export_bestseller_thismonth'
          }
        },
        magento: {
          api: {
            url: 'https://domain.vn',
            authorization: 'Bearer abcd'
          }
        },
        slack: {
          url: 'https://hooks.slack.com/services/abc/abc/abcd',
          colors: {
            good: 'good',
            warning: 'warning',
            danger: 'danger',
            normal: '#439FE0'
          }
        },
        aws: {
          api: {
            url: 'https://abc.execute-api.region.amazonaws.com/production',
            syncInventoryCount: {
              endpoint: '/syncInventoryCount',
              method: 'PUT'
            },
            syncStoresAvailability: {
              endpoint: '/syncStoresAvailability',
              method: 'PUT'
            },
            syncProducts: {
              endpoint: '/syncProducts',
              method: 'PUT'
            },
            exportAvailableProducts: {
              endpoint: '/exportAvailableProducts',
              method: 'PUT'
            },
            exportInventoryQuantity: {
              endpoint: '/exportInventoryQuantity',
              method: 'PUT'
            },
            region: 'ap-southeast-1',
            key: 'AWS_API_GATEWAY_KEY'
          }
        },
        erply: {
          api: {
            url: 'https://erply.com/api',
            clientCode: '1234',
            username: 'username',
            password: 'password'
          }
        },
        facebook: {
          api: {
            url: 'https://graph.facebook.com/v4.0',
            key: 'FACEBOOK_API_KEY',
            offlineEvents: {
              endpoint: '/123/events',
              method: 'POST'
            }
          }
        }
      },
      stage: {
        netsuite: {
          savedSearchId: {
            availableStocks: 'customsearch_mage_get_available_stocks',
            availableStores: 'customsearch_mage_get_available_stores',
            availableProducts: 'customsearch_mage_get_available_products',
            checkAvailableProducts: 'customsearch_ecom_available_products'
          }
        },
        magento: {
          api: {
            url: 'https://stage.domain.vn',
            authorization: 'Bearer MAGENTO_TOKEN'
          }
        },
        slack: {
          url: 'https://hooks.slack.com/services/123/abc/abc123',
          colors: {
            good: 'good',
            warning: 'warning',
            danger: 'danger',
            normal: '#439FE0'
          }
        },
        aws: {
          api: {
            url: 'https://abc.execute-api.region.amazonaws.com/production',
            syncInventoryCount: {
              endpoint: '/syncInventoryCount',
              method: 'PUT'
            },
            syncStoresAvailability: {
              endpoint: '/syncStoresAvailability',
              method: 'PUT'
            },
            syncProducts: {
              endpoint: '/syncProducts',
              method: 'PUT'
            },
            syncProducts: {
              endpoint: '/exportAvailableProducts',
              method: 'PUT'
            },
            region: 'ap-southeast-1',
            key: 'AWS_API_GATEWAY_KEY'
          }
        },
      }
    }

    /**
     * Get Config
     * @param env
     * @param service
     * @returns {*}
     */
    function getConfig(env, service) {
      var TITLE = MODULE_NAME + '.getConfig';
      try {
        _.isEmpty(env) && (env = 'stage');
        var CONFIG = configurations[env];
        var SUPPORTED_SERVICES = Object.keys(CONFIG);
        if (!~SUPPORTED_SERVICES.indexOf(service)) {
          // Service Not Supported
          throw error.create({
            name: TITLE,
            message: 'Service ' + service + ' is unsupported!!'
          });
        }

        return CONFIG[service];
      } catch (err) {
        log.error(TITLE + '.error', err.message);
      }
    }

    exports = {
      getConfig: getConfig
    };

    return exports;
  });
