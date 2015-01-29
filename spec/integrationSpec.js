var angularApiTest = require('../index'),
    fs = require('fs'),
    gulp = require('gulp'),
    gutil = require('gulp-util');

describe('angularApiTest', function() {
    var mock, handlers;

    describe('valid specificaition', function() {
        var output, failures;

        beforeEach(function(done) {
            var apiTest, fileContents, fakeFile;

            apiTest = angularApiTest(
                {
                    debug: 1,
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

        it('should have empty output', function() {
            expect(output).toBe('');
        });

        it('should have no failures', function() {
            expect(failures).toBeUndefined();
        });
    });
});
