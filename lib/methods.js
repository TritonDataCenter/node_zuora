var xml = require('./xml');
var common = require('./common')
//var queue = require('./queue');

var debug = false;

module.exports = {
  //amend:     buildMethod('amend'),
  create:    buildMethod('create'),
  delete:    buildMethod('delete'),
  generate:  buildMethod('generate'),
  update:    buildMethod('update'),
}

function buildMethod(method) {
  return function create(client, zObjectType, objects, cb) {
    console.log('TODO: validate case-sensitive names & required fields')
    var xmlObjects = xml.convert(zObjectType, objects);
    var payload = xml.makeActionTag(method, xmlObjects);
    //console.log('sending xml:')
    //console.log(xmlObjects)

    // TODO: push request onto work queue:
    client.ZuoraService.Soap[method](payload, function(err, res, body) {
      if (debug) {
        console.log('Result---');
        console.dir(res);
        console.log('1--')
        console.log(client.lastMessage);
        console.log('2--')
        console.log(client.lastRequest);
        console.log('3--')
        console.log(client.lastResponse)
        console.log('4--')
        console.log(client.lastResponseHeaders)
        console.log('D--')
      }
      if (err) {
        console.log('err');
        console.log(err)
      }
      if (err) return cb(common.makeError(err));
      if (res.result[0].Success === false) {
        console.log('error while doing ' + method + ' on ..')
        // verror
      }
      cb(null, res);
    }, 12345); // 12345 is config.requestTimeout

  };
}
