var hashcompute = require('./hashcompute'),
    bl = require('bl'),
    crypto = require('crypto');
var codedError = require('../lib/coded-error');

var store = {};

module.exports = function (credentials) {
    var self = {};
    self.type = credentials.accountType;
    self.put = function (stream, callback) {
        var err;
        stream.pipe(bl(function (e, data) {
            if (err)
                return callback(err);
            var hash = crypto.createHash('sha1');
            hash.update(data);
            var fileHash = hash.digest('hex');
            store[fileHash] = {
                path: stream.path,
                mode: stream.mode,
                data: data
            };
            setTimeout(function () {
                callback(null, fileHash);
            }, 1);
        }));
    };
    self.get = function (key, callback) {
        var data = store[key];
        if (!data)
            return setTimeout(function () {
                callback(new codedError(404, "Specified key not exist"), null);
            }, 1);
        var s = bl();
        var file = store[key];
        s.path = file.path;
        s.mode = file.mode;
        s.append(file.data);
        return setTimeout(function () {
            callback(null, s);
        }, 1);
    };
    self.remove = function (key, callback) {
        delete store[key];
        setTimeout(function () {
            callback();
        }, 1);
    };
    self.sync = function (path, key, callback) {
        if (typeof key === 'function') {
            callback = key;
            key = null;
        }
        setTimeout(callback, 1);
    };
    self.profile = function (callback) {
        setTimeout(function () {
            callback(null, {});
        }, 1);
    };
    return self;
};