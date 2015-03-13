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

test('query: queries for data', function (t) {
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

test.skip('query: uses queryMore to do multiple pages of results');
test.skip('query: timesout')
test.skip('query: simple zoql')
