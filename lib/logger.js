/**
 * Logger
 * ======
 *
 * purpose: to create a single shared logger
 *
 * usage:
 *
 *   `require('logger')                   - returns the current Logger
 *
 *   `require('logger')(bunyanOpts)       - switch to a bunyan logger with bunyanOpts
 *   `require('logger').use(someLogger)`  - switch to someLogger instead.
 *                                        - note: bunyan loggers are turned into child loggers
 *
 * logger api:
 *
 *   https://github.com/trentm/node-bunyan
 *   functions; info, warn, error, trace, and maybe debug
 */

var extend = require('util')._extend;

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

function Emptiness () {
  var self = this;
  this.create = function(options) {
    if (options) myLogger.reference = bunyan.createLogger(extend(defaults, options))
    return self;
  };
  this.use = function(someLogger) {
    if (bunyan && someLogger instanceof bunyan) {
      myLogger.reference = someLogger.child({module: 'zuora'});
    } else {
      myLogger.reference = someLogger;
    }
    return self;
  }
}
Emptiness.prototype = myLogger.reference;

module.exports = new Emptiness;
