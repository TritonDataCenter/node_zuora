var log          = require('./logger')
var assert       = require('assert-plus')
var xmlns1       = require('./xml').ns1;
var escapeZOQL   = require('./xml').escapeZOQL;
var common       = require('./common');
var makeError    = require('./common').makeError;

/**
 * options:
 *   batchSize      - (default: 0 or 2000) sets the number of results returned per call by the client.
 *   caseSensitive  - sets if matching is case-sensitive
 *   fastQuery      - query read-only table
 *
 * from: https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/F_SOAP_API_Complex_Types/QueryOptions
 *
 * Also you can set query timeout locally via:
 *   timeout   (default: infinity) sets the time to wait for a single HTTP request or until OS closes socket
 *
 */
function query (querystring, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  assert.ok(this.client._client.ZuoraService.Soap, 'missing `ZuoraService.Soap` on client reference')
  var client = this.client;

  // TODO: change how we attach this extra hasQueryOptions thing
  // can check the headers themselves ? unless is string
  if (!client.hasQueryOptions) {
    var headers = {
      'QueryOptions': options
    }
    client._client.addSoapHeader(headers, '', xmlns1)
    client.hasQueryOptions = true;
  }

  var results = [];
  var resultStream; // TODO: create a stream for output

  // options for request.js for 'timeout'
  var requestOptions;
  if (options.timeout) {
    requestOptions = {timeout: options.timeout};
    options.timeout = null;
  } else {
    requestOptions = client._requestOptions;
  }

  var zObject = {
    'queryString': escapeZOQL(querystring)
  };

  var add = function(result) {
    results.push.apply(results, result);
    // resultStream.push() // TODO: push onto stream
  }

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
        log.debug('Next queryLocator is ' + res.queryLocator + ' of ' + res.size)

        var zMorePls = {
          'queryLocator': res.queryLocator
        };
        var doQueryMore = makeQueryMore(zMorePls);
        function makeQueryMore(zQueryLocator) {
          return function () {
            log.debug('Requesting with:\n' + JSON.stringify(zQueryLocator) );
            client.runSoapMethod('queryMore', zQueryLocator, onQueryResponse, requestOptions);
          }
        }
        doQueryMore();
      } else {
        return cb(null, results);
      }
    } else {
      return cb(new Error('Query results missing'));
    }
  }

  function doQuery() {
    client.runSoapMethod('query', zObject, onQueryResponse, requestOptions);
  }

  doQuery();


  function makeResponseHandler(Fn, xmlPayload, onResponse) {
    return function runFn() {
      var _onResponse = onResponse.bind({retry: runFn});
      // wrap in login
      Fn(xmlPayload, _onResponse, requestOptions);
    }
    runFn();
  }

}

function attachQuery(xmasTree) {
  xmasTree.query = query;
  return xmasTree;
}

module.exports = attachQuery;
