var VError = require('verror');

module.exports = {
  makeError:    makeError,
  capitalize:   capitalize
  uncapitalize: uncapitalize
}

function makeError(err) {
  var error;
  var message = '';
  var code = '';
  if (err.root) {
    message = err.root.Envelope.Body.Fault.faultstring;
    code    = err.root.Envelope.Body.Fault.faultcode;
    error = new VError(message)
    error.code = code;
  } else {
    error = new VError(err);
  }
  return error;
}

function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

function uncapitalize(s) {
  return s && s[0].toLowerCase() + s.slice(1);
}
