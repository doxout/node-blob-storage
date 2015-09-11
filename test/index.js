var test = require('tap').test,
    fs = require('fs'),
    bl = require('bl');

process.env['NODE_ENV'] = "development";

var testContent = fs.readFileSync(__dirname + '/index.js').toString();

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename);
    var fileSizeInBytes = stats["size"];
    return fileSizeInBytes;
}

function runTests(t, storage) {
    t.test('test not existing file', function (t) {
        storage.get('file123434.txt', function (err) {
            t.ok(err, "should NOT get file from blob storage." + err);
            t.end();
        });
    });

    t.test('testing ' + storage.type, function (t) {
        var file = fs.createReadStream(__dirname + "/index.js");
        file.length = getFilesizeInBytes(__dirname + "/index.js");
        storage.put(file, function (err, key) {
            t.notOk(err, "should put new file in blob storage. " + err);
            t.ok(key, "should generate non-null key. " + key);
            storage.get(key, function (err, stream) {
                t.notOk(err, "should get file from blob storage." + err);
                stream.pipe(bl(onDataBuffer));
            });
            function onDataBuffer(err, data) {
                data = data.toString();
                t.notOk(err, "should get entire file from storage." + err);
                t.equals(data, testContent, "file content should be correct");
                storage.sync('sync.txt', key, onDataSync);
            }

            function onDataSync(err) {
                t.notOk(err, err && "should synchronize the file." + err);
                storage.sync('sync.txt', onDataSyncDelete);
            }

            function onDataSyncDelete(err) {
                t.notOk(err, "should synchronize(delete) the file." + err);
                t.end();
            }

        });
    });


}

test("blob storage", function (t) {
    var blobStorage = require('../lib/blob-storage.js');

    var storageList = [
        blobStorage({
            accountType: "s3",
            bucket: "...",
            endpoint: '...',
            accessKeyId: '...',
            secretAccessKey: '...'
        }),
        blobStorage({accountType: 'mock'})
    ];

    storageList.map(function (s) {
        runTests(t, s);
    });
});