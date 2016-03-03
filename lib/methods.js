'use strict';

/**
 * Methods that update zObjects
 *
 */
var xml             = require('./xml');
var log             = require('./logger');
var common          = require('./common');
var fmt             = require('util').format;
var assert          = require('assert');
var forEachParallel = require('vasync').forEachParallel;

// TODO: use zuora.describe() to build list of methods
// filter to only have those that use zObjects[]

module.exports = {
  amend:          buildMethod('amend'),
  billingPreview: buildMethod('billingPreview'),
  create:         buildMethod('create'),
  delete:         buildMethod('delete'),
  generate:       buildMethod('generate'),
  update:         buildMethod('update')
};

function lookupGroupSize(zObjectType, method) {
  var size = 50;
  // TODO: the zObjectType of billingPreview is not billingPreview
  if (zObjectType.toLowerCase() === 'request') {
    size = 20;
  } else if (method === 'create' && zObjectType.toLowerCase() === 'amendment') {
    size = 3;
  }
  return size;
}

function buildMethod(method) {
  return function methodRunner(client, zObjectType, objects, methodOptions, cb) {
    // TODO *maybe* check for case-sensitive names & required fields
    // TODO make a stream that outputs the results as they arrive

    if (typeof methodOptions === 'function') {
      cb = methodOptions;
      methodOptions = {};
    }
    assert.ok(zObjectType, fmt('method: %s missing required zObjects payload', method));
    assert.equal(typeof cb, 'function', 'callback must be a function');

    var onComplete = function(err, results) {
      // TODO:XXX tidy up results from vasync here
      var chunks = results && results.successes || [];
      if (results.nerrors > 0) {
        // retry / fail ?
        // check range of fails?
      }
      //if (chunks.length > 0) {
        require('util').inspect(chunks, 1);
        log.debug({chunks: chunks}, 'SOAP response');
      //}
      var newResult = Array.prototype.concat.apply([], chunks);
      cb(err, newResult);
    };

    var objectGroups;
    if (Array.isArray(objects)) {
      var groupSize = lookupGroupSize(zObjectType, method);
      objectGroups = common.chunk(objects, groupSize);
    } else {
      objectGroups = [objects];
    }

    function runMethod(objs, onDone) {
      var payload = xml.convert(method, objs, zObjectType);
      log.debug(payload, 'Payload to send');
      return client.runSoapMethod(method, payload, methodOptions, onDone);
    }

    forEachParallel({
      func:   runMethod,
      inputs: objectGroups
    }, onComplete);
  };
}
