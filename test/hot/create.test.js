'use strict';

var test  = require('tape');
var zuora  = require('../../zuora');
var config = require('../../etc/config.test.json');
var log    = require('../../lib/logger');

//log.level(log.bunyan.DEBUG);

test('create: previewOptions', function(t) {
  t.plan(1);
  // https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/F_SOAP_API_Complex_Types/PreviewOptions
  t.ok('support previewOptions', 'nope');
  // TODO: support other xxxOptions too
});

test.skip('create: fail to make 1 account record', function (t) {
  t.plan(8);

  var fields = {
    'AccountNumber': '1234',
    'AutoPay': false,
    'Batch': 'this is gonna fail',
    'BillCycleDay': 1,
    'Currency': 'USD',
    'Name': 'John "test" Smith',
    'PaymentTerm': 'Due Upon Receipt',
    'SubAccounts__c': '',
    'UUIDLookUp__c': '',
    'Status': 'Draft'
  };

  zuora.connect(config, function(err, z) {
    t.ifError(err && err.message || err);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.account.create(fields, function(err, result) {
      t.ifError(err && err.message || err);
      log.debug(z.client._client.lastRequest);
      log.debug(z.client._client.lastResponse);
      log.debug(result);
      t.ok(Array.isArray(result),           'result is an array');
      t.equal(result.length, 1,             'result has an array length of 1');
      t.ok(Array.isArray(result[0].Errors), 'result contains errors array');
      t.equal(result[0].Errors.length, 1,   'has only 1 result[].Errors[] record');
      t.equal(result[0].Errors[0].Code, 'INVALID_VALUE', 'result includes error code');
    });
  });
});

test.skip('create: fail to make 2 account records', function (t) {
  t.plan(11);

  var fields = {
    'AccountNumber': '1234',
    'AutoPay': false,
    'Batch': 'this is gonna fail',
    'BillCycleDay': 1,
    'Currency': 'USD',
    'Name': 'John "test" Smith',
    'PaymentTerm': 'Due Upon Receipt',
    'SubAccounts__c': '',
    'UUIDLookUp__c': '',
    'Status': 'Draft'
  };

  var payload = [fields, fields];

  zuora.connect(config, function(err, z) {
    t.ifError(err && err.message || err);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.account.create(payload, function(err, result) {
      t.ifError(err && err.message || err);
      log.debug(z.client._client.lastRequest);
      log.debug(z.client._client.lastResponse);
      log.debug(result);
      t.ok(Array.isArray(result),           'result is an array');
      t.equal(result.length, 2,             'result has an array length of 1');
      // record 1
      t.ok(Array.isArray(result[0].Errors), 'result contains errors array');
      t.equal(result[0].Errors.length, 1,   'has only 1 result[].Errors[] record');
      t.equal(result[0].Errors[0].Code, 'INVALID_VALUE', 'result includes error code');
      // record 2
      t.ok(Array.isArray(result[1].Errors), 'result contains errors array');
      t.equal(result[1].Errors.length, 1,   'has only 1 result[].Errors[] record');
      t.equal(result[1].Errors[0].Code, 'INVALID_VALUE', 'result includes error code');
    });
  });
});


test.only('create many records in smaller chunks', function (t) {
  t.plan(3);
  var istest = true;
  var numRecords = 120;

  var record = {id: 123, name: 'dummy'};

  var payload = [];
  for (var i = 0; i < numRecords; i++) {
    payload.push(record);
  }

  zuora.connect(config, function(err, z) {
    t.ifError(err && err.message || err);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.account.create(payload, function(err, result) {
      t.ifError(err && err.message || err);
      log.debug(z.client._client.lastRequest);
      log.debug(z.client._client.lastResponse);
    }, {test: true});
  });
});

test.skip('create: can submit raw xml', function(t) {
  t.plan(1);
  var xml = '<zobject></zobject>';
  // xml should be missing the surrounding <create> tags
  t.fail('not tested yet - might work');
});
