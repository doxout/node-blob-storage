module.exports = function (credentials) {
    switch (credentials.accountType) {
        case "s3":
            return require('./s3').createClient(credentials, credentials.bucket);
        default :
            throw new Error("Backend storage: " + credentials.accountType + " is not supported");
    }
};