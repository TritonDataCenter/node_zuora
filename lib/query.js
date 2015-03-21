var log          = require('./logger')
var assert       = require('assert-plus')
var xmlns1       = require('./xml').ns1;
var escapeZOQL   = require('./xml').escapeZOQL;
var makeError    = require('./common').makeError;

/**
 * options:
 *   batchSize (default: 0 or 2000) sets the number of results returned per call by the client.
 *   timeout   (default: infinity) sets the time to wait for a single HTTP request
 *
 */
function query (querystring, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  assert.ok(this.client.ZuoraService.Soap, 'missing `ZuoraService.Soap` on client reference')
  var client = this.client;

  console.log( client.getSoapHeaders() );

  // TODO: dont need to attach this extra hasQueryOptions thing
  // can check the headers themselves ? unless is string
  if (!client.hasQueryOptions) {
    var headers = {
      'QueryOptions': {
        'batchSize': options.batchSize || 0
      }
    }
    client.addSoapHeader(headers, '', xmlns1)
    // another way?
    client.hasQueryOptions = true;
  }

  var results = []; // TODO: create a stream for output
  var resultStream;

  // options for request.js for 'timeout'
  var requestOptions;
  if (options.timeout) {
    requestOptions = {timeout: options.timeout};
  } else {
    requestOptions = client._requestOptions;
  }
  console.log(requestOptions);

  var zObject = {
    'queryString': escapeZOQL(querystring)
  };

  var add = function(result) {
    results.push.apply(results, result);
    // TODO: push onto stream
  }

  var onQueryResponse = function(err, resp, body) {
    // https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/E_SOAP_API_Calls/queryMore_call

    if (client.verbose) {
      common.printDebugMessages(client, err, res);
    }
    if (err) {
      return cb(makeError(err, {
        lastRequest:  client.lastRequest,
        lastResponse: client.lastResponse
      }));
    }
    if (resp.result) {
      // stream.push(resp.result)
      // stream.push(null) // end()
      add(resp.result.records);
      if (resp.result.done === true) {
        return cb(null, results)
      } else {
        //console.dir( Object.keys(resp.result) )
        //console.dir( resp.result.queryLocator )
        log.debug('Requesting ' + resp.result.queryLocator + ' of ' + resp.result.size)

        var zMorePls = {
          'queryLocator': resp.result.queryLocator
        };
        client.ZuoraService.Soap.queryMore(zMorePls, onQueryResponse, requestOptions);
      }
    } else {
      // missing results
      return cb(new Error('Query results missing'))
    }
  }

  // very similar to onQueryResponse
  // var onQueryMoreResponse = function(err, resp, body) {
  // }

  client.ZuoraService.Soap.query(zObject, onQueryResponse, requestOptions);

}

function attachQuery(xmasTree) {
  xmasTree.query = query;
  return xmasTree;
}

module.exports = attachQuery;
