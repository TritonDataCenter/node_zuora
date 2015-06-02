'use strict';

/**
 *  Tests for things that are in lib/common.js
 */

var test = require('tape');
var common = require('../../lib/common');

test.skip('common: empty', function (t) {
  t.plan(0);
});

test('common: chunk large array into array of smaller ones', function(t) {
  t.plan(2);
  var chunkSize = 2;
  var a = [1, 2, 3, 4, 5, 6];
  var result = common.chunk(a, chunkSize);
  t.ok(a.length === 6, 'original array is untouched');
  t.ok(result.length === (Math.ceil(a.length / chunkSize)), 'expected number of chunks');
  t.end();
});

test('common: final smaller array contains the last item', function(t) {
  t.plan(5);
  var chunkSize = 2;
  var a = [1, 2, 3, 4, 5, 6];
  var result = common.chunk(a, chunkSize);
  t.ok(a.length === 6, 'original array is untouched');
  t.ok(result.length === (Math.ceil(a.length / chunkSize)), 'expected number of chunks');
  t.equal(result[2].length, chunkSize, 'last group should have ' + chunkSize + ' items');
  t.ok(result[2][1], 'last element must exist in array');
  t.equal(result[2][1], 6, 'last element must have correct value');
  t.end();
});

test('common: makeError: pass through regular errors', function (t) {
  t.plan(2);
  var error = common.makeError(new Error('Unmodified'));
  t.ok(error, 'returns an error');
  t.equal(error.message, 'Unmodified');
});

