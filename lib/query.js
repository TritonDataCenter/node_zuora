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

  if (!client.hasQueryOptions) {
    var headers = {
      'QueryOptions': {
        'batchSize': options.batchSize || 0
      }
    }
    client.addSoapHeader(headers, '', xmlns1)
    client.hasQueryOptions = true;
  }

  var results; // TODO: create a stream for output

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

  // TODO: soap method response handler:
  //   - does it need to check HTTP status codes? ie not 200, or is 500
  //   - are results in 'result' or 'results'
  //   - is resp undefined? ..and error is also undefined?
  var onQueryResponse = function(err, resp, body) {
    console.log('TODO: query response -- handle DONE && QueryLocator ')
    // check for 'done'
    //   - https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/E_SOAP_API_Calls/queryMore_call
    //   if done == false , then more results
    //   is it ever true ?  dunno

    /*
    if (client.verbose) {
      log.info('query() HTTP statuscode: %s', resp.statusCode);
      log.info(client.lastRequest,         'query() lastRequest');
      log.info(client.lastResponseHeaders, 'query() lastResponseHeaders');
      log.info(client.lastResponse, 'query() lastResponseHeaders');
      log.info(body,                       'query() body');
    }
    */
    if (err) {
      return cb(makeError(err, {
        lastRequest:  client.lastRequest,
        lastResponse: client.lastResponse
      }));
    }
    if (resp.result) {
      // stream.push(resp.result)
      console.log(resp.result.done)
      if (resp.result.done) {
        console.log('it is a false boolean')
        stream.end()
      } else {
        queryMore(resp.result.queryLocator)
      }
    } else {
      // missing results
      return cb(new Error('Query results missing'))
    }
    //console.dir(resp.queryResponse)
    console.dir( Object.keys(resp.result) )
    return cb(null, resp.result || resp.results)


  }

  client.ZuoraService.Soap.query(zObject, onQueryResponse, requestOptions);

}

function attachQuery(xmasTree) {
  xmasTree.query = query;
  return xmasTree;
}

module.exports = attachQuery;
