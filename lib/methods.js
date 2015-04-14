/**
 * Methods that update zObjects
 *
 */

var xml      = require('./xml');
var log      = require('./logger');
var common   = require('./common');
var forEachParallel = require('vasync').forEachParallel;

// TODO: use zuora.describe() to build list of methods
// filter to only have those that use zObjects[]

module.exports = {
  //amend:        buildMethod('amend'),
  billingPreview: buildMethod('billingPreview'),
  create:         buildMethod('create'),
  delete:         buildMethod('delete'),
  generate:       buildMethod('generate'),
  update:         buildMethod('update'),
};

function buildMethod(method) {
  return function methodRunner(client, zObjectType, objects, cb, requestOpts) {
    //console.log('TODO: *maybe* check for case-sensitive names & required fields')
    /**
    var xmlObjects = xml.convert(zObjectType, objects);
    var payload = xml.makeActionTag(method, xmlObjects);
    log.debug(payload, "Payload to send")
    return client.runSoapMethod(method, payload, cb);
    **/

    // make a callback that waits & gathers up the calls
    // and combines them
    // - OR -
    // make a stream that outputs the results as they arrive

    var onComplete = function(err, results) {
      // TODO: tidy up results here
      cb(err, results);
    }

    var objectGroups;
    if (Array.isArray(objects)) {
      var groupSize = lookupGroupSize(zObjectType);
      objectGroups = common.chunk(objects, groupSize);
    } else {
      objectGroups = [objects];
    }

    forEachParallel({
      func: runMethod,
      inputs: objectGroups
    }, onComplete);

    function runMethod(objs, onDone) {
      var xmlObjects = xml.convert(zObjectType, objs);
      var payload = xml.makeActionTag(method, xmlObjects);
      log.debug(payload, "Payload to send")
      return client.runSoapMethod(method, payload, onDone, requestOpts);
    }
  }
}

function lookupGroupSize(zObjectType) {
  var size = 50;
  // TODO: the zObjectType of billingPreview is not billingPreview
  if (zObjectType.toLowerCase() == 'request') {
    size = 20;
  }
  return size;
}
