function CodedError(code, message, err) {
    var self = new Error(message);
    self.code = code;
    if (err) {
        self.innerError = err;
        self.stack += err.stack;
    }
    return self;
}
var CodedError;
(function (CodedError) {
    function is(code) {
        return function (err) {
            return err.code == code;
        };
    }
    CodedError.is = is;
})(CodedError || (CodedError = {}));
module.exports = CodedError;
