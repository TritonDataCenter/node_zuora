/**
 * Logger
 * ======
 *
 * purpose: to create a single shared logger
 *
 * usage:
 *
 *   a. `require('logger')                  - defaults to a bunyan Logger
 *   b. `require('logger')(bunyanOpts)      - uses bunyan logger with bunyanOpts
 *   c. `require('logger').use(someLogger)` - use someLogger instead
 *
 * logger api:
 *
 *   https://github.com/trentm/node-bunyan
 *   functions; info, warn, error, trace, and maybe debug
 */

//var extend = require('util')._extend;

var bunyan;
try {
  bunyan = require('bunyan');
} catch (e) {
  console.warn('Warning: Bunyan logging is not installed.');
}

var defaults = {
  name: 'zuora'
}

var myLogger = {};
if (bunyan) {
  myLogger.reference = bunyan.createLogger(defaults)
} else {
  myLogger.reference = console;
}

function Emptiness (options) {
  //myLogger.reference = bunyan.createLogger(extend(defaults, options))
  this.use = function(someLogger) {
    if (bunyan && someLogger instanceof bunyan) {
      myLogger.reference = someLogger.child({module: 'zuora'});
    } else {
      myLogger.reference = someLogger;
    }
  }
}
Emptiness.prototype = myLogger.reference;

module.exports = new Emptiness;
