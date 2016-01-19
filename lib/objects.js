var methods = require('./methods');
var common  = require('./common');
// TODO: read this objectList from WSDL
var objectList = require('./objectList');

/**
 * Creates a ZObject with the create, update, delete, query methods.
 *
 */
function ZObject(client, name, supportedMethods) {
  this._client = client;
  this._name   = common.capitalize(name);

  var self = this;

  if (!supportedMethods) {
    supportedMethods = Object.keys(methods); // default to all methods  TODO:wsdl
  }

  if (supportedMethods && Array.isArray(supportedMethods) && supportedMethods.length > 0) {
    supportedMethods.forEach(function (method) {
      // This is exposed as z.object.methodFn(..):
      self[method] = function(zObjects, methodOptions, cb) {
        if (!methods[method]) return cb(new Error(method + ' is unimplemented in zuora-soap'));
        methods[method](client, this._name, zObjects, methodOptions, cb);
      };
    }, {});
  }

  return self;
}

/**
 *  returns an object with all the known zuora zobjects as properties
 *
 *  @param {} client    reference to soap client
 *  @param {} xmasTree  object to decorate wtih zobjects (optional)
 */
function buildObjects (client, xmasTree) {
  xmasTree = xmasTree || {};
  return objectList.reduce(function (result, obj) {
    var objName = common.uncapitalize(obj.name);
    result[objName] = new ZObject(client, obj.name, obj.methods);
    return result;
  }, xmasTree);
}

module.exports = buildObjects;
