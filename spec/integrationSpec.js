var angularApiTest = require('../index'),
    fs = require('fs'),
    gulp = require('gulp'),
    gutil = require('gulp-util');

describe('angularApiTest', function() {
    var originalTimeoutInterval;

    beforeEach(function() {
        originalTimeoutInterval = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    afterEach(function() {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeoutInterval;
    });

    describe('valid specificaition', function() {
        var output, failures;

        beforeEach(function(done) {
            var apiTest, fileContents, fakeFile;

            apiTest = angularApiTest(
                {
                    debug: 0,
                    urlPrefix: 'http://127.0.0.1:9000',
                    server: {
                        start: __dirname + '/bin/start_test_server.sh',
                        stop: __dirname + '/bin/stop_test_server.sh',
                        reset: __dirname + '/bin/reset_test_server.sh'
                    }
                },
                {
                    AppSettings: {
                        backendApi: '/api/'
                    }
                }
            );

            fileContents = fs.readFileSync(__dirname + '/data/e2e-token-authentication.js', {
                encoding: 'utf8',
                flag: 'r'
            });

            fakeFile = new gutil.File({
                path: 'e2e-mocks.js',
                contents: new Buffer(fileContents)
            });

            apiTest.write(fakeFile);

            apiTest.on('data', function(newFile) {
                output = newFile.contents.toString();
            });

            apiTest.on('end', function(failures) {
                failures = failures;
                done();
            });
        });

        it('should run oithout errors', function() {
            expect(output).toBe('');
            expect(failures).toBeUndefined();
        });
    });
});
