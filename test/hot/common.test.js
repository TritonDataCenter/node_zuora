var test = require('tape');
var common = require('../lib/common');

test('common: error response handler', function (t) {
  t.plan(1);

  var x = zuora.connect(config);
  t.equal(1, 2);

  //x.beep(function (err, res) {
    //t.equal(res, 'boop');
  //});
})

test('connect:')
