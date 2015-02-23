/**
 * Copyright (C) 2015 by Clearcode <http://clearcode.cc>
 * and associates (see AUTHORS).
 *
 * This file is part of [angularApiTest].
 *
 * [angularApiTest] is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * [angularApiTest] is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with [angularApiTest].  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

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
                    reporter: 'machineout',
                    server: {
                        config: {
                            protocol: 'http',
                            host: '127.0.0.1',
                            port: 9876
                        },
                        start: __dirname + '/bin/start_test_server.sh',
                        stop: __dirname + '/bin/stop_test_server.sh',
                        reset: __dirname + '/bin/reset_test_server.sh'
                    },
                    injectMap: {
                        AppSettings: {
                            backendApi: '/api/'
                        }
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
