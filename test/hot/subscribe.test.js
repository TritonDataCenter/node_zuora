'use strict';

var test  = require('tape');
var zuora  = require('../../zuora');
var config = require('../../etc/config.test.json');
var log    = require('../../lib/logger');

test.skip('subscribe: fail to create 1 account record', function (t) {
  t.plan(9);

  var fields = {
    'Account' : {
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
    }
  };

  zuora.connect(config, function(err, z) {
    t.ifError(err && err.message || err);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.subscribe(fields, function(err, result) {
      t.ifError(err && err.message || err);
      log.debug(z.client._client.lastRequest);
      log.debug(z.client._client.lastResponse);
      log.debug(result);
      t.ok(Array.isArray(result),           'result is an array');
      t.equal(result.length, 1,             'result has an array length of 1');
      t.ok(Array.isArray(result[0].Errors), 'result contains errors array');
      t.equal(result[0].Errors.length, 2,   'has only 2 result[].Errors[] record');
      t.equal(result[0].Errors[0].Code, 'MISSING_REQUIRED_VALUE', 'result includes error code');
      t.equal(result[0].Errors[1].Code, 'MISSING_REQUIRED_VALUE', 'result includes error code');
    });
  });
});

test('subscribe: create multiple entries with invalid values for subscription', function (t) {
  t.plan(8);
  var numRecords = 2;

  var payload = [];
  for (var i = 0; i < numRecords; i++) {
    payload.push({
        'Account': {
            'AccountNumber': i,
            'AutoPay': false,
            'Batch': 'this is gonna fail',
            'BillCycleDay': 1,
            'Currency': 'USD',
            'Name': 'John "test" Smith ' + i,
            'PaymentTerm': 'Due Upon Receipt',
            'SubAccounts__c': '',
            'UUIDLookUp__c': '',
            'Status': 'Draft'
        },
        'BillToContact': {
            'FirstName': 'John',
            'LastName': 'Smith'
        },
        'SubscriptionData': {
            'Subscription': {
                'Name': 'SubName'+i,
                'Status': 'Draft',
                'TermType': 'EVERGREEN'
            },
            'RatePlanData': [{
                'RatePlan': {
                    'ProductRatePlanId': '0123456789' + i
                }
            }]
        }
    });
  }
  t.equal(payload.length, numRecords);

  zuora.connect(config, function(err, z) {
    t.ifError(err && err.message || err);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.subscribe(payload, function(err, result) {
      t.ifError(err && err.message || err);
      log.debug(z.client._client.lastRequest);
      log.debug(z.client._client.lastResponse);
      t.equal(result.length, numRecords, 'Number of inputs must match number of outputs');
      t.equal(result[0].Success, false, 'Subscribe should fail');
      t.equal(result[0].Errors[0].Code, 'MISSING_REQUIRED_VALUE', 'Error object has code');
      t.ok(result[0].Errors[0].Message, 'Error object has message');
      t.end();
    }, {test: true});
  });
});
