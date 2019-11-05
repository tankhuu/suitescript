/**
 * erply_api.js
 * Libraries for working with Erply API
 *
 * @exports XXX
 *
 * @copyright 2018
 * @author TanKhuu <jackiekhuu.work@gmail.com>
 *
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 * @NAmdConfig ./settings.json
 *
 */

define(['N/https', 'N/error', 'underscore', 'helpers'],
  function (https, error, _, helpers) {
    var governance = 0;
    var MODULE_NAME = 'ERPLY_API';

    function erplyAPI(eUrl, eClientCode, eUsername, ePassword) {
      // CONSTANTS
      var VERIFY_USER_FAILURE = 2001;
      var MISSING_PARAMETERS = 2004;
      var WEBREQUEST_ERROR = 2002;
      var LOGIN_FAILED = [1050, 1051, 1052];
      // Authentication information
      this.url = eUrl || '';
      this.clientCode = eClientCode || '';
      this.username = eUsername || '';
      this.password = ePassword || '';
      // Erply SessionKey
      this.EAPISessionKey = '';
      this.EAPISessionKeyExpires = 24;

      this.sendRequest = function (request, parameters) {
        var ERROR_NAME = MODULE_NAME + '.sendRequest';

        _.isEmpty(parameters) && (parameters = {});

        if (_.isEmpty(this.url) || _.isEmpty(this.url) || _.isEmpty(this.url) || _.isEmpty(this.url))
          throw error.create({
            name: ERROR_NAME,
            message: 'Missing Parameters',
            id: MISSING_PARAMETERS
          });
        // Add extra parameters
        parameters.request = request;
        parameters.clientCode = this.clientCode;
        parameters.version = '1.5.8';
        (request !== 'verifyUser') && (parameters.sessionKey = this.getSessionKey())

        // Create web request and and post data
        try {
          var responseData = [];
          var postHeaders = { ContentType: 'application/x-www-form-urlencoded' };
          var postData = helpers.createQueryString(parameters);
          // Request to Erply API
          var postResponse = https.post({ url: this.url + '?' + postData, headers: postHeaders, body: {} });
          // Calculate SuiteScript Governance
          governance += 10;

          // Handle Erply API Response
          if (!_.isEmpty(postResponse)) {
            var responseCode = Number(postResponse.code);
            var responseBody = JSON.parse(postResponse.body);
            if (responseCode === 200) {
              if (!_.isEmpty(responseBody)) {
                responseData = responseBody;
                return responseData;
              }
            } else {
              // Login Failed
              if (_.indexOf(LOGIN_FAILED, responseCode) !== -1)
                log.error(ERROR_NAME, 'Login to Erply API Failed.');
              // throw error.create({
              //   name: ERROR_NAME,
              //   message: 'Login to Erply API Failed.',
              //   id: responseCode
              // });
              // Other Errors
              log.error(ERROR_NAME, 'Request: ' + request + ' Failed.');
              // throw error.create({
              //   name: ERROR_NAME,
              //   message: 'Request: ' + request + ' Failed.',
              //   id: responseCode
              // });
            }
          }

          return responseData;
        } catch (err) {
          log.error(ERROR_NAME, err.message);
          // throw error.create({
          //   name: ERROR_NAME,
          //   message: err.message,
          //   id: WEBREQUEST_ERROR
          // });
        }
      }

      this.getSessionKey = function () {
        var ERROR_NAME = MODULE_NAME + '.getSessionKey';
        // If session key doesn't exists or expired.
        if (_.isEmpty(this.EAPISessionKey) ||
          this.EAPISessionKeyExpires === 0 ||
          this.EAPISessionKeyExpires < helpers.time()) {
          var result = this.sendRequest('verifyUser', { username: this.username, password: this.password });
          governance += 10;
          // log.debug(ERROR_NAME + '.result: ', result);

          // Handle Failure.
          var errorCode = Number(result.status.errorCode);
          if (errorCode !== 0) {
            this.EAPISessionKey = '';
            this.EAPISessionKeyExpires = 0;

            log.error(ERROR_NAME, 'Verify user failure.');
            // throw error.create({
            //   name: ERROR_NAME,
            //   message: 'Verify user failure.',
            //   id: VERIFY_USER_FAILURE
            // });
          }
          this.EAPISessionKey = result.records[0].sessionKey;
          this.EAPISessionKeyExpires = helpers.time() + Number(result.records[0].sessionLength) - 30;
        }
        return this.EAPISessionKey;
      }
    }

    function getGovernance() {
      return governance;
    }

    var exports = {
      erplyAPI: erplyAPI,
      getGovernance: getGovernance
    };

    return exports;
  });
