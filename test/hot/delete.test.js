'use strict';

var test   = require('tape');
var zuora  = require('../../zuora');
var config = require('../../etc/config.test.json');
//var log    = require('../../lib/logger');

//log.level(log.bunyan.DEBUG);

test.skip('destroy: sample test', function (t) {
  t.plan(4);

  var ids = [1, 2, 3, 4];

  zuora.connect(config, function(err, z) {
    t.ifError(err && err.message || err);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.account.delete(ids, function(err, result) {
      t.ifError(err && err.message || err);
      t.equal(result[0].Errors[0].Code, 'INVALID_VALUE', 'result includes error code');
      t.end();
    });
  });
});

