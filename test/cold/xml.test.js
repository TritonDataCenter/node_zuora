
var test   = require('tape');
var xml    = require('../../lib/xml');
var config = require('../../etc/config.test.json')

test('xml: escapes ZOQL queries', function (t) {
  var testCount = 6;
  t.plan(testCount);

  var querystring = 'SeLECT  "trouble" from Account where AccountId = \'12\' and Value <= \'</END><IMPORT HACK=TRUE>\''

  var qs = xml.escapeZOQL(querystring);

  // check if using CDATA ... should we?
  t.true(qs.toLowerCase().match(/<!\[cdata/),'we choose use CDATA to escape queries');

  // we want lower-case
  t.ok(qs.match(/\bselect\b/), 'keywords must be lower-case')
  t.false(qs.match(/\b(?:SELECT|FROM|WHERE|AND|OR)\b/), 'keywords must be lower-case')
  // https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/M_Zuora_Object_Query_Language

  // check if contains the '<' character
  t.equal(qs.replace('<![', 'XX').indexOf('<'), -1, 'the < character cannot be in a query');

  // check if contains the '&lt;' character
  t.ok(qs.indexOf('&lt;') >= 0, 'all <\'s need to be escaped to &lt;');
  t.ok(qs.match('&lt;=', '<= should be &lt;='));

  // check for escaped quotes
  //t.ok(qs.match(' ""trouble"" '))
  //t.ok(qs.match(' \'\'12\'\''))

})

test.skip('xml: chunk big requests into smaller groups', function(t) {
})

