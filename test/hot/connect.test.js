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

// calling login again should renew the session
// if we can update the session headers
test.skip('connect: re-login when session expires', function(t) {
  t.plan(1);
  var config = require('../../etc/config.test.json')
  var z = zuora.connect(config);
  console.log('TODO: 1. simple query to verify connection')
  console.log('TODO: 2. wait for session to expire')
  console.log('TODO: 3. re-query to re-establish connection')
  
})
