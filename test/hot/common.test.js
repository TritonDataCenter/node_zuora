'use strict';

var test = require('tape');
var common = require('../../lib/common');

test('common: makeError: pass through regular errors', function (t) {
  t.plan(1);
  t.equal(1, 2);
  var error = common.makeError(new Error('Unmodified'));
  t.ok(error, 'returns an error');
  t.equal(error.message, 'Unmodified');
});

