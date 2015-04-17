var AWS = require('aws-sdk'),
    through = require('through2'),
    Path = require('path');

function isFile(path) {
    return path.match(/\.\w*$/);
}

exports.createClient = function (credentials, bucket) {
    var self = {};

    var s3 = new AWS.S3({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        params: {Bucket: bucket}
    });

    function normalizedPath(path) {
        if (!isFile(path) && path) return path + '/';
        else return path;
    }

    self.profile = function profile(callback) {
        callback();
    };

    self.get = function get(path, callback) {
        path = normalizedPath(path);
        s3.getObject({
            Key: path
        }, function (err, data) {
            if (err)
                return callback(new Error(JSON.stringify(err)));

            var ts = through();
            callback(null, ts);
            ts.end(data.Body);
        });
    };

    self.list = function list(path, callback) {
        s3.listObjects({
            Prefix: path
        }, function (err, data) {
            if (err)
                return callback(new Error(JSON.stringify(err)));
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
        s3.headObject({
            Key: path
        }, function (err, data) {
            if (err)
                return callback(new Error(JSON.stringify(err)));
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

        s3.putObject({
            Key: path,
            Body: content
        }, function (err) {
            if (err)
                return callback(new Error(JSON.stringify(err)));
            callback();
        });
    };

    self.copy = function copy(src, dest, callback) {
        src = normalizedPath(src);
        dest = normalizedPath(dest);
        s3.copyObject({
            CopySource: bucket + '/' + src,
            Key: dest
        }, function (err) {
            if (err)
                return callback(new Error(JSON.stringify(err)));
            callback();
        });
    };

    self.move = function move(src, dest, callback) {
        self.copy(src, dest, function (err) {
            if (err) return callback(err);
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
                    return callback(new Error(JSON.stringify(err)));
                callback();
            });
        }
        else {
            self.list(path, function (err, data) {
                var paths = data.map(function (item) {
                    return {Key: item.path};
                });
                s3.deleteObjects({Delete: {Objects: paths}}, function (err) {
                    if (err) return callback(new Error(JSON.stringify(err)));
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