var test = require('tape');
var zuora = require(__dirname + '/../../zuora');
var config = require(__dirname + '/../../etc/config.test.json');

test.skip('query: with ZOQL syntax error fault', function (t) {
  t.plan(2);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client');
    var zquery = 'select * from accountsX';
    z.query(zquery, function(err, result) {
      t.equal(err.message, 'You have an error in your ZOQL syntax');
    });
  });

});

test.skip('query: times out gracefully with adjustable timer', function (t) {
  t.plan(2);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client')
    var zquery = 'select id from invoiceitem';
    z.query(zquery, function(err, result) {
      t.ifError(err);
      //if (err) return t.ifError(err.message);
      //console.log(result);
//      t.equal(result[0].Success, false, 'Success should be false. ID is missing');
    });
  });

});

test.skip('query: small size request for billRuns', function (t) {
  t.plan(2);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client')
    var zquery = 'select id from billrun';
    z.query(zquery, function(err, result) {
      t.ifError(err);
      //if (err) return t.ifError(err.message);
      console.dir(result);
//      t.equal(result[0].Success, false, 'Success should be false. ID is missing');
    });
  });

});

test('query: medium size request for account', function (t) {
  t.plan(2);

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    t.ok(z, 'connect() should return a zuora client')
    var zquery = 'select id from account';
    z.query(zquery, function(err, result) {
      t.ifError(err);
      //if (err) return t.ifError(err.message);
      console.dir(result);
//      t.equal(result[0].Success, false, 'Success should be false. ID is missing');
    });
  });

});
test.skip('query: uses queryMore to do multiple pages of results');
test.skip('query: adjust batchsize to 50 using QueryOptions.batchSize header');
test.skip('query: returns a stream of results')
test.skip('query: timesout')
test.skip('query: simple zoql')
