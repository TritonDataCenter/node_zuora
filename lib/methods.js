var xml    = require('./xml');
var log    = require('./logger');
var common = require('./common');

// TODO: use zuora.describe() to build list of methods
// filter to only those use zObject[]

module.exports = {
  //amend:        buildMethod('amend'),
  billingPreview: buildMethod('billingPreview'),
  create:         buildMethod('create'),
  delete:         buildMethod('delete'),
  generate:       buildMethod('generate'),
  update:         buildMethod('update'),
};

function buildMethod(method) {
  // TODO: stop building 'fn' here, and make runSoapMethod better
  return function create(client, zObjectType, objects, cb) {
    //console.log('TODO: *maybe* check for case-sensitive names & required fields')
    var xmlObjects = xml.convert(zObjectType, objects);
    var payload = xml.makeActionTag(method, xmlObjects);

    if (client.verbose) {
      log.info("Payload to send:")
      log.info(payload);
    }

    return client.runSoapMethod(method, payload, cb);
  }
}
