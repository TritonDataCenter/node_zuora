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

// TODO: Switch to use the node_soap library's lib/wsdl.js

var assert = require('assert');

///--- contants (DO NOT CHANGE)
// These should match what node-soap picks from the wsdl
var ns1 = 'zns';
var ns2 = 'ons';

// fields to wrap in cdata  (use lower-case)
var userFields = [
  'accountid',
  'address1',
  'address2',
  'city',
  'postalcode',
  'country',
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
 * Create a simple tag.
 *
 * used to wrap an 'xmlObject' in an action tag.
 * eg. <create><zns:Account><ons:xmlObjectFields../></zns:Account>
 *
 *  @param {string} action - one of the following: create, update, delete, etc
 *  @param {object} xmlObjects - a string of output from makeZobject
 */
var makeActionTag = function (action, xmlObject){
  assert(action, 'required action')
  assert(xmlObject, 'required xml snippet')
  var newline = '\n';
  return '<' + ns1 + ':' + action + '>' + newline +
    xmlObject + newline +
    '</' + ns1 + ':' + action + '>' + newline;
}

/**
 *  makes a zuora object
 *
 *  @param {string} type - a zObject type (eg. Account)
 *  @param {object} zObjects - the fields of the object
 */
var makeZobject = function (type, zObjects) {
  if (zObjects === undefined || zObjects === null) {
    return null;
  }
  if (typeof zObjects === 'string' || zObjects instanceof String) {
    return zObjects;
  }
  var result = '';
  var znstype = '';
  var element = '';
  var ns = '';

  if (type.toLowerCase() == 'request') {
    element = 'requests';
    ns = ns1;
  } else {
    element = 'zObjects';
    ns = ns1;
    znstype = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="' + ns2 + ':' + type + '"';
  }

  var fields = Object.keys(zObjects).map(function(field) {
    return tag(field, ns2, escapeUserFields(field, zObjects[field]));
  }).join('\n');

  result = tag(element, ns, fields, znstype);
  return result;
};

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
  newline = (val[0] === '<') ? '\n' : ''; // tags get their own line
  return '' +
    '<' + pre + name + att + '>' +
    newline + val + newline +
    '</' + pre + name + '>';
}

function convert (zObjectType, objects) {
  var xmlObjects;
  if (Array.isArray(objects)) {
    xmlObjects = objects.map(toXML).join('\n');
  }
  else {
    xmlObjects = toXML(objects);
  }
  function toXML(obj) {
    return makeZobject(zObjectType, obj);
  }
  return xmlObjects;
}

var cdata = function(str) {
  if (typeof str == 'string' && str.trim().length > 0)
    return "<![CDATA[" + str + "]]>";
}

/**
 * Escape user fields into XML
 *
 * 1. Wraps known user-entered fields in CDATA
 * 2. Writes Date objects to ISO format
 */
var escapeUserFields = function(field, value) {
  if (value instanceof Date) value = value.toISOString();
  if (userFields.indexOf(field.toLowerCase()) >= 0) {
    value = cdata(value);
  }
  return value;
}

/**
 * ZOQL string escaping.
 *
 * The ZOQL parser can be quite persnickety about quotes, spaces,
 * upper-case, and the < symbol.
 *
 * For example: < must become &lt;
 *
 * This assumes that quotes are already escaped like "name = 'Linda''s'"
 *
 * https://knowledgecenter.zuora.com/BC_Developers/SOAP_API/M_Zuora_Object_Query_Language/Export_ZOQL/A_Select_Statement
 */
function escapeZOQL (querystring) {
  if (querystring && querystring.length == 0) return querystring;
  function toLowerCase(match, keyword) {
    return keyword.toLowerCase();
  }
  var findKeywords = /\b(SELECT|FROM|WHERE|AND|OR)\b/ig;
  querystring = querystring.replace(findKeywords, toLowerCase);
  // snippet from github://vpulim/node_soap/lib/wsdl.js/xmlEscape()
  querystring = querystring
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  // XXX: test if having two spaces breaks their parser. ie. select  x from y
  // XXX: do we want to wrap this in cdata? because things like & in the
  //      data are invalid XML. eg. name = 'Jon & Roy'
  //return cdata(querystring);
  return querystring;
}

module.exports = {
  convert: convert,
  cdata: cdata,
  makeActionTag: makeActionTag,
  makeTag: tag,
  makeZobject: makeZobject,
  escapeZOQL: escapeZOQL,
  ns1: ns1,
  ns2: ns2
}
