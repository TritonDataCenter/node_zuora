var xml = require('./xml');
var common = require('./common')
//var queue = require('./queue');

var debug = false;

module.exports = {
  //amend:        buildMethod('amend'),
  billingPreview: buildMethod('billingPreview'),
  create:         buildMethod('create'),
  delete:         buildMethod('delete'),
  generate:       buildMethod('generate'),
  update:         buildMethod('update'),
}

function buildMethod(method) {
  return function create(client, zObjectType, objects, cb) {
    //console.log('TODO: validate case-sensitive names & required fields')
    var xmlObjects = xml.convert(zObjectType, objects);
    var payload = xml.makeActionTag(method, xmlObjects);
    //console.log('sending xml:')
    //console.log(xmlObjects)

    if (client.verbose) {
      console.log("Payload to send:")
      console.log(payload);
    }

    // TODO: push request onto work queue:
    try {
      // TODO: V8 doesn't optimize inside try-blocks. make this a function call
      // However, the callback function() is probably optimized. V8 rocks.
      // TODO: check that variable that shows if optimized...
      client.ZuoraService.Soap[method](payload, function(err, res, body) {
        if (client.verbose) {
          common.printFullResponse(client, err, res);
        }
        if (err) return cb(common.makeError(err));
        var results = res.result || res.results;
        return cb(null, results);
      }, client._requestOptions);
    } catch (e) {
      if (e.name === 'TypeError') {
        if (client.verbose) console.log(e.message);
        e.message += '\n\nHINT: check the WSDL version for ' + method + ' method'
        cb(e)
      } else {
        cb(e);
      }
    }

  };
}
