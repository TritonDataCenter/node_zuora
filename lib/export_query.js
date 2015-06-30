var csvParser = require('csv-parser');
var request = require('request');
var es = require('event-stream');
var log = require('./logger');

function fetchExport(client, config, fileId) {
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
  return request(options)
    .pipe(csvParser());
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

function attachExportMethods(client, config, xmasTree) {
  // Shorthand methods to execute and retrieve exports
  xmasTree.export.asStream = execute;
  xmasTree.export.asArray = exportAsArray;

  // Buffer the full export as an array
  function exportAsArray(exportConfig, cb) {
    execute(exportConfig, function (err, stream) {
      if (err) {
        return cb(err);
      }

      stream.pipe(es.writeArray(function (err, array) {
        if (err) {
          return cb(err);
        }
        cb(null, array);
      }));
    });
  }

  function execute(exportConfig, cb) {
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
        var stream = fetchExport(client, config, fileId);
        stream.on('end', function () {
          log.debug('Deleting export %s', exportId);
          deleteExport(xmasTree, exportId);
        });
        cb(null, stream);
      });
    });
  }
}

module.exports = attachExportMethods;
