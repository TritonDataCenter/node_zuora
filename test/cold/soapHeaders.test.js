/**
 */

var test = require('tape');

test('soapHeaders: can adjust existing login header', function (t) {
  t.plan(8);

  var soapHeaders = undefined;

  function addSoapHeader (xmlHeader) {
    if (!soapHeaders) {
      soapHeaders = [];
    }
    soapHeaders.push(xmlHeader);
  }

  var client = {
    addSoapHeader: addSoapHeader
  }

  function getSoapHeaders () {
    return soapHeaders;
  }

  function clearSoapHeaders () {
    SoapHeaders = null;
  }

  /**
   * Keep the first header up to date with a valid
   * session header
   */
  function setSessionHeader(session) {
    var headers = getSoapHeaders();

    // REMEMBER: session header must always be index 0
    if (headers && headers.length > 0) {
      client.addSoapHeader(session);
      headers[0] = headers[headers.length - 1];
      headers.length = headers.length - 1;
    } else {
      client.addSoapHeader(session)
    }
  }

  var magicXML = '<XML>magic</XML>';
  var newXML   = '<XML>new</XML>';
  setSessionHeader(magicXML)

  // updating 1 header
  t.equal(soapHeaders.length, 1);
  t.equal(soapHeaders[0], magicXML);
  setSessionHeader(newXML);
  t.equal(soapHeaders[0], newXML);
  t.equal(soapHeaders.length, 1);

  // updating when 2 headers
  addSoapHeader('extraHeader')
  t.equal(soapHeaders.length, 2);
  setSessionHeader(magicXML)
  t.equal(soapHeaders.length, 2);
  t.equal(soapHeaders[0], magicXML);
  t.equal(soapHeaders[1], 'extraHeader');

});
