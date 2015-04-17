var request = require('request'),
    Stream = require('stream');

module.exports = function call(opts, callback) {
    if (typeof(opts.data) === 'function') {
        callback = opts.data;
        opts.data = "";
    }

    if (opts.streamedOutput) return callback(null, request({
        url: opts.url,
        method: opts.method,
        headers: opts.headers
    }));

    var req = request({
        url: opts.url,
        method: opts.method,
        headers: opts.headers,
        body: (opts.data.form || opts.data instanceof Stream) ? null : opts.data
    }, function (err, res, body) {
        if (err) return callback(err);
        if (res.statusCode != 200 && res.statusCode != 201)
            return callback(new Error(JSON.stringify({message: body, code: res.statusCode})));
        try {
            var jsonData = JSON.parse(body);
            callback(null, jsonData);
        }
        catch (e) {
            callback(null, body);
        }
    });

    if (opts.data instanceof Stream) {
        opts.data.pipe(req);
    }

    if (opts.data && opts.data.form) {
        var form = req.form();
        for (var key in opts.data.form) {
            var args = opts.data.form[key];
            if (!(args instanceof Array)) args = [args];
            form.append.apply(form, [key].concat(args));
        }
    }
};