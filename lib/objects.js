var methods = require('./methods');
var common  = require('./common');

// TODO: read this objectList from WSDL
var objectList = [
  {name: 'account', methods: ['subscribe', 'create', 'delete', 'update', 'query']},
  {name: 'accountingCode', methods: ['create', 'update', 'query']},
  {name: 'accountingPeriod', methods: ['create', 'update', 'query']},
  {name: 'amendment', methods: ['amend', 'create', 'delete', 'update', 'query']},
  {name: 'billRun', methods: ['create', 'delete', 'update', 'query']},
  {name: 'communicationProfile'},
  {name: 'contact'},
  {name: 'creditBalanceAdjustment'},
  {name: 'export', methods: ['create', 'query']},
  {name: 'feature', methods: ['create', 'delete', 'update', 'query']},
  {name: 'import'},
  {name: 'Invoice'},
  {name: 'InvoiceAdjustment'},
  {name: 'InvoiceFile'},
  {name: 'InvoiceItem'},
  {name: 'InvoiceItemAdjustment'},
  {name: 'InvoicePayment'},
  {name: 'InvoiceSplit'},
  {name: 'InvoiceSplitItem'},
  {name: 'Payment'},
  {name: 'PaymentMethod'},
  {name: 'PaymentMethodSnapshot', methods: ['query']},
  {name: 'Product'},
  {name: 'ProductFeature'},
  {name: 'ProductRatePlan'},
  {name: 'ProductRatePlanCharge'},
  {name: 'ProductRatePlanChargeTier'},
  {name: 'RatePlan'},
  {name: 'RatePlanCharge'},
  {name: 'RatePlanChargeTier'},
  {name: 'Refund'},
  {name: 'RefundInvoicePayment'},
  {name: 'Subscription', methods: ['amend', 'create', 'delete', 'update', 'query']},
  {name: 'SubscriptionProductFeature'},
  {name: 'TaxationItem'},
  {name: 'UnitOfMeasure'},
  {name: 'Usage'},
  {name: 'BillingPreviewRequest'}, //BillingPreviewRequest
  {name: 'Request'},               //BillingPreviewRequest
  {name: 'BillingPreviewRun', methods: ['create', 'query']}
];

/**
 * Creates a ZObject with the create, update, delete, query methods.
 *
 */
function ZObject(client, name, supportedMethods) {
  this._client = client;
  this._name   = common.capitalize(name);

  var self = this;

  if (!supportedMethods) {
    supportedMethods = Object.keys(methods); // default to all methods
  }

  if (supportedMethods && Array.isArray(supportedMethods) && supportedMethods.length > 0) {
    supportedMethods.forEach(function (method) {
      self[method] = function(zObjects, cb, opts) {
        if (!methods[method]) return cb(new Error(method + ' is unimplemented in zuora-soap'))
        methods[method](client, this._name, zObjects, cb, opts);
      }
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
};

module.exports = buildObjects;
