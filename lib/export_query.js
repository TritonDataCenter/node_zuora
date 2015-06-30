var csvParser = require('csv-parser');
var request = require('request');
var es = require('event-stream');
var log = require('./logger');
var extend = require('util')._extend;

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

function watchExportProgress(z, watcherConfig, exportId, callback) {
  var query = "SELECT status, statusReason, fileId, query, size FROM Export WHERE Id='" + exportId + "'";
  var settings = extend({
    interval: 5000,
    maxAttempts: 200
  }, watcherConfig || {});
  var maxLimit = settings.maxAttempts;

  checkExportProgress();

  function checkExportProgress() {
    log.debug('Waiting for export.. attempt  -> ', maxLimit - settings.maxAttempts);
    z.query(query, function(err, records) {
      //if (err) return callback(err);
      if (err) {
        log.warn('Zuora Export Warning: zuora_query() error: %s', err);
        setTimeout(checkExportProgress, settings.interval);
        return;
      }
      var record = records[0];
      switch (record.Status) {
        case 'Pending':
        case 'Processing':
          if (--settings.maxAttempts > 0) {
            setTimeout(checkExportProgress, settings.interval);
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
  function exportAsArray(exportObject, watcherConfig, cb) {
    if (typeof watcherConfig === 'function') {
      cb = watcherConfig;
      watcherConfig = {};
    }

    execute(exportObject, watcherConfig, function (err, stream) {
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

  function execute(exportObject, watcherConfig, cb) {
    if (typeof watcherConfig === 'function') {
      cb = watcherConfig;
      watcherConfig = {};
    }

    if (typeof exportObject === 'string') {
      exportObject = {
        format: 'csv',
        name: 'node_zuora export',
        query: exportObject
      };
    }
    // Only csv exports are supported right now
    if (exportObject.format !== 'csv') {
      cb(new Error('Only csv formatting is supported'));
    }

    xmasTree.export.create(exportObject, function (err, result) {
      if (err) {
        return cb(err);
      }
      var exportId = result[0].Id;
      watchExportProgress(xmasTree, watcherConfig, exportId, function (err, fileId) {
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
