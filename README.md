node_zuora
==========

Node_zuora is a node.js client library for interacting with the Zuora
SOAP interface.

#### Disclaimer

This is library is unstable and can be considered an alpha release. Some methods may still be unimplemented.


## Installation

You probably want to install this package using npm

    npm install zuora-soap


## Configuration

You will need to get your config setup as follows:

1. [Download your WSDL][1] file by visiting Settings -> Z-Billing settings -> [Download WSDL][1].

2. Create an API user account by visiting settings -> Admin settings -> [Add single user][2]
Disable [password expiry][3] for API accounts.

3. You may also want to adjust session timeout from the 15 minute default to something longer. Visit Settings -> Administrative Settings -> Security Policies

4. Save the username and password of the API user with the path to your WSDL:

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
[3]: http://knowledgecenter.zuora.com/kb/How_do_I_prevent_my_API_user_login_from_expiring%3F

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

Check out the source documentation for docs on the API.

## License

MIT.

## Contributions are welcome

See <https://github.com/joyent/node_zuora/issues>.
