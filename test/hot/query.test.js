'use strict';
var test   = require('tape');
var zuora  = require('../../zuora');
var config = require('../../etc/config.test.json');
var log    = require('../../lib/logger');

test.skip('query: uses queryMore to do multiple pages of results');
test.skip('query: adjust batchsize to 50 using QueryOptions.batchSize header');
test.skip('query: returns a stream of results');

test('query: with ZOQL syntax error fault', function (t) {
  t.plan(4);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');
    var zquery = 'select * from accountsX';
    z.query(zquery, function(err, result) {
      t.equal(err.message, 'You have an error in your ZOQL syntax');
      t.equal(err.code, 'MALFORMED_QUERY', 'Expect err.code == malformed query');
      t.notOk(result, 'Result should be empty');
      t.end();
    });
  });

});

test.skip('query: times out gracefully with adjustable timer per query', function (t) {
  t.plan(4);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');
    var zquery = 'select id from invoiceitem';
    var msClockStartAt = Date.now();
    var msWait = 200;
    z.query(zquery, {requestOptions: {timeout: msWait}}, function(err, result) {
      t.equals(err.message, 'ETIMEDOUT', 'expects ETIMEDOUT error');
      t.notOk(result, 'Result should be empty');
      var msClockEndAt = Date.now();
      var duration = msClockEndAt - msClockStartAt;
      t.ok(duration < msWait + 30, 'can time out sooner than default');
    });
  });

});

/**
 * Busted. The login() request stops before we start the query() request
 */
test.skip('query: times out gracefully with adjustable timer using client default', function (t) {
  t.plan(4);

  var msWait = 5000; // large enough to succeed
  config.requestTimeout = msWait;
  zuora.connect(config, function(err, z) {
    if (err) {
      if (err.message === 'ETIMEDOUT') {
        t.fail('Login() should not timeout unless timer is set too short');
      }
      return t.ifError(err.message);
    }

    t.ok(z, 'connect() should return a zuora client');
    msWait = 70; // small enough to fail
    var zquery = 'select id from invoiceitem';
    var msClockStartAt = Date.now();
    z.query(zquery, {}, function(err, result) {
      t.equals(err.message, 'ETIMEDOUT', 'expects ETIMEDOUT error');
      t.notOk(result, 'result should be empty');
      var msClockEndAt = Date.now();
      var duration = msClockEndAt - msClockStartAt;
      t.ok(duration < msWait + 30, 'can time out sooner than default (took: ' + duration + ' ms)');
      t.end();
    });
  });

});

test('query: small size query of billRuns', function (t) {
  t.plan(3);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');
    var zquery = 'select id from billrun';
    z.query(zquery, function(err, result) {
      t.ifError(err);
      t.ok(result, 'should have a result');
      // t.equal(result[0].Success, false, 'Success should be false. ID is missing');
      t.end();
    });
  });

});

test('query: medium size request for account', function (t) {
  t.plan(3);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');
    var zquery = 'select id from account';
    z.query(zquery, function(err, result) {
      t.ifError(err);
      t.ok(result, 'should have a result');
//      t.equal(result[0].Success, false, 'Success should be false. ID is missing');
      t.end();
    });
  });

});

/**
 * Steps to run this test:
 * 0. remove the .skip below
 * 1. set zuora session timeout to 15 minutes
 * 2. run this until completion (takes 16 minutes)
 *
 * 3. set zuora session timeout back to something huge.
 */
test.skip('query: survives session timesouts', function(t) {
  t.plan(2);
  var q = 0;
  var maxAttempts = 17;
  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');

    function doQuery () {
      q++;
      var zquery = 'select id from account';
      z.query(zquery, function(err, result) {
        if (err) return t.ifError(err);
        if (q <= maxAttempts) {
          setTimeout(doQuery, 60 * 1000);
        } else {
          t.ok(q > maxAttempts, 'must complete all attempts');
          t.equal(result[0].Success, false, 'Success should be false. ID is missing');
          t.end();
        }
      });
    }
    doQuery();
  });
});

test('query: can use double-quotes', function(t) {
  t.plan(2);
  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');

    var zquery = 'select accountnumber from account where status = "Active"';
    z.query(zquery, function(err, result) {
      log.debug(z.client._client.lastRequest);
      if (err) return t.ifError(err);
      t.ok(Array.isArray(result), 'expect valid empty results');
      t.end();
    });
  });
});

test('query: can use double-quotes with inner apostrophy', function(t) {
  t.plan(2);
  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');

    var zquery = 'select accountnumber from account where name = "bob\\\'s burgers"';
    z.query(zquery, function(err, result) {
      log.debug( z.client._client.lastRequest );
      if (err) return t.ifError(err);
      t.ok(Array.isArray(result), 'expect valid empty results');
      t.end();
    });
  });
});

test('query: can use single-quotes with inner apostrophy', function(t) {
  t.plan(2);
  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');

    // DESIRED QUERY XML: ..where name = &apos;bob\\&apos;s burgers&apos;
    var zquery = "select accountnumber from account where name = 'bob\\'s burgers'"; //eslint-disable-line quotes
    z.query(zquery, function(err, result) {
      log.debug( z.client._client.lastRequest );
      if (err) return t.ifError(err);
      t.ok(Array.isArray(result), 'expect valid empty results');
      t.end();
    });
  });
});
