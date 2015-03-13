var test = require('tape');
var zuora = require('../zuora');

test('create: 1 record', function (t) {
  t.plan(1);

  var config = {
    user: 'x',
    password: 'y',
    url: '',
    wsdl: ''
  };

  var fields = {
    'AccountNumber': '1234',
    'AutoPay': false,
    'Batch': 'test_batch',
    'BillCycleDay': 1,
    'Currency': 'USD',
    'Name': 'John Smith',
    'PaymentTerm': 'Due Upon Receipt',
    'SubAccounts__c': '',
    'UUIDLookUp__c': '',
    'Status': 'Draft'
  };

  var x = zuora
    .connect(config)
    .then(zuora._xml.create(fields));

  t.equal(1, 2);

})

test('create 10 records', function (t) {
  t.plan(1);

  var config = {
    user: 'x',
    password: 'y',
    url: '',
    wsdl: ''
  };

  var x = zuora.connect(config);
  t.equal(1, 2);

  //x.beep(function (err, res) {
    //t.equal(res, 'boop');
  //});
})


test ('create 200 records in chunks of 50', function (t) {

})
