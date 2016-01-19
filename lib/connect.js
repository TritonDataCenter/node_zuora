var client      = require('./client');
var objects     = require('./objects');
var log         = require('./logger');
var query       = require('./query');
var subscribe   = require('./subscribe');
var exportQuery = require('./export_query');

function connect(config, cb) {
  log.create(config.logger);
  client(config, function(err, client) {
    if (err) return cb(err);
    var z = {};
    z.client = client;
    objects(client, z);
    query(z);
    subscribe(z);
    exportQuery(client, config, z);
    return cb(null, z);
  })
}

module.exports = connect;
