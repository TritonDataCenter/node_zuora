var csvParser = require('./csvParser');

  function fetchExport(exportId, fileId, callback) {
    var url = buildFileURL(fileId);
    var options = {
      method: 'GET',
      url: url,
      auth: {
        user: config.user,
        pass: config.password
      },
      headers: {
        'Authorization': 'ZSession ' + client.joyentsession
      },
      timeout: 10000
    }
    request(options)
      .pipe(csvParser())
      .pipe(es.writeArray(handleResponse))

    function handleResponse(err, array) {
      var values = [];
      if (err) return callback(err);
      // convert it so the output looks like the
      for (var i in array) {
        var item = array[i];
        var keys = Object.keys(item);
        var value = {};
        for (var j in keys) {
          var key = keys[j];
          var indexes = key.split(".");
          var index = indexes[indexes.length - 1];
          // Id is always an array
          if (index == "Id") {
            var ids = [];
            ids.push(item[key]);
            value[index] = ids;
          } else if (index == "Subscription.Name") {
            value["SubscriptionNumber"] = item[key]
          } else {
            value[index] = item[key];
          }
          value[key] = item[key];
        }
        values.push(value);
      }
      callback(null, {
        size: array.length,
        records: values
      })
    }
    /*
    request(options, handleResponse);

    function handleResponse(error, response, body) {
      //console.log(error);
      //console.log(response.statusCode);
      //console.log(body);
      if (!error && (String(response.statusCode)[0] !== '2')) {
        error = new Error('Error http statuscode = ' + response.statusCode);
      }
      callback(error, body);
    }
    */
  }

  function watchExportProgress(exportId, onComplete) {
    var query = "SELECT status, statusReason, fileId, query, size FROM Export WHERE Id='" + exportId + "'";
    var zQuery = {
      'queryString': query
    };
    var interval = 5000;
    var maxLimit = 200;
    var maxAttempts = 200;
    checkExportProgress();

    function checkExportProgress() {
      console.log('Waiting for export.. attempt  -> ', maxLimit - maxAttempts);
      zuora_query(client, zQuery, function(err, client, resp) {
        //if (err) return callback(err);
        if (err) {
          console.log('Zuora Export Warning: zuora_query() error: %s', err);
          setTimeout(checkExportProgress, interval);
          return;
        }
        //console.log(JSON.stringify(resp, undefined, 2));
        var records = resp.records[0] || resp.records;
        switch (records.Status) {
          case 'Pending':
          case 'Processing':
            if (--maxAttempts > 0) {
              setTimeout(checkExportProgress, interval);
            } else {
              console.log(resp);
              callback(new Error('Zuora Export Error: Retry timeout'));
            }
            break;
          case 'Completed':
            onComplete(records.FileId);
            break;
          case 'Failed':
          case 'Canceled':
            callback(new Error('Zuora Export Error: ' + records.Status + ' ' + records.statusReason));
            break;
          default:
            callback(new Error('Unexpected Export status of ' + records.Status));
        }
      })
    }
  }


  function cleanupfile(fid, callback) {
    var values = {
      type: "export",
      ids: fid
    }
    var zobject = " <zns:delete><zns:type>export</zns:type><zns:ids>" + fid + "</zns:ids></zns:delete>"
    // console.log("cleanupfile: ",zobject);
    zuora_delete(client, zobject, function(err, client, results, body) {
      //console.log("results from cleanupfile:", json.stringify(results, undefined,2));

      if (!err && results[0].success == true) {
        console.log("removed file from zuora.");

      } else {
        console.log("unable to remove file from zuora err:", err, "results:", json.stringify(results, undefined, 2));
      }
      callback(err);
    });
  };

  // example output: https://www.zuora.com/apps/api/file/{{fileId}}

  function buildFileURL(fileId) {
    var url = config.endpoint.split('/');
    url.length = 4;
    return url.concat(['api', 'file', fileId]).join('/');
  }
