var soap = require("soap");

var reqOptions = {timeout: config.requestTimeout || 2 * 60 * 1000};

var zuora_xml = require('./zuora_xlmish');

/**
 * Gets the basic zuora client setup
 * loads the wsdl and logs into the zuora endpoint
**/
var zuora_client = module.exports.zuora_client = function(existing_client, callback) {
  var err, client;

  // TODO see session expires soon and reconnect if needed
  if (existing_client &&
    existing_client !== undefined &&
    existing_client.ZuoraService !== undefined &&
    existing_client.ZuoraService.Soap !== undefined) {

    if (config.verboseLog) {
      console.log("Use the client which was passed in ...");
    }
    callback(err, existing_client);
  } else {
    if (existing_client) {
      console.log(JSON.stringify(existing_client.lastResponseHeaders, undefined, 2));
      console.trace("bogus client passed in here");
    }
    var opts = {
      endpoint: config.endpoint
    };
    soap.createClient(config.wsdl, opts, function(err, client) {
      if (err) {
        console.log("Err in createClient = ", err);
        callback(err, client);
      } else {
        client.ZuoraService.Soap.login({
          'username': config.user,
          'password': config.password
        }, function(err, resp) {
          if (config.verboseLog) {
            console.log("\n" + (new Date()));
            console.log("Sent:     " + client.lastRequest);
            console.log("Recieved: " + resp.body + "\n");
          }

          if (err) {
            console.log("Processing Error in Soap.login", err);
            callback(err, client);
          } else {
            //              console.log ("resp", resp);
            if (config.verboseLog) {
              console.log("\n" + (new Date()));
              console.log("Sent:     " + client.lastRequest);
              console.log("Recieved: " + resp.body + "\n");
            }
            var mysession = resp.result.Session;
            var serverUrl = resp.result.ServerUrl;
            var stuff = {
              'SessionHeader': {
                'session': mysession
              }
            };
            client.joyentsession = mysession; // for REST call
            client.addSoapHeader(stuff, '', 'zns');
            callback(err, client);
          }
        }, reqOptions);
      }
    });
  }
};

var zuora_response = function(err, client, resp, body, callback) {
  var result;

  // The resp object will only have result when life is good (http 200 status)
  // When life is bad then the full resp object is returned (no result item)
  if (resp === undefined) {
    err = "Response is undefined. Err = " + err;
  } else if (resp.result === undefined && resp.results === undefined) {
    err = "HTTP Status: " + resp.statusCode + " " + err + " " + body;
  } else {
    result = resp.result;
    if (!result) {
      result = resp.results;
    }
  }
  if (config.verboseLog) {
    console.log("\nNow: " + (new Date()));
    console.log("zuora_response: lastResponseHeaders", JSON.stringify(client.lastResponseHeaders, undefined, 2));
    console.log("Sent:                              ", client.lastRequest);
    console.log("Recieved:                          ", body + "\n");
  }

  callback(err, client, result, body);

}

var zuora_create = module.exports.zuora_create = function(existing_client, zObject, callback) {
  var xmlObject = zuora_xml.makeCUD('zns:create', zObject);
  // console.log("zuora_create: "+xmlObject);
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to create here |", err, "|");
      callback(err, client);
    } else {
      client.ZuoraService.Soap.create(xmlObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

var zuora_forecast = module.exports.zuora_forecast = function(existing_client, zObject, callback) {
  var xmlObject = zuora_xml.makeCUD('zns:forecast', zObject);
  // console.log("zuora_create: "+xmlObject);
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to forecast here |", err, "|");
      callback(err, client);
    } else {
      client.ZuoraService.Soap.forecast(xmlObject, function(err, resp, body) {

        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

var zuora_query = module.exports.zuora_query = function(existing_client, zObject, callback) {

  zuora_client(existing_client, function(err, client) {
    function soapQuery(timeoutId) {
      client.ZuoraService.Soap.query(zObject, function(err, resp, body) {
        clearTimeout(timeoutId);
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    };

    function watchDog() {
      console.trace("Query hung still waiting after 5 minutes ... giving up!!");
      // This is a give up situation so lets report the error and reset the soap client on the next try
      callback("Not able to query after 5 minutes", null);
    };

    if (err) {
      console.log("Byte me .... not able to query here |", err, "|");
      callback(err, client);
    } else {
      var timeoutId = setTimeout(watchDog, 5 * 60 * 1000);
      soapQuery(timeoutId);
    }
  });
};


var zuora_query_all = module.exports.zuora_query_all = function(existing_client, zObject, callback) {
  var fullResults;

  var getMore = function(results, client, cb) {
    var zMore = {
      'queryLocator': results.queryLocator
    };
    console.log("before QueryMore " + JSON.stringify(results.queryLocator));
    client.ZuoraService.Soap.queryMore(zMore, function(err, resp, body) {
      zuora_response(err, client, resp, body, function(err, client, results) {
        if (err) {
          return callback(err, client, fullResults);
        }
        for (item in results.records) {
          if (results.records[item]) {
            fullResults.records.push(results.records[item]);
          }
        }
        fullResults.done = results.done;
        // console.log("after queryMore "+JSON.stringify(fullResults.done));
        if (fullResults.done !== true) {
          getMore(results, client, cb);
        } else {
          cb(null);
        }
      });
    }, reqOptions);

  };

  zuora_client(existing_client, function(err, client) {
    if (client.joyentadded == undefined) {
      console.log("Added queryoptions");
      var stuff = {
        'QueryOptions': {
          'batchSize': config.query_limit
        }
      };
      client.addSoapHeader(stuff, '', 'zns');
      client["joyentadded"] = true;
    }

    if (err) {
      console.log("Byte me .... not able to query here |", err, "|");
      callback(err, client);
    } else {
      client.ZuoraService.Soap.query(zObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, function(err, client, results, body) {
          if (err) {
            console.log(require('util').inspect(err, {
              depth: 5
            }));
            return callback(err, client);
          }
          // results.done results.size results.records
          //console.log(util.inspect(results, false, 2, true));
          fullResults = results;
          if (fullResults.done === true) {
            return callback(err, client, fullResults, body);
          } else {
            console.log("before getMore");
            getMore(results, client, function(err) {
              console.log("we are all done from getMore: err " + err);
              if (fullResults.done === true) {
                return callback(err, client, fullResults, body);
              }
            });
          }
        });
      }, reqOptions);
    }
  });
};

var zuora_update = module.exports.zuora_update = function(existing_client, zObject, callback) {
  var xmlObject = zuora_xml.makeCUD('zns:update', zObject);
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to update here ", err);
      callback(err, client);
    } else {
      client.ZuoraService.Soap.update(xmlObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

var zuora_delete = module.exports.zuora_delete = function(existing_client, zObject, callback) {
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to delete here ", err);
      callback(err, client);
    } else {
      client.ZuoraService.Soap.delete(zObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

var zuora_execute = module.exports.zuora_execute = function(existing_client, zObject, callback) {
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to execute here ", err);
      callback(err, client);
    } else {
      client.ZuoraService.Soap.execute(zObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

//  TODO add the following actions:
//  subscribe, generate, queryMore, getUserInfo, amend
//
var zuora_subscribe = module.exports.zuora_subscribe = function(existing_client, zObject, callback) {
  var xmlObject = zuora_xml.makeCUD('zns:subscribe', zObject);
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to query here |", err, "|");
      callback(err, client);
    } else {
      client.ZuoraService.Soap.subscribe(xmlObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

var zuora_amend = module.exports.zuora_amend = function(existing_client, zObject, callback) {
  var xmlObject = zuora_xml.makeCUD('zns:amend', zObject);
  zuora_client(existing_client, function(err, client) {
    if (err) {
      console.log("Byte me .... not able to amend here |", err, "|");
      callback(err, client);
    } else {
      client.ZuoraService.Soap.amend(xmlObject, function(err, resp, body) {
        zuora_response(err, client, resp, body, callback);
      }, reqOptions);
    }
  });
};

var zuora_sendfile = module.exports.zuora_sendfile = function(existing_client, filename, callback) {
  //TODO need to check to see if content > 4MB if so zip it up
  zuora_client(existing_client, function(err, client) {
    var content = fs.readFileSync(filename).toString("base64");
    // TODO:dm this zObject with multiple namespaces may need zuora_xml.makeCUD('zns:Import', zObject);
    var zObject = {
      'zns:Import': {
        'ons:FileContent': content,
        'ons:ImportType': 'Usage'
      }
    };
    zuora_create(client, zObject, callback);
  });
};

var cdata = function(str) {
  var value = str;
  if (str && str.trim() !== "") {
    value = "<![CDATA[" + str + "]]>";
  }
  return value;
}

var test_err_results = module.exports.test_err_results = function(err, label, values, results) {

  if (err ||
    (!results) ||
    (!results[0]) ||
    results[0].Success == false ||
    (results[0].Success && results[0].Success[0] == false) ||
    results[0].success == false ||
    (results[0].success && results[0].success[0] == false)) {
    console.log("Byte me failed in ", label);
    console.log("err: >|" + err + "|<");
    console.log("Here are the values sent: ", JSON.stringify(values, undefined, 2));
    console.log("Here is the result: " + JSON.stringify(results, undefined, 1));
    pull_err_from_results(results);
    console.log("test_err_results = false");
    return false;
  } else {
    //console.log("Happy happy results: "+ JSON.stringify(results, undefined, 2));
    return true;
  }
};

var create_active_account = module.exports.create_active_account = function(account_number, existing_client, values, callback) {
  var error_list = [];
  var zAccount = make_account(values.companyName, account_number);
  zuora_create(existing_client, zuora_xml.makeZobject('zns:Account', 'ons', zAccount), function(err, client, results) {
    if (test_err_results(err, 'create zAccount', zAccount, results)) {
      var accountID = results[0].Id;
      var zPayment = make_cc_payment_method(accountID, values.payment.address, values.payment.firstname + ' ' + values.payment.lastname, values.payment.ccnum, values.payment.cctype, values.payment.expmonth, values.payment.expyear, values.payment.ccv);
      //TODO need to not put the CC number in the log file here.. it is getting in there from echoing out the last SOAP message 
      zuora_create(client, zuora_xml.makeZobject('zns:PaymentMethod', 'ons', zPayment), function(err, client, result) {

        if (test_err_results(err, 'create zPayment', zPayment, result)) {
          var paymentMethodId = result[0].Id;
          //TODO only make two contacts if they are really different people
          var zContact = make_contact(accountID, values.contact.address, values.contact.firstname, values.contact.lastname, values.contact.email);
          zuora_create(client, zuora_xml.makeZobject('zns:Contact', 'ons', zContact), function(err, client, result) {
            if (test_err_results(err, 'create zContact', zContact, result)) {
              var contactID = result[0].Id;
              var zSoldContact = make_contact(accountID, values.payment.address, values.payment.firstname, values.payment.lastname, values.contact.email);
              zuora_create(client, zuora_xml.makeZobject('zns:Contact', 'ons', zSoldContact), function(err, client, result) {
                if (test_err_results(err, 'create zContact', zContact, result)) {
                  var soldContactID = result[0].Id;
                  var zUpdate = make_update_account(accountID, contactID, soldContactID, paymentMethodId, 'Active');
                  zuora_update(client, zuora_xml.makeZobject('zns:Account', 'ons', zUpdate), function(err, client, result) {
                    if (!test_err_results(err, "Update Account", zUpdate, result)) {
                      err += " account not made active"
                    }
                    return callback(err, client, accountID);
                  });
                } else {
                  test_err_results(result)
                  return callback(err, client, null);
                }
              });
            } else {
              test_err_results(result)
              return callback(err, client, null);
            }
          });
        } else {
          test_err_results(result)
          return callback(err, client, null);
        }
      });
    } else {
      test_err_results(results)
      return callback(err, client, null);
    }
  });

};

var getNextSubNumber = module.exports.getNextSubNumber = function(subNum, client, callback) {
  //This is a callback as we really should be quering zuora to make sure it is ok
  var num = 1;
  var str = subNum;
  if (subNum.length > config.uuid_length) {
    var items = subNum.split("-");
    var index = items.length - 1;
    num = parseInt(items[index]) + 1;
    items.splice(-1, 1);
    str = items.join("-");
  }
  var retVal = str + "-" + num;
  console.log("getNextSubNumber before : " + subNum + " SubNum : " + retVal);
  callback(null, retVal, client);
};

var endSubscription = module.exports.endSubscription = function(subscriptionNumber, endTime, client, callback) {
  // We are adding two days to the end date just to make sure we get all of the usage posted.
  var adjustedEndTime = moment(endTime).utc().add('days', 1);
  var endStr = adjustedEndTime.utc().format("YYYY-MM-DDTHH:mm:ss");
  console.log("End Sub " + endTime + " new end time " + endStr);

  get_first_active_subscription(subscriptionNumber, client, function(err, client, sub_id, account_id, datasetname, numFound) {
    if (err || numFound == undefined) {
      if (err) {
        err = err + " account_id undefined ";
      } else {
        err = "endSubscription account_id undefined, subscription not ended ";
      }
      return callback(err, client);
    }
    if (numFound == 0) {
      console.log("endSubscription: Subscription already ended ",subscriptionNumber);
      return callback (null, client);
    } else {

      console.log(" Sub: " + subscriptionNumber + " is on account_id " + account_id);
      var name = 'End Subscription';
      var values = {
        'Name': name,
        'Type': 'Cancellation',
        'SubscriptionId': sub_id,
        'ContractEffectiveDate': endStr,
        'EffectiveDate': endStr
      };
      var str = new Date().toUTCString();
      console.log(str + " End Subcription " + JSON.stringify(values));
      zuora_create(client, zuora_xml.makeZobject('zns:Amendment', 'ons', values), function(err, client, result, body) {
        if (!test_err_results(err, "end_subscriptions", values, result)) {
          console.log("Error: Subscription not Ended");
          console.log("\nSent:     " + client.lastRequest);
          console.log("\nRecieved: " + body);

          err = err + " " + subscriptionNumber + " subscription not ended ";
        }
        return callback(err, client);
      });
    }
  });


};


var create_bogus_active_account = module.exports.create_bogus_active_account = function(account_number, existing_client, values, callback) {
  var error_list = [];
  var zAccount = make_account(values.companyName, account_number, 'Batch7', values);
  zuora_create(existing_client, zuora_xml.makeZobject('zns:Account', 'ons', zAccount), function(err, client, results) {
    if (test_err_results(err, 'create zAccount', zAccount, results)) {
      var accountID = results[0].Id;
      var zContact = make_contact(accountID, values.contact.address, values.contact.firstname, values.contact.lastname, values.contact.email);
      zuora_create(client, zuora_xml.makeZobject('zns:Contact', 'ons', zContact), function(err, client, result) {
        if (test_err_results(err, 'create zContact', zContact, result)) {
          var contactID = result[0].Id;
          var zUpdate = make_update_account(accountID, contactID, contactID, null, 'Active');
          zuora_update(client, zuora_xml.makeZobject('zns:Account', 'ons', zUpdate), function(err, client, result) {
            if (!test_err_results(err, "Update Account", zUpdate, result)) {
              err += " account not made active"
            }
            return callback(err, client, accountID);
          });
        } else {
          test_err_results(result)
          return callback(err, client, null);
        }
      });
    } else {
      test_err_results(results)
      return callback(err, client, null);
    }
  });
};

var get_values_from_capi = module.exports.get_values_from_capi = function(capi, payment) {
  var max_name_length = 50;
  var values = {
    'companyName': capi.company_name,
    'uuid': capi.uuid,
    'contact': {
      'address': {
        'street': capi.street_1,
        'street2': capi.street_2,
        'city': capi.city,
        'state': capi.state,
        'country': capi.country,
        'postalcode': capi.postal_code
      },
      'firstname': capi.first_name,
      'lastname': capi.last_name,
      'email': capi.email_address
    }
  };

  if (payment) {
    values['payment'] = {
      'address': {
        'street': payment.address.street,
        'street2': payment.address.street_2,
        'city': payment.address.city,
        'country': payment.address.country,
        'state': payment.address.state,
        'postalcode': payment.address.postal_code
      },
      'firstname': payment.firstname,
      'lastname': payment.lastname,
      'ccnum': payment.ccnum,
      'cctype': payment.cctype,
      'expmonth': payment.expmonth,
      'expyear': payment.expyear,
      'ccv': payment.ccv
    }

  }
  if (typeof values.companyName == 'undefined' || values.companyName === null || values.companyName.trim() === '') {
    var name = capi.first_name + ' ' + capi.last_name;
    if (name.length > 2) {
      values.companyName = name;
    } else {
      values.companyName = capi.uuid;
    }
  }
  if (values.companyName.length > max_name_length) {
    values.companyName = values.companyName.substring(0, (max_name_length - 1));
  }
  values.companyName = values.companyName;
  return values;
};

var get_start_end = module.exports.get_start_end = function(day) {
  // VooDoo Date Math see DASH-70 for testing details
  var start_time = moment(day).utc().startOf('day');
  var end_time;
  var spl = day.split("-");

  if (spl.length == 2) { // Month
    end_time = moment(start_time).utc().add('months', 1);
    var today = moment().utc().startOf('day');
    if (end_time > today) {
      end_time = today;
    }
  } else if (spl.length === 3) { // Day
    end_time = moment(start_time).add('days', 1);
  } else if (spl.length === 1) { // Year to date
    end_time = moment().utc();
  }
  // Then lets go ahead and back up one second 
  var the_end = end_time.utc().subtract('seconds', 1);
  return {
    "start": start_time.utc().format("YYYY-MM-DDTHH:mm:ss"),
    "end": the_end.utc().format("YYYY-MM-DDTHH:mm:ss")
  };
};

var get_active_subscription = module.exports.get_active_subscription = function(account_id, machine, existing_client, callback) {
  var query = 'select Id,AccountId,Name,Status from Subscription where AccountId=\'' + account_id + '\' and Status=\'Active\' and Name=\'' + machine + '\'';

  var zQuery = {
    'queryString': query
  };
  zuora_query(existing_client, zQuery, function(err, client, result) {
    // console.log("get_active_subscription err=" + err);
    var sub_id;
    if (err === null) {
      if (result.size == 1) {
        sub_id = result.records[0].Id;
      } else {
        var msg = " get_active_subscription found this many records " + result.size + " looking for " + machine;
        console.log(msg);
        err = msg;
        for (var i = 0; i < result.size; i++) {
          console.log('Error: get_active_subscription Resp [', i, '] =', result.records[i]);
        }
      }
    }
    callback(err, client, sub_id);
  });

};

// we should only find one active sub, but looking for all of them just in case there is a problem
var get_first_active_subscription = module.exports.get_first_active_subscription = function(machine, existing_client, callback) {
  var query = 'select Id,AccountId,Name,Status,InvoiceOwnerId,Datasetname__c from Subscription where Name LIKE \'' + machine + '%\' and Status=\'Active\' ';

  var zQuery = {
    'queryString': query
  };
  //console.log("get_subscriptions query = "+query);
  zuora_query(existing_client, zQuery, function(err, client, result) {
    //console.log("get_active_subscription err=" + err);
    console.log("get_first_active_subscription found this many records " + result.size + " looking for " + machine);
    var sub_id;
    var owner_id;
    var datasetname;
    var subName = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";    
    if (err === null) {
      for (var i = 0; i < result.size; i++) {
        console.log("Found active sub name: ",result.records[i].Name);
        if (subName > result.records[i].Name) {
          subName = result.records[i].Name;
          sub_id = result.records[i].Id;
          owner_id = result.records[i].InvoiceOwnerId;
          datasetname = result.records[i].Datasetname__c;
        }
      }
    }
    console.log("get_first_active_subscription returning " + subName);
    callback(err, client, sub_id, owner_id, datasetname, result.size);
  });

};



var get_subscriptions = module.exports.get_subscriptions = function(machine, existing_client, callback) {
  var query = 'select Id,AccountId,Name,Status,InvoiceOwnerId,Datasetname__c from Subscription where Name=\'' + machine + '\' and Status=\'Active\' ';

  var zQuery = {
    'queryString': query
  };
  //console.log("get_subscriptions query = "+query);
  zuora_query(existing_client, zQuery, function(err, client, result) {
    //console.log("get_active_subscription err=" + err);

    var sub_id;
    var owner_id;
    var datasetname;
    if (err === null) {
      if (result.size == 1) {
        sub_id = result.records[0].Id;
        owner_id = result.records[0].InvoiceOwnerId;
        datasetname = result.records[0].Datasetname__c;
      } else {
        var msg = "Error:  get_active_subscription found this many records " + result.size + " looking for " + machine;
        console.log(msg);
        err = msg;
        for (var i = 0; i < result.size; i++) {
          console.log('Error: get_active_subscription Resp [', i, '] =', result.records[i]);
        }
      }
    }
    callback(err, client, sub_id, owner_id, datasetname);
  });

};

var get_account_owner = module.exports.get_account_owner = function(customer_id, existing_client, callback) {
  var query = 'select Id,AccountNumber,Name from Account where Status = \'Active\' and Id = \'' + customer_id + '\'';

  var zQuery = {
    'queryString': query
  };
  //console.log("get_account_owner: "+ query);
  zuora_query(existing_client, zQuery, function(err, client, result) {
    //console.log("get_account_id err=" + err);
    var AccountNumber = null;
    if (err === null) {
      if (result.size == 1) {
        AccountNumber = result.records[0].AccountNumber;
      } else {
        var msg = " Error: get_account_owner found this many records " + result.size + " looking for Id: " + customer_id;
        console.log(msg);
        err = msg;
        for (var i = 0; i < result.size; i++) {
          console.log('Error: get_account_owner Resp [', i, '] =', result.records[i]);
        }
      }
    }
    callback(err, client, AccountNumber);
  });

};

var get_account_id = module.exports.get_account_id = function(customer_uuid, existing_client, callback) {
  var query = 'select Id,AccountNumber,Name from Account where AccountNumber = \'' + customer_uuid + '\'';

  var zQuery = {
    'queryString': query
  };
  zuora_query(existing_client, zQuery, function(err, client, result) {
    //console.log("get_account_id err=" + err);
    var account_id = null;
    if (err === null) {
      if (result.size == 1) {
        account_id = result.records[0].Id;
      } else {
        var msg = " get_account_id found this many records " + result.size + " looking for " + customer_uuid;
        //      console.log(msg);
        err = msg;
        for (var i = 0; i < result.size; i++) {
          console.log('get_account_id Resp [', i, '] =', result.records[i]);
        }
      }
    }
    callback(err, client, account_id);
  });

};

var update_account_crm = module.exports.update_account_crm = function(uuid, crmid, existing_client, callback) {
  get_account_id(uuid, existing_client, function(err, client, account_id) {
    if (err) {
      var error = "error in get_account_id (" + uuid + "): " + err;
      callback(error, false);
    } else {
      var values = {
        'Id': account_id,
        'CrmId': crmid
      };
      zuora_update(client, zuora_xml.makeZobject('ons:Account', 'ons', values), function(err, client, result) {
        if (!test_err_results(err, "Update Account", values, result)) {
          var error = "Error unable to update " + uuid + " crmid " + crmid + " Err: " + err;
          callback(error, false);
        } else {
          callback(null, true);
        }
      });

    }
  });

};

var update_account_batch = module.exports.update_account_batch = function(uuid, batch, existing_client, callback) {
  get_account_id(uuid, existing_client, function(err, client, account_id) {
    if (err) {
      var error = "error in get_account_id (" + uuid + "): " + err;
      callback(error, false);
    } else {
      var values = {
        'Id': account_id,
        'Batch': batch
      };
      zuora_update(client, zuora_xml.makeZobject('ons:Account', 'ons', values), function(err, client, result) {
        if (!test_err_results(err, "Update Account", values, result)) {
          var error = "Error unable to update " + uuid + " batch " + batch + " Err: " + err;
          callback(error, false);
        } else {
          callback(null, true);
        }
      });

    }
  });

};

var update_account_cat = module.exports.update_account_cat = function(uuid, cat, existing_client, callback) {
  get_account_id(uuid, existing_client, function(err, client, account_id) {
    if (err) {
      var error = "error in get_account_id (" + uuid + "): " + err;
      callback(error, false);
    } else {
      var values = {
        'Id': account_id,
        'Category__c': cat
      };
      zuora_update(client, zuora_xml.makeZobject('ons:Account', 'ons', values), function(err, client, result) {
        if (!test_err_results(err, "Update Account", values, result)) {
          var error = "Error unable to update " + uuid + " category " + cat + " Err: " + err;
          callback(error, false);
        } else {
          callback(null, true);
        }
      });

    }
  });

};

var update_account_sync = module.exports.update_account_sync = function(uuid, value, existing_client, callback) {
  get_account_id(uuid, existing_client, function(err, client, account_id) {
    console.log("Account_id: " + account_id);
    if (err) {
      var error = "error in get_account_id (" + uuid + "): " + err;
      callback(error, false);
    } else {
      var values = {
        'accountId': account_id,
        'SynctoNetSuite__NS': value
      };
      zuora_update(client, zuora_xml.makeZobject('zns:Account', 'ons', values), function(err, client, result) {
        if (test_err_results(err, "Update Account", values, result)) {
          var error = "Error unable to update " + uuid + " sync " + value + " Err: " + err;
          callback(error, false);
        } else {
          callback(null, true);
        }
      });

    }
  });

};

var pad = module.exports.pad = function(number) {
  if (number <= 99999) {
    number = ("     " + number).slice(-5);
  }
  return number;
};

var bytesToGigs = module.exports.bytesToGigs = function(number, fmt) {

  // This will round to Megabytes then return Gigs
  // Default is three decimal places use 0.0[00] if you don't want trailing zeros
  if (!fmt) {
    fmt = "0.000";
  }
  var megs = Math.ceil(Number(number) / (1024 * 1024));
  var gigs = megs / 1024;
  var fmtgig = numeral(gigs).format(fmt)
  //console.log("bytesToGigs in: "+number+" out ", fmtgig);
  return fmtgig;
}

var createGroupObjects = module.exports.createGroupObjects = function(group_by, objects) {
  var groups = [];

  var total_size = objects.length;
  for (var i = 0; i < total_size; i += group_by) {
    groups.push(objects.slice(i, i + group_by));
  }
  return groups;
};

var verifyBillingTags = module.exports.verifyBillingTags = function(usages, theDate, client, callback) {
  var billingTags = [];
  var zuoraBTags = {};
  var errorMsgs = "";

  for (var i in usages) {
    var usage = usages[i];
    if (usage.ReserveImageSKU__c) {
      billingTags.push(usage.ReserveImageSKU__c);
    }
    if (usage.ReserveSKU__c) {
      billingTags.push(usage.ReserveSKU__c)
    }
  }
  var uniqueList = _.uniq(billingTags);
  console.log("Billingtags length:", billingTags.length);
  console.log("Unique length:", uniqueList.length);
  console.log(JSON.stringify(uniqueList, undefined, 2));
  // Now this gets the list of all regardless of SKU, which in this case we don't care as we are only checking from the gathered
  // billing tags in the usage and we know that we are not duplicating any billing tags across SKUs
  var query = 'SELECT Id, Name, BillingTag__c, EffectiveStartDate, EffectiveEndDate FROM ProductRatePlan';
  var zObject = {
    'queryString': query
  };
  zuora_query_all(client, zObject, function(err, client, results) {
    //console.log(JSON.stringify(results, undefined, 2));
    console.log("Found results.size", results.size);
    if (err) {
      console.log("Error getting Zuora billing tags", err);
      errorMsgs = err;
    } else {
      for (var i in results.records) {
        var record = results.records[i];
        zuoraBTags[record.BillingTag__c] = record;
      }
      console.log(JSON.stringify(zuoraBTags, undefined, 2));
      for (var j in uniqueList) {
        var tag = uniqueList[j];
        var ztag = zuoraBTags[tag];
        if (ztag && ztag.BillingTag__c) {
          if (theDate >= ztag.EffectiveStartDate && theDate <= ztag.EffectiveEndDate) {
            console.log("Tag: OK      ", tag);
          } else {
            console.log("Tag: PROBLEMS", tag, ztag.EffectiveStartDate, ztag.EffectiveEndDate);
            if (theDate < ztag.EffectiveStartDate && theDate != ztag.EffectiveStartDate.substring(0, theDate.length)) {
              console.log(" ******** ", theDate, "Tag doesn't start yet: ", ztag.EffectiveStartDate);
              errorMsgs += " " + tag + " doesn't start yet " + ztag.EffectiveStartDate + " - " + ztag.EffectiveEndDate + "\n";
            }
            if (theDate > ztag.EffectiveEndDate) {
              console.log(" ******** Tag ended on", ztag.EffectiveStartDate);
              errorMsgs += " " + tag + " expired " + ztag.EffectiveStartDate + " - " + ztag.EffectiveEndDate + "\n";
            }
          }
        }
      }
    }
    if (errorMsgs == "") {
      errorMsgs = null;
    }
    callback(errorMsgs, client);
  });
};

// queue a report with zoql, wait for results, and finally download the .csv
// https://knowledgecenter.zuora.com/D_SOAP_API/C_SOAP_API_Reference/C_API_Use_Cases_and_Examples/I_Creating_an_Export
var zuora_export_query = function(maybe_client, query, callback) {
  var client;
  var values = {
    format: 'csv',
    name: 'my export 1',
    query: query,
    Zip: 'False'
  };
  var zObject = zuora_xml.makeZobject('zns:Export', 'ons', values);
  try {
    zuora_create(maybe_client, zObject, handleResponse);
  } catch (e) {
    console.log(e);
    console.log('Initial HTTP request to SOAP threw an exception. Passing err up to the callback')
    console.log('TODO: graceful retry')
    callback(err);
  }

  function handleResponse(err, valid_client, resp) {
    if (err) {
      verboseLog('zuora_create error making zuora_export_query')
      return callback(err);
    }
    resp = util.isArray(resp) ? resp[0] : resp;
    if (resp.Success[0] === false || resp.Success === false) {
      console.log('we do not have success')
      var Errors = util.isArray(resp.Errors) ? resp.Errors[0] : resp.Errors;
      console.dir(Errors);
      return callback(Errors);
    }
    //console.log(resp);
    //console.log(client.lastMessage); // the message payload inside the envelope
    //console.log(client.lastRequest); // the xml -- the entire document
    var exportId = resp.Id;
    verboseLog('export id is ' + exportId);

    client = valid_client;
    if (!client.joyentsession) {
      return callback(new Error('Missing client.joyentsession'));
    }

    watchExportProgress(exportId, function(fileId) {
      fetchExport(exportId, fileId, function(err, exportData) {
        cleanupfile(exportId, function(err) {
          //console.log(exportData);
          callback(err, client, exportData);
        });
      });
    });

  }

};


var end_subscriptions = module.exports.end_subscriptions = function(uuids, end_date, client, callback) {
  var enddate = moment(end_date, "YYYY-MM-DD");
  console.log("About to end subscriptions count: ", uuids.length);
  var end_subs = [];
  var the_errors = "";

  var end_qq = vasync.queue(worker, 1);

  end_qq.push(uuids);

  function worker(task, done) {
    console.log(" Ending Subscription: " + task);
    endSubscription(task, enddate, client, function(err, client) {
      if (err) {
        console.log("warning - subscription not ended " + task);
      } else {
        end_subs.push(task);
      }
      done();
    });
  }

  end_qq.drain = function() {
    console.log('Subscriptions were ended count: ' + end_subs.length);
    callback(the_errors, client, end_subs);
  };

};

