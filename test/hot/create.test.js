var test   = require('tape');
var zuora  = require('../../zuora');
var config = require('../../etc/config.test.json');

test('create: 1 record', function (t) {
  t.plan(4);

  var fields = {
    'AccountNumber': '1234',
    'AutoPay': false,
    'Batch': 'test_batch',
    'BillCycleDay': 1,
    'Currency': 'USD',
    'Name': 'John "test" Smith',
    'PaymentTerm': 'Due Upon Receipt',
    'SubAccounts__c': '',
    'UUIDLookUp__c': '',
    'Status': 'Draft'
  };

  zuora.connect(config, function(err, z) {
    t.ifError(err.message);
    t.ok(z, 'expect valid \'z\' client');
    if (err) return;
    z.account.create(fields, function(err, result) {
      t.ifError(err.message);
      t.equal(result, 'magic confirmation', 'result should be valid');
    });
  });
});

test.skip ('create 10 records', function (t) {
  t.plan(1);

  var x = zuora.connect(config);
  t.equal(1, 2);

  //x.beep(function (err, res) {
    //t.equal(res, 'boop');
  //});
})


test.skip ('create 200 records in chunks of 50', function (t) {

})
