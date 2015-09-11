var AWS = require('aws-sdk');
var through = require('through2');
var Path = require('path');
var codedError = require('../../lib/coded-error');

function isFile(path) {
    return path.match(/\.\w*$/);
}

exports.createClient = function (credentials, bucket) {
    var self = {};
    
    var strictConfig = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        s3BucketEndpoint : true,
        endpoint: credentials.endpoint,
        params: {Bucket: bucket}
    }
    
    var config = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        params: {Bucket: bucket}
    }
    
    
    var s3 = new AWS.S3(credentials.endpoint ? strictConfig : config);

    function normalizedPath(path) {
        if (!isFile(path) && path) return path + '/';
        else return path;
    }

    self.profile = function profile(callback) {
        callback();
    };

    self.get = function get(path, callback) {
        path = normalizedPath(path);
        s3.getObject({Key: path}, function (err, data) {
            if (err)
                return callback(new codedError(err.statusCode, err.message));

            var ts = through();
            callback(null, ts);
            ts.end(data.Body);
        });
    };

    self.list = function list(path, callback) {
        s3.listObjects({Prefix: path}, function (err, data) {
            if (err)
                return callback(new codedError(err.statusCode, err.message));
            callback(null, data.Contents.map(function (item) {
                return {
                    size: item.Size,
                    lastModified: item.LastModified,
                    path: item.Key,
                    isFolder: !isFile(item.Key)
                };
            }));
        });
    };

    self.metadata = function metadata(path, callback) {
        path = normalizedPath(path);
        s3.headObject({Key: path}, function (err, data) {
            if (err)
                return callback(new codedError(err.statusCode, err.message));
            return callback(null, {
                size: data.ContentLength,
                lastModified: data.LastModified,
                path: path,
                isFolder: !isFile(path)
            });
        });
    };

    self.save = function save(path, content, callback) {
        path = normalizedPath(path);

        if (typeof (content) === 'function') {
            callback = content;
            content = "";
        }

        s3.putObject({Key: path, Body: content}, function (err) {
            if (err)
                return callback(new codedError(err.statusCode, err.message));
            callback();
        });
    };

    self.copy = function copy(src, dest, callback) {
        src = normalizedPath(src);
        dest = normalizedPath(dest);
        s3.copyObject({CopySource: bucket + '/' + src, Key: dest}, function (err) {
            if (err)
                return callback(new codedError(err.statusCode, err.message));
            callback();
        });
    };

    self.move = function move(src, dest, callback) {
        self.copy(src, dest, function (err) {
            if (err) return callback(new codedError(err.statusCode, err.message));
            self.remove(src, callback);
        });
    };

    self.remove = function remove(path, callback) {
        path = normalizedPath(path);
        if (isFile(path)) {
            s3.deleteObject({
                Key: path
            }, function (err) {
                if (err)
                    return callback(new codedError(err.statusCode, err.message));
                callback();
            });
        }
        else {
            self.list(path, function (err, data) {
                var paths = data.map(function (item) {
                    return {Key: item.path};
                });
                s3.deleteObjects({Delete: {Objects: paths}}, function (err) {
                    if (err) return callback(new codedError(err.statusCode, err.message));
                    callback();
                });
            });
        }
    };

    self.rename = function rename(path, newName, callback) {
        var newPath = Path.dirname(path) + '/' + newName;
        self.move(path, newPath, callback);
    };

    return self;
};