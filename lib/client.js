var soap   = require("soap");
var assert = require('assert-plus');
var verror = require('verror');
var log    = require('./logger');
var common = require('./common');
var extend = require('util')._extend;
var domain = require('domain');

// options for mikeal/Request.js
var requestOptions = {timeout: 10 * 60 * 1000};

var wrappedClient = {};

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
    _client._requestOptions = requestOptions;
    wrappedClient._client = _client;
    wrappedClient.runSoapMethod = runSoapMethod;
    wrappedClient.startSession = (function(cb) {
      login(wrappedClient, config.user, config.password, function(err) {
        if (cb) return cb(err, wrappedClient);
      });
    }).bind(wrappedClient);
    wrappedClient.startSession(callback);
  });

  return wrappedClient;
};

var login = function(client, username, password, callback) {
  assert.ok(client, 'client is required for login')
  var credentials = {
    'username': username,
    'password': password
  }
  client.runSoapMethod('login', credentials, function(err, resp) {
    if (err) return callback(err);
    setSessionHeader(client._client, resp.Session);
    callback && callback(null, resp);
  }, requestOptions);
}

/**
 * Keep the first header up to date with a valid
 * session header
 */
function setSessionHeader(client, session) {
  var headers = client.getSoapHeaders();

  var header = {
    'SessionHeader': {
      'session': session
    }
  };
  var xmlHeader = client.wsdl.objectToXML(header, '', 'zns')

  // REMEMBER: session header must always be index 0
  if (headers && headers.length > 0) {
    headers[0] = xmlHeader;
  } else {
    client.addSoapHeader(xmlHeader)
  }
}

/**
 * runSoapMethod - run a soap call
 *
 * add extra error handling around the standard soap methods
 */
function runSoapMethod(method, payload, callback, _requestOptions) {

  assert.ok(method,  'method name is required')
  assert.ok(payload, 'xml payload is required')
  assert.ok(payload, 'missing callback')

  var methodFn = this._client.ZuoraService.Soap[method];

  if (!methodFn) {
    return callback(new Error('WSDL is missing soap method for \'' + method + '\''))
  }

  var opts = extend({}, requestOptions);
  extend(opts, _requestOptions);

  var doRequest = function () {
    methodFn(payload, cb, opts);
  }

  var requestDomain = domain.create();
  requestDomain.on('error', function(err) {
    requestDomain.exit();
    log.debug({
      lastRequest:  wrappedClient._client.lastRequest,
      lastResponse: wrappedClient._client.lastResponse
    }, 'last request details');
    callback(new verror(err, 'Error during request'))
  });
  var cb = wrapCallback(callback, doRequest, requestDomain);
  requestDomain.run(function() {
    doRequest();
  })
}

/**
 * wraps callback in extra error handling logic
 * and a domain to catch trickier exceptions
 */
function wrapCallback(_cb, attemptFn, activeDomain) {
  // TODO: wrap attemptFn && record number of attempts ?
  var cb = function onComplete() {
    if (activeDomain) activeDomain.exit();
    _cb.apply(this, arguments);
  }
  return (function callbackWrapper (err, res, body) {
    common.printDebugMessages(client, err, res);
    if (err) {
      // TODO: Record number of retries
      // TODO: Add more reasons to retry
      if (err.code == 'INVALID_SESSION') {
        wrappedClient.startSession(function(err) {
          return err ? cb(err) : this.retry();
        });
      }
      var statusCode = (res && res.statusCode) || (err.response && err.response.statusCode);
      if (Number(statusCode) >= 500) {
        // TODO: sometimes 500 errors happen when zuora is too busy
        // add something to throttle back, wait & retry X amount of times
        log.debug({
          statusCode:   statusCode,
          lastRequest:  wrappedClient._client.lastRequest,
          lastResponse: wrappedClient._client.lastResponse
        }, 'last request details');
        // TODO: check headers to see if contents are XML
        //res.headers['content-type'] ~= 'text/html; charset=UTF-8'
        return cb(new verror(err, 'ERROR HTTP ' + statusCode));
      }
      if (Number(statusCode) >= 400) {
        return cb(new verror(err, 'ERROR HTTP ' + statusCode));
      }
      return cb(common.makeError(err));
    }
    // XXX: we assume res.result or results will be the only things coming back
    var results = res.result || res.results;
    return cb(null, results, res);
  }).bind({retry: attemptFn})
}

module.exports = client;
