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

var assert = require('assert');
var common = require('./common');

///--- contants (DO NOT CHANGE)
// These should match what node-soap picks from the wsdl
var ns1 = 'zns';
var ns2 = 'ons';

// fields to wrap in cdata  (use lower-case)
var userFields = [
  'address1',
  'address2',
  'city',
  'postalcode',
  'firstname',
  'lastname',
  'workemail',
  'creditcardaddress1',
  'creditcardaddress2',
  'creditcardcity',
  'creditcardstate',
  'name'
];

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
  var val = value || '';
  var newline;
  newline = (val[0] === '<' && val.indexOf('<![CDATA[') !== 0) ? '\n' : ''; // tags get their own line
  return '' +
    '<' + pre + name + att + '>' +
    newline + val + newline +
    '</' + pre + name + '>';
};

var cdata = function(str) {
  if (common.isString(str) && str.trim().length > 0) {
    return '<![CDATA[' + str + ']]>';
  }
};

/**
 * Escape user fields into XML
 *
 * 1. Wraps known user-entered fields in CDATA
 * 2. Writes Date objects to ISO format
 */
var escapeUserFields = function(field, value) {
  if (value instanceof Date) {
    value = value.toISOString();
  }
  if (userFields.indexOf(field.toLowerCase()) >= 0) {
    value = cdata(value);
  }
  return value;
};

/**
 * make XML tags from keys
 *
 */

var xmlFromFieldList = function (zObject, ns) {
  if (common.isString(zObject)) return zObject;
  return Object.keys(zObject).map(function (field) {
    var znstype = '';
    ns = ns || ns1;

    if (field.toLowerCase() === 'rateplan' || field.toLowerCase() === 'rateplancharge') {
    ns = ns1;
    znstype = 'xsi:type="' + ns2 + ':' + field + '"';
    }
        
    if (field.toLowerCase() == 'amendments') {
    ns = ns1;
    }

    if (Array.isArray(zObject[field])) {
    return zObject[field].map(function (zObj) {
        return tag(field, ns, xmlFromFieldList(zObj, ns2));
    }).join('\n');
    } else if (typeof zObject[field] === 'object') {
    if (field.toLowerCase() === 'amendoptions'){
        return tag(field, ns, escapeUserFields(field, xmlFromFieldList(zObject[field], ns)), znstype);   
    } else {
        return tag(field, ns, escapeUserFields(field, xmlFromFieldList(zObject[field], ns2)), znstype);
    }
    } else {
        return tag(field, ns, escapeUserFields(field, zObject[field]));
    }
  }).join('\n');
};


/**
 * Create a simple tag.
 *
 * used to wrap an 'xmlObject' in an action tag.
 * eg. <create><zns:Account><ons:xmlObjectFields../></zns:Account>
 *
 *  @param {string} action - one of the following: create, update, delete, etc
 *  @param {object} xmlObjects - a string of output from makeZobject
 */
var makeActionTag = function (action, xmlObject){
  assert(action, 'required action');
  assert(xmlObject, 'required xml snippet');
  var newline = '\n';
  var wsdlDefinitionForAction = '';
  if (action.toLowerCase() === 'amend') {
    wsdlDefinitionForAction = ' xmlns:' + ns1 + '="http://api.zuora.com/"'
  }

  action = action + wsdlDefinitionForAction;  

  return '<' + ns1 + ':' + action + '>' + newline +
    xmlObject + newline +
    '</' + ns1 + ':' + action.replace(wsdlDefinitionForAction, '') + '>' + newline;
};

/**
 *  makes a zuora object
 *
 *  @param {string} type - a zObject type (eg. Account)
 *  @param {object} zObject - the fields of the object
 */
var makeZobject = function (type, zObject) {
  if (zObject === undefined || zObject === null) {
    return null;
  }
  if (common.isString(zObject)) {
    return zObject;
  }
  var result = '';
  var znstype = '';
  var element = '';
  var ns = '';

  if (type.toLowerCase() === 'request' || type.toLowerCase() === 'amendment') {
    element = 'requests';
    ns = ns1;
  } else {
    element = 'zObjects';
    ns = ns1;
    znstype = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="' + ns2 + ':' + type + '"';
  }

  var fields = xmlFromFieldList(zObject, ns2);

  result = tag(element, ns, fields, znstype);
  return result;
};


/**
 * make XML for deletes
 *
 * in: [{id: 123}, {id: 456}]
 * out: <zns:delete><zns:type>Contact</zns:type><zns:ids>123</zns:ids><zns:ids>456</zns:ids></zns:delete>
 */
var makeDeletePayload = function (zObjectType, zObjects) {
  if (common.isString(zObjects)) return zObjects;
  zObjects.unshift({type: zObjectType}); // TODO: clone array to avoid modifying original
  var swapIds = function(zObj) {
    if (!zObj.ids && !zObj.Ids) {
      if (zObj.id) { return {ids: zObj.id}; }
      if (zObj.Id) { return {ids: zObj.Id}; }
    }
    return zObj;
  };
  return zObjects.map(swapIds).map(function(zObj) {
    return xmlFromFieldList(zObj, ns1);
  }).join('\n');
};

function convert (zObjectType, objects) {
  function toXML(obj) {
    return makeZobject(zObjectType, obj);
  }
  var xmlObjects;
  if (Array.isArray(objects)) {
    xmlObjects = objects.map(toXML).join('\n');
  }
  else {
    xmlObjects = toXML(objects);
  }
  return xmlObjects;
}

/**
 * ZOQL keywords to lowercase.
 *
 * I thought the ZOQL docs said that keywords needed to be lowercase.
 * However, any case seems to work fine.
 */
function keywordsToLowercase(querystring) {
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
  cdata: cdata,
  makeActionTag: makeActionTag,
  makeTag: tag,
  makeZobject: makeZobject,
  makeDeletePayload: makeDeletePayload,
  escapeZOQL: escapeZOQL,
  ns1: ns1,
  ns2: ns2
};
