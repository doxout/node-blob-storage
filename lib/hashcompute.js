var crypto = require('crypto'),
    through2 = require('through2');

module.exports = function(stream, done) {
    var streamBranch = through2();
    var fileSHA1 = crypto.createHash('sha1');
    streamBranch.on('data', function(chunk) {
        fileSHA1.update(chunk);
    });
    streamBranch.on('end', function() {
        return done(null, fileSHA1.digest('hex'));
    });
    stream.pipe(streamBranch);
};