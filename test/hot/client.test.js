'use strict';

var test   = require('tape');
var client = require('../../lib/client');
var config = require('../../etc/config.test.json');
var extend = require('util')._extend;

test('client: login fails with error on wsdl missing', function (t) {
  t.plan(2);

  var config = {
    user: 'x',
    password: 'y',
    url: '',
    wsdl: 'missing'
  };

  client(config, function(err, z) {
    t.equal(err.code, 'ENOENT', 'Missing wsdl file causes error');
    t.notOk(!!z, 'z is not returned');
    t.end();
  });

});

test('client: login fails with error on user/pass fail', function (t) {
  t.plan(3);
  var errMessage = 'Invalid login. User name and password do not match.';

  var _config = extend({}, config);
  _config.password = 'fail_please';
  client(_config, function(err, z) {
    t.equal(err.code, 'INVALID_VALUE', 'Invalid user/password returns error code');
    t.equal(err.message, errMessage, 'Invalid user/password returns error message');
    t.notOk(!!z, 'z is not returned');
    t.end();
  });

});

test('client: login succeeds with valid etc/config.test.json', function (t) {
  t.plan(2);

  client(config, function(err, z) {
    t.ifError(err);
    t.ok(z, 'client callback must receive a connection');
  });

});

test('client: startSession updates session header', function(t) {
  t.plan(8);
  client(config, function(err, z) {
    t.ifError(err, 'Unexpected error');
    t.ok(z, 'Returns a connected client');
    t.ok(z._client.getSoapHeaders(), 'Expect headers in an array');
    if (err) return t.end();
    var sessionHeader = z._client.getSoapHeaders()[0];
    z.startSession(function(err, client) {
      t.ifError(err, 'Unexpected error');
      t.ok(client, 'Expect a client reference');
      var newSessionHeader = z._client.getSoapHeaders()[0];
      t.ok(sessionHeader, 'original sessionHeader must be set');
      t.ok(newSessionHeader, 'updated sessionHeader must be set');
      t.notEqual(sessionHeader, newSessionHeader, 'session headers should update on re-login');
    });
  });
});

test('client: connection exposes methods & values', function(t) {
  t.plan(3);
  client(config, function(err, z) {
    t.ifError(err, 'Unexpected error');
    t.ok(z._client, 'has _client reference');
    t.ok(z.startSession, 'has startSession() method');
    //t.ok(z._verbose, 'has _verbose property');
    //t.ok(z._requestOptions, 'has _requestOptions property');
  });
});
