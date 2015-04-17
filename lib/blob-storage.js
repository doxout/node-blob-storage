var newStorage = require('./backend-storage/backend-storage'),
    Path = require('path'),
    uuid = require('uuid'),
    hashcompute = require('./hashcompute');

module.exports = function (credentials) {
    if (credentials.accountType == 'mock')
        return require('./mock')(credentials);

    var storage = newStorage(credentials);

    var self = {};

    self.type = credentials.accountType;

    self.get = function get(key, callback) {
        storage.get(pathToBlob(key), callback);
    };

    self.remove = function remove(key, callback) {
        storage.remove(pathToBlob(key), callback);
    };

    self.put = function put(value, callback) {
        if (value.length == null)
            console.warn("Provided value has no length - this may cause an issue with some storage types");
        if (typeof value.length === "string") value.length = parseFloat(value.length);
        var tempFileName = uuid.v4();
        var fileHash, err;
        var complete = 0;
        hashcompute(value, function (e, res) {
            fileHash = res;
            err = err || e;
            if (++complete == 2) renameFile();
        });
        storage.save(pathToBlob(tempFileName), value, function (e) {
            err = err || e;
            if (++complete) renameFile();
        });
        function renameFile() {
            if (err) return callback(err);
            storage.rename(pathToBlob(tempFileName), blobFile(fileHash), function (err) {
                if (!err) return callback(null, fileHash);

                try {
                    if (JSON.parse(err.message).code == 403) {
                        storage.remove(pathToBlob(tempFileName), function (err) {
                            if (err) return callback(err);
                            callback(null, fileHash);
                        });
                    }
                    else callback(err);
                }
                catch (ex) {
                    callback(err);
                }
            });
        }
    };

    self.sync = function sync(path, key, callback) {
        if (typeof key === 'function') {
            callback = key;
            key = null;
        }
        if (credentials.accountType == "s3") return callback();
        if (key) {
            if (Path.extname(path) == '') return storage.save(path, callback);
            storage.copy(pathToBlob(key), path, callback);
        }
        else
            storage.remove(path, callback);
    };

    function pathToBlob(name) {
        return "blob/" + name + ".blob";
    }

    function blobFile(name) {
        return name + ".blob";
    }

    return self;
};