var VError = require('verror');
var log    = require('./logger');

module.exports = {
  makeError:          makeError,
  capitalize:         capitalize,
  uncapitalize:       uncapitalize,
  printDebugMessages: printDebugMessages
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
  var message = '';
  if (err.root) {
    message      = err.root.Envelope.Body.Fault.faultstring;
    message      = message.replace(/^unknown$/, 'Remote exception - see error.detail or client.lastMessage for remote stacktrace');
    error        = new VError(message);
    error.name   = Object.keys(err.root.Envelope.Body.Fault.detail).join('-').replace(/^Exception$/, 'Remote Exception');
    error.code   = err.root.Envelope.Body.Fault.faultcode.replace(/^\w+:/g, '');
    error.detail = err.root.Envelope.Body.Fault.detail.Exception || err.root.Envelope.Body.Fault.detail;
  }
  if (extras) {
    log.debug(extras, 'Extras for: ' + error.message)
  }
  return error;
}

function printDebugMessages(client, err, res) {
  client = client._client || client;
  if (client && !client.verbose) {
    return;
  }
  log.info('printDebugMessages() options.verbose==true');
  if (err) {
    log.warn(err);
  }
  if (client) {
    //log.info('lastMessage: \n%s', client.lastMessage);
    log.info('lastRequest:\n%s', client.lastRequest);
    //log.info('lastResponseHeaders: \n%s', JSON.stringify(client.lastResponseHeaders));
    log.debug('lastResponse: \n%s', client.lastResponse);
  }
  /*
  if (res) {
    log.info(res.result || res.results || res, 'Results')
  }
  */
}

function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

function uncapitalize(s) {
  return s && s[0].toLowerCase() + s.slice(1);
}

