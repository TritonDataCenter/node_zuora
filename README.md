node_zuora
==========

Node_zuora is a node.js client library for interacting with the Zuora
SOAP interface.

#### Disclaimer

This is library is unstable and can be considered an alpha release. Not all methods have been tested, and the client connection will not renew automatically when it expires.


## Installation

You probably want to install this package using npm

    npm install zuora-soap


## Configuration

You need to get your config setup like so:

You will need to [download your WSDL][1] file. Visit settings -> Z-Billing settings -> [Download WSDL][1].

Create an API user account. Visit settings -> Admin settings -> [Add single user][2]

Save the username and password of the API user with the path to your WSDL:

```json
    {
      "user":     "zuora_api_user@my_favourite.com",
      "password": "password123",
      "wsdl":     "./etc/zuora.a.64.0.wsdl",
      "verboseLog": false
    }
```

[1]: https://www.zuora.com/apps/Api.do
[2]: https://www.zuora.com/apps/UserLogin.do?method=edit&flag=1

## Usage

### Programmatic Usage

```javascript
    var zuora = require('zuora');

    var config = require('your_config.json');

    zuora.connect(config, function(err, z) {
        if (err) return console.log('Error connecting:', err);
        var contactDetails = {
             FirstName: 'Homer',
             LastName:  'Simpson',
             WorkEmail: 'Homer@TheSimpsons.tv'
        };
        z.contact.create(contactDetails, function(err, result) {
            if (err) return console.log(err.message);
        })
    });
```

[Object list](http://knowledgecenter.zuora.com/BC_Developers/SOAP_API/E1_SOAP_API_Object_Reference)

[Zuora API documentation](http://knowledgecenter.zuora.com/) for complete information:

Check out the source documentation for JSDocs on the API.

## License

MIT.

## Bugs

See <https://github.com/joyent/node_zuora/issues>.
