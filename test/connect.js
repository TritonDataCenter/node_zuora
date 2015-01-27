var test = require('tape');
var zuora = require('../zuora');

test('connect: zuora soap api', function (t) {
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

test('connect:')
