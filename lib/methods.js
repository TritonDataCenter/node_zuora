var xml = require('./xml');
var common = require('./common')
//var queue = require('./queue');

var debug = true;

module.exports = {
  //amend:     buildMethod('amend'),
  billingPreview:    buildMethod('billingPreview'),
  create:    buildMethod('create'),
  delete:    buildMethod('delete'),
  generate:  buildMethod('generate'),
  update:    buildMethod('update'),
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
      // Theory the callback function() is sneakily optimized. V8 rocks.
      client.ZuoraService.Soap[method](payload, function(err, res, body) {
        if (client.verbose) {
          console.log('\nResult --');
          console.log('\nlastMessage --')
          console.log(client.lastMessage);
          console.log('\nlastRequest --')
          console.log(client.lastRequest);
          console.log('\nlastResponseHeaders --')
          console.log(client.lastResponseHeaders)
          console.log('\nlastResponse --')
          console.log(client.lastResponse)
          if (err) {
            console.log('\nerr --');
            console.log(err.message)
          } else {
            console.log('Result[] --')
            console.dir(res.result);
            console.log('Results[] --')
            console.dir(res.results);
          }
          console.log('\nResult END --\n')
        }
        if (err) return cb(common.makeError(err));
        var results = res.result || res.results;
        return cb(null, results);
      }, 12345); // TODO: 12345 should be config.requestTimeout
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
