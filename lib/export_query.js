var csvParser = require('csv-parser');
var request = require('request');
var es = require('event-stream');
var log = require('./logger');

function fetchExport(client, config, fileId, callback) {
  var url = buildFileURL(client._client.lastEndpoint, fileId);
  var options = {
    method: 'GET',
    url: url,
    auth: {
      user: config.user,
      pass: config.password
    },
    headers: {
      'Authorization': 'ZSession ' + client.session
    },
    timeout: 10000
  }
  request(options)
    .pipe(csvParser())
    .pipe(es.writeArray(handleResponse))

  function handleResponse(err, array) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      size: array.length,
      records: array
    });
  }

  //function handleResponse(err, array) {
  //  var values = [];
  //  if (err) return callback(err);
  //  // convert it so the output looks like the
  //  for (var i in array) {
  //    var item = array[i];
  //    var keys = Object.keys(item);
  //    var value = {};
  //    for (var j in keys) {
  //      var key = keys[j];
  //      var indexes = key.split(".");
  //      var index = indexes[indexes.length - 1];
  //      // Id is always an array
  //      if (index == "Id") {
  //        var ids = [];
  //        ids.push(item[key]);
  //        value[index] = ids;
  //      } else if (index == "Subscription.Name") {
  //        value["SubscriptionNumber"] = item[key]
  //      } else {
  //        value[index] = item[key];
  //      }
  //      value[key] = item[key];
  //    }
  //    values.push(value);
  //  }
  //  callback(null, {
  //    size: array.length,
  //    records: values
  //  })
  //}
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

function watchExportProgress(z, exportId, callback) {
  var query = "SELECT status, statusReason, fileId, query, size FROM Export WHERE Id='" + exportId + "'";
  var interval = 5000;
  var maxLimit = 200;
  var maxAttempts = 200;
  checkExportProgress();

  function checkExportProgress() {
    log.debug('Waiting for export.. attempt  -> ', maxLimit - maxAttempts);
    z.query(query, function(err, records) {
      //if (err) return callback(err);
      if (err) {
        log.warn('Zuora Export Warning: zuora_query() error: %s', err);
        setTimeout(checkExportProgress, interval);
        return;
      }
      var record = records[0];
      switch (record.Status) {
        case 'Pending':
        case 'Processing':
          if (--maxAttempts > 0) {
            setTimeout(checkExportProgress, interval);
          } else {
            callback(new Error('Zuora Export Error: Retry timeout'));
          }
          break;
        case 'Completed':
          callback(null, record.FileId);
          break;
        case 'Failed':
        case 'Canceled':
          callback(new Error('Zuora Export Error: ' + record.Status + ' ' + record.statusReason));
          break;
        default:
          callback(new Error('Unexpected Export status of ' + record.Status));
      }
    })
  }
}

function deleteExport(z, exportId) {
  z.export.delete([{Id: exportId}], function (err, results) {
    if (err || !results[0].success) {
      log.warn('Unable to remove export from zuora: ' + err);
    }
  });
}

// example output: https://www.zuora.com/apps/api/file/{{fileId}}

function buildFileURL(endpoint, fileId) {
  var url = endpoint.split('/');
  url.length = 4;
  return url.concat(['api', 'file', fileId]).join('/');
}

function attachExport(client, config, xmasTree) {
  xmasTree.export.execute = function (exportConfig, cb) {
    if (typeof exportConfig === 'string') {
      exportConfig = {
        format: 'csv',
        name: 'node_zuora export',
        query: exportConfig
      };
    }
    // Only csv exports are supported right now
    if (exportConfig.format !== 'csv') {
      cb(new Error('Only csv formatting is supported'));
    }

    xmasTree.export.create(exportConfig, function (err, result) {
      if (err) {
        return cb(err);
      }
      var exportId = result[0].Id;
      watchExportProgress(xmasTree, exportId, function (err, fileId) {
        if (err) {
          return cb(err);
        }
        fetchExport(client, config, fileId, function (err, data) {
          if (err) {
            return cb(err);
          }
          deleteExport(xmasTree, exportId);
          cb(null, data);
        });
      });
    });
  };
}

module.exports = attachExport;
