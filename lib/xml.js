/**
 * naive xml object maker for zuora
 *
 * Zuora is fairly forgiving about XML details. The namespace is optional, and the field order
 * can vary from the documentation.
 *
 * The capitalization matters. AccountId !== accountId
 *
 *
 * example usage:
 *
 * var zObj = makeZobject('zns:Contact','ons', {
 *   AccountId:  accountId,
 *   Address1:   address.street,
 *   Address2:   address.street2,
 *   City:       address.city,
 *   PostalCode: address.state,
 *   Country:    address.country,
 *   FirstName:  firstname,
 *   LastName:   lastname,
 *   WorkEmail:  email
 * });
 *
 */

'use strict';

// TODO: Switch to use the node_soap library's lib/wsdl.js

var _          = require('lodash');
var common     = require('./common');
var objectList = require('./objectList');

///--- contants (DO NOT CHANGE)
// These should match what node-soap picks from the wsdl
var ns1 = 'zns';
var ns2 = 'ons';

/**
 *  makes an XML tag.
 *
 *  @param {string} name - type of tag <NAME>
 *  @param {string} prefix - prefix of tag <PRE:name>
 *  @param {string} value - content inside tag brackets <name>VALUE</name>
 *  @param {string} attribs - attributes for a tag <name attr1=val1>..</name>
 */
var tag = function (name, prefix, value, attribs) {
  var pre = prefix ? prefix + ':' : '';
  var att = attribs ? ' ' + attribs : '';
  var val = _.isNull(value) || _.isUndefined(value) ? '' : value;
  var newline;
  newline = (val[0] === '<' && val.indexOf('<![CDATA[') !== 0) ? '\n' : ''; // tags get their own line
  return '' +
    '<' + pre + name + att + '>' +
    newline + val + newline +
    '</' + pre + name + '>';
};

/**
 * Escape string values into XML
 *
 * 1. Wraps string values in CDATA
 * 2. Writes Date objects to ISO format
 */
var escapeFields = function(value) {
  if (value instanceof Date) {
    value = value.toISOString();
  }
  if (common.isString(value) && value.trim().length > 0) {
    value = '<![CDATA[' + value + ']]>';
  }
  return value;
};

function convert (method, object, objectType) {
  var zObjectMethods = ['create', 'update', 'generate', 'subscribe'];
  var ns1Actions = ['delete', 'execute'];

  var encapsulate = function(key, obj) {
    var res = {};
    res[key] = obj;
    return res;
  };

  // Main function to transform object into XML.
  var toXml = function(obj, depth) {
    return _.join(_.map(obj, function(value, key) {
      var prefix, name, val, attributes;
      // If value is an array, manipulate it to generate a correct XML
      // Depth is not to be increased here due to the way we handle the array.
      if (_.isArray(value)) {
        return _.join(_.map(value, function(v) {
          var o = {};
          o[key] = v;
          return toXml(o, depth);
        }), '\n');
      } else {
        // If method is one of create, update or generate, handle zObject tags at 1st level
        // Some names from objectList are also end values sometimes (AccountingCode for instance), so do not replace if corresponding value is a string
        if (_.includes(zObjectMethods, method) && _.includes(_.map(objectList, function(obj) {return obj.name.toLowerCase();}), key.toLowerCase()) && !_.isString(value)) {
          if (depth === 1) {
            name = 'zObjects';
            prefix = ns1;
            attributes = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="' + ns2 + ':' + key + '"';
          } else {
            name = key;
            prefix = ns1;
            attributes = 'xsi:type="' + ns2 + ':' + key + '"';
          }
        } else {
          name = key;
        }
        // For actions delete and execute, all tags are using the ns1 prefix
        if (_.includes(ns1Actions, method)) {
          prefix = prefix || ns1;
        }

        // If value is an object, simply reapply toXml method to transform it to XML increasing depth
        if (_.isObject(value)) {
          prefix = prefix || ns1;
          val = toXml(value, ++depth);
        // Finally, the end value is escaped if a string, formatted if a date or otherwise returned as is
        } else {
          prefix = prefix || ns2;
          val = escapeFields(value);
        }
        var subscribeFields = [
          'Amount',
          'EffectiveDate',
          'ProcessPayments',
          'GenerateInvoice',
          'PaymentMethodId'
        ];

        if (method === 'subscribe' && subscribeFields.indexOf(key) >= 0) {
          prefix = ns1;
        }

        return tag(name, prefix, val, attributes);
      }
    }), '\n');
  };

  // Encapsulate object for methods requiring zObjects
  if (_.includes(zObjectMethods, method) && objectType) {
    object = encapsulate(objectType, object);
  }
  // Adapt object for delete object to keep backward compatibility
  if (method === 'delete') {
    object = {
      type: objectType,
      ids: _.map(object, function(obj) {
        return obj.id || obj.Id;
      })
    };
  }

  // Generate XML including the method
  return toXml(encapsulate(method, object), 0);
}

/**
 * ZOQL keywords to lowercase.
 *
 * I thought the ZOQL docs said that keywords needed to be lowercase.
 * However, any case seems to work fine.
 */
function keywordsToLowercase (querystring) {
  function toLowerCase(match, keyword) {
    return keyword.toLowerCase();
  }
  var findKeywords = /\b(SELECT|FROM|WHERE|AND|OR)\b/ig;
  return querystring.replace(findKeywords, toLowerCase);
}

/**
 * ZOQL string escaping.
 *
 * The ZOQL parser can be quite persnickety about quotes, spaces,
 * upper-case, and the < symbol.
 *
 * For example: < must become &lt;
 *
 * Node-soap will convert special characters like `'` into their escaped versions like `&apos;`.
 *
 *
 * This assumes that quotes are already escaped like '...name = "Linda\\\'s"'
 *
 * https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/M_Zuora_Object_Query_Language/Export_ZOQL/A_Select_Statement
 *
 * Supposedly, 'Export ZOQL' uses different rules. For example, use '' to escape ': https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/M_Zuora_Object_Query_Language/Export_ZOQL/A_Select_Statement
 */
function escapeZOQL (querystring) {
  if (querystring && querystring.length === 0) return querystring;

  querystring = keywordsToLowercase(querystring);

  // Find node-soap additional escapes here: github://vpulim/node_soap/lib/wsdl.js/xmlEscape()
  // For example, that is why <![cdata[ becomes &lt;[cdata

  // List of reserved & escaped characters:
  // https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/M_Zuora_Object_Query_Language/Filter_Statements
  querystring = querystring
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\'');
  return querystring;
}

module.exports = {
  convert: convert,
  escapeZOQL: escapeZOQL,
  ns1: ns1,
  ns2: ns2
};
