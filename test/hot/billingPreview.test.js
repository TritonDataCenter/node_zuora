var test = require('tape');
var zuora = require('../../zuora');
var config = require('../../etc/config.test.json')

test('billingPreview: Returns an error message', function (t) {
  t.plan(4);

  // limits: 20 BillingPreviewRequest objects per call
  //
  // Returns: BillingPreviewResult complex type
  //
  // Expected faults or errors:
  //  - InvalidTypeFault
  //  - UnexpectedErrorFault
  //  - Unknown
  //
  //  Result may only contain Successes ..
  //    failures may request an extra call to get details

  var request = {
    AccountId: 1234,
    ChargeTypeToExclude: 'OneTime,Recurring',
    TargetDate: new Date(),
    IncludingEvergreenSubscription: 'false'
  }

  zuora.connect(config, function(err, z) {
    if (err) return t.ifError(err.message);
    // ZUORA FEEDBACK: zObject is 'request' not 'BillingPreviewRequest'
    // console.log ( Object.keys(z.request) )
    z.request.billingPreview(request, function(err, result) {
      /// Unhandled exception from Zuora:
      t.equal(err.name, 'Remote Exception', 'Exception expected');
      t.equal(err.message, 'Remote exception - see error.detail or client.lastMessage for remote stacktrace', 'Useless unknown message');
      t.equal(err.code, 'Server', 'ambiguous code is Server')
      t.ok(err.detail, 'error.detail should contain the useless java stacktrace')
      /// Expected failure:
      // t.equal(result[0].Success, false, 'Success should be false. ID is missing')
    })
  })

})

//test('connect:')
