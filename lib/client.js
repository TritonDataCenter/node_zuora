'use strict';

var soap   = require('soap');
var assert = require('assert-plus');
var log    = require('./logger');
var common = require('./common');
var extend = require('util')._extend;
//var verror = require('verror');
//var domain = require('domain');

// options for mikeal/Request.js
var requestOptions = {timeout: 10 * 60 * 1000};

var wrappedClient = {};

function setHeaderAtPosition(_client, xmlHeader, position) {
  if (!_client.getSoapHeaders()) {
    _client.addSoapHeader('<dummy></dummy>');
  }
  var headers = _client.getSoapHeaders();
  headers[position] = xmlHeader;
}

/**
 * Keep the first header up to date with a valid
 * session header
 */
function setSessionHeader(_client, session) {

  var header = {
    'SessionHeader': {
      'session': session
    }
  };
  var xmlHeader = _client.wsdl.objectToXML(header, '', 'zns');

  // REMEMBER: session header must always be index 0
  setHeaderAtPosition(_client, xmlHeader, 0);
}

/**
 * clear all options headers except for the session header
 */
function clearOptionHeaders() {
  var headers = this._client.getSoapHeaders();
  if (headers && headers.length > 1) headers.length = 1;
}

function addOptionsHeaders(headers) {
  var self = this;
  Object.keys(headers)
    .filter(function(key) {
      return key !== 'requestOptions';
    })
    .map(function(key) {
      var h = {};
      h[key] = headers[key];
      return h;
    })
    .forEach(function(header) {
      self._client.addSoapHeader(header, null, 'zns');
    });
}

var login = function(client, username, password, callback) {
  assert.ok(client, 'client is required for login');
  var credentials = {
    'username': username,
    'password': password
  };
  client.runSoapMethod('login', credentials, {requestOptions: requestOptions}, function(err, resp) {
    if (err) return callback(err);
    client.session = resp.Session;
    setSessionHeader(client._client, resp.Session);
    if (callback) callback(null, resp);
  });
};

/**
 * wraps callback in extra error handling logic
 */
function wrapCallback(callbackFn, attemptFn, activeDomain) {
  // TODO: wrap attemptFn && record number of attempts ?
  assert.equal(typeof callbackFn, 'function', 'wrapCallback is missing it\'s required callback');
  var cb = function onComplete() {
    if (activeDomain) activeDomain.exit();
    wrappedClient.clearOptionHeaders();
    callbackFn.apply(this, arguments);
  };
  function callbackWrapper(err, res) {
    common.printDebugMessages(wrappedClient._client, err, res);
    var self = this;
    if (err) {
      // TODO: Record number of retries
      // TODO: Add more reasons to retry

      if (err.code === 'INVALID_SESSION') {
        wrappedClient.startSession(function(err) {
          return err ? cb(err) : this.retry();
        });
      }
      var statusCode = (res && res.statusCode) || (err.response && err.response.statusCode);
      if (Number(statusCode) >= 500) {
        // TODO: sometimes 500 errors happen when zuora is too busy
        // add something to throttle back, wait & retry X amount of times

        // TODO: check headers to see if contents are XML
        //res.headers['content-type'] ~= 'text/html; charset=UTF-8'
        //return cb(new verror(err, 'ERROR HTTP ' + statusCode));

        // TODO: syntax errors are also 500 errors

        log.debug({
          statusCode:   statusCode,
          lastRequest:  wrappedClient._client.lastRequest,
          lastResponse: wrappedClient._client.lastResponse
        }, 'last request details');

      }
      if (Number(statusCode) === 429) {
        // TODO: sometimes 429 errors happen when customers exceed Zuora's rate limits
        // add something to throttle back, wait & retry X amount of times
        setTimeout(function() {
          self.retry();
        }, 15000);

        //return cb(new verror(err, 'ERROR HTTP ' + statusCode));
      }
      return cb(common.makeError(err));
    }
    // We only send res.result or results back
    // The `done` and `size` fields will be lost.
    var results = res.result || res.results;
    return cb(null, results, res);
  }
  return callbackWrapper.bind({retry: attemptFn});
}

/**
 * runSoapMethod - run a soap call
 *
 * @param payload objectOrXml is the object or xml to send
 * @param headers (optional) is extra soap headers, but it is also options to send to request.js
 * @param callback function
 *
 * add extra error handling around the standard soap methods
 */
function runSoapMethod(method, payload, headers, callback) {
  assert.ok(method,  'method name is required');
  assert.ok(payload, 'xml payload is required');
  if (typeof headers === 'function') {
    callback = headers;
    headers = {};
  }
  headers = headers || {};
  assert.ok(callback, 'missing callback');
  assert.equal(typeof callback, 'function', 'callback must be a function');

  var methodFn = this._client.ZuoraService.Soap[method];

  if (!methodFn) {
    return callback(new Error('WSDL is missing soap method for \'' + method + '\''));
  }

  var opts = extend({}, requestOptions);
  extend(opts, headers && headers.requestOptions);

  this.addOptionsHeaders(headers);

  var cb = false;

  var doRequest = function () {
    // TODO: record number of retry attempts for this function
    // TODO: stop at X
    methodFn(payload, cb, opts);
  };

  cb = wrapCallback(callback, doRequest);

  if (opts.test && method !== 'login') {
    methodFn = function dummy(payload, cb) {
      log.debug('Skipping ' + method + ' call.');
      if (cb) cb(null, 'Skipped because test mode');
    };
  }
  doRequest();

}

/**
 * Gets the basic zuora client setup
 * loads the wsdl and logs into the zuora endpoint
 */
var client = function(config, callback) {
  assert.object(config,          'config');
  assert.string(config.wsdl,     'config.wsdl');
  assert.string(config.user,     'config.user');
  assert.string(config.password, 'config.password');

  if (config.requestTimeout) {
    requestOptions.timeout = config.requestTimeout;
  }
  extend(requestOptions, config.requestOptions);

  var opts = {
    endpoint: config.endpoint
  };
  extend(opts, config.soapOptions);

  soap.createClient(config.wsdl, opts, function(err, _client) {
    if (err) {
      return callback && callback(common.makeError(err));
    }
    _client.verbose = !!config.verboseLog;
    if (_client.verbose) {
      log.level(log.bunyan.DEBUG);
    }
    _client._requestOptions = requestOptions;
    wrappedClient._client = _client;
    wrappedClient.runSoapMethod = runSoapMethod;
    wrappedClient.clearOptionHeaders = clearOptionHeaders;
    wrappedClient.addOptionsHeaders = addOptionsHeaders;
    wrappedClient.startSession = function(cb) {
      login(wrappedClient, config.user, config.password, function(err) {
        if (cb) return cb(err, err ? null : wrappedClient);
      });
    };

    wrappedClient.startSession(callback);
  });

  return wrappedClient;
};

module.exports = client;
