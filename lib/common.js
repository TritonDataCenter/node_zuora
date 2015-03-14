var VError = require('verror');
var log    = require('./logger');

module.exports = {
  makeError:    makeError,
  capitalize:   capitalize,
  uncapitalize: uncapitalize
}

/**
 * Extracts error code and message from most Zuora error types
 *
 * These are HTTP and SOAP related errors, and not error results
 * returned from the api. Example: 404s or 500s go here, but
 * "AccountId not found" go to results instead.
 *
 * https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/L_Error_Handling/Faults
 */
function makeError(err, extras) {
  var error = err;
  if (err.root) {
    error      = new VError(err.root.Envelope.Body.Fault.faultstring);
    error.name = Object.keys(err.root.Envelope.Body.Fault.detail);
    error.code = err.root.Envelope.Body.Fault.faultcode;
  }
  log.error(extras || {}, error.message)
  return error;
}

function printDebugMessages(client, err, res) {
  log.info('\n> BEGIN Soap Request and Response:');
  if (client) {
    log.info('\nlastMessage --')
    log.info(client.lastMessage);
    log.info('\nlastRequest --')
    log.info(client.lastRequest);
    log.info('\nlastResponseHeaders --')
    log.info(client.lastResponseHeaders)
    log.info('\nlastResponse --')
    log.info(client.lastResponse)
  }
  if (err) {
    log.info('\nerr --');
    log.info(err.message)
  } else {
    log.info('Result[] --')
    log.info(res.result);
    log.info('Results[] --')
    log.info(res.results);
  }
  log.info('\n> END Soap--\n')
}

function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

function uncapitalize(s) {
  return s && s[0].toLowerCase() + s.slice(1);
}

