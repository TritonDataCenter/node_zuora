var log          = require('./logger');
var assert       = require('assert-plus');
var escapeZOQL   = require('./xml').escapeZOQL;
var common       = require('./common');
var makeError    = require('./common').makeError;

'use strict';

/**
 * Query
 *
 * Runs a Zuora ZOQL query.
 *
 * More on ZOQL is available here: https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/M_Zuora_Object_Query_Language
 *
 * @param {String} querystring is a ZOQL query string like 'select id from account where name = "Homer"'
 * @param {Object} options     is a hash of options for Zuora methods
 * @param {Function} cb        is a callback function to handle response (function(error, result){})
 *
 * queryOptions:
 *   batchSize      - (default: 0 or 2000) sets the number of results returned per call by the client.
 *   caseSensitive  - sets if matching is case-sensitive
 *   fastQuery      - query read-only table
 *   More info: https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/F_SOAP_API_Complex_Types/QueryOptions
 *
 * requestOptions:
 *   timeout   (default: infinity) sets the time to wait for a single HTTP request or until OS closes socket
 *   More info: https://github.com/request/request#requestoptions-callback
 *
 */
function query (querystring, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  assert.equal(typeof cb, 'function', 'query requires callback');
  assert.ok(querystring, 'query is missing required querystring');
  assert.ok(typeof querystring === 'string' || querystring instanceof String, 'querystring must be a string');

  assert.ok(this.client._client.ZuoraService.Soap, 'missing `ZuoraService.Soap` on client reference');
  var client = this.client;

  var results = [];
  var resultStream; // TODO: create a stream for output

  var zObject = {
    'queryString': escapeZOQL(querystring)
  };

  var add = function(result) {
    if (!result) { return; }
    result.map(removeAttributes);
    results.push.apply(results, result);
    // resultStream.push() // TODO: push onto stream
  };

  var onQueryResponse = function(err, res, body) {
    // https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/E_SOAP_API_Calls/queryMore_call

    common.printDebugMessages(client, err, res);

    if (err) {
      return cb(makeError(err, {
        lastRequest:  client.lastRequest,
        lastResponse: client.lastResponse
      }));
    }
    if (res) {
      add(res.records);
      if (!res.done) {
        log.debug('Next queryLocator is ' + res.queryLocator + ' of ' + res.size);

        var zMorePls = {
          'queryLocator': res.queryLocator
        };
        var doQueryMore = makeQueryMore(zMorePls);
        var makeQueryMore = function(zQueryLocator) {
          return function () {
            log.debug('Requesting with:\n' + JSON.stringify(zQueryLocator) );
            client.runSoapMethod('queryMore', zQueryLocator, options, onQueryResponse);
          };
        };
        doQueryMore();
      } else {
        return cb(null, results);
      }
    } else {
      return cb(new Error('Query results missing'));
    }
  };

  function doQuery() {
    client.runSoapMethod('query', zObject, options, onQueryResponse);
  }

  doQuery();

}

function attachQuery(xmasTree) {
  xmasTree.query = query;
  return xmasTree;
}

function removeAttributes(record) {
  delete record.attributes;
  return record;
}

module.exports = attachQuery;
