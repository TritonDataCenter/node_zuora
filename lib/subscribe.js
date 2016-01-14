var log          = require('./logger');
var assert       = require('assert-plus');
var xml          = require('./xml');
var common       = require('./common');
var makeError    = require('./common').makeError;
var _            = require ('lodash');

'use strict';

/**
 * Query
 *
 * Runs a Zuora subscribe.
 *
 * @param {String} params      is a javascript representation of the XML to be sent for subscribe method
 * @param {Object} options     is a hash of options for Zuora methods
 *
 */
function subscribe (params, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  if (_.isObject(params) && !_.isArray(params)) {
    params = [params];
  }
  assert.equal(typeof cb, 'function', 'subscribe requires callback');
  assert.ok(params, 'subscribe is missing required content');
  assert.ok(params.constructor === Array || params instanceof Array, 'params must be an array');

  var onResponse = function(err, res, body) {
    common.printDebugMessages(client, err, res);

    if (err) {
      return cb(makeError(err, {
        lastRequest:  client.lastRequest,
        lastResponse: client.lastResponse
      }));
    }
    return cb(err, res);
  };

  assert.ok(this.client._client.ZuoraService.Soap, 'missing `ZuoraService.Soap` on client reference');
  var client = this.client;

  var payload = xml.convert('subscribe', {subscribes: params});
  log.debug(payload, 'Payload to send');
  return client.runSoapMethod('subscribe', payload, options, onResponse);
}

function attachSubscribe(xmasTree) {
  xmasTree.subscribe = subscribe;
  return xmasTree;
}

module.exports = attachSubscribe;
