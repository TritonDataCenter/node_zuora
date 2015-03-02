///--- naive xml object maker for zuora

// Zuora is fairly forgiving about XML details. The namespace is optional, and the field order
// can vary from the documentation.
//
// The capitalization matters. AccountId !== accountId

///--- contants (DO NOT CHANGE)
// These should match what node-soap picks from the wsdl
var ns1 = 'zns';
var ns2 = 'ons';

///--- example usage

// var accountId = '1';
// var address = {
//   street: 'street',
//   street2: 'street2',
//   city: 'van',
//   state: 'bc',
//   country: 'can'
// };
// var firstname = 'drew';
// var lastname = 'miller';
// var email = 'drew@joyent.com';
//
// var z = makeZobject('zns:Contact','ons', {
//   AccountId:  accountId,
//   Address1:   address.street,
//   Address2:   address.street2,
//   City:       address.city,
//   PostalCode: address.state,
//   Country:    address.country,
//   FirstName:  firstname,
//   LastName:   lastname,
//   WorkEmail:  email
// });
//
// console.log(z);


// fields to wrap in cdata
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
  return '<' + action + '>' + xmlObject + '</' + action + '>';
}

/**
 *  makes a zuora object
 *
 *  @param {string} type - a zObject type (eg. Account)
 *  @param {object} zObjects - the fields of the object
 */
var makeZobject = function (type, zObjects) {
  if (zObjects === undefined || zObjects === null){
    return null;
  }
  var result = '';
  var znstype = '';
  var element = '';

  if (type.toLowerCase() == 'request') {
    element = 'requests';
    ns = ns1;
  } else {
    element = 'zObjects';
    ns = ns2;
    znstype = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="' + ns2 + ':' + type + '"';
  }

  var fields = Object.keys(zObjects).map(function(field) {
    return tag(field, ns, escapeUserFields(field, zObjects[field]));
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
  //newline = ''; // XXX: maybe extra \n causes xml parsing problems? linda?
  return '' +
    '<' + pre + name + att + '>' +
    newline + val + newline +
    '</' + pre + name + '>';
}

function convert (zObjectType, objects) {
  var xmlObjects;
  if (Array.isArray(objects)) {
    console.log('TODO: BillingPreview only accepts upto 20 requests at a time')
    if (objects.length >= 50) {
      console.error('Too many objects passed to xml.js:convert()');
      console.error('TODO: chunk into groups of 50')
      process.exit(2)
    }
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
  var value = str;
  if (str && typeof str == 'String' && str.trim().length > 0) {
    value = "<![CDATA[" + str + "]]>";
  }
  return value;
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

module.exports = {
  convert: convert,
  cdata: cdata,
  makeActionTag: makeActionTag,
  makeTag: tag,
  makeZobject: makeZobject
}
