/**
 * angularApiTest module
 *
 * How to add to project:
 *
 * Setup gulp task
 * ===============
 *
 * Example:
 *
 * gulp.task('test-api', function() {
 *     return gulp.src(['src/app/e2e-mocks.js']).pipe(angularApiTest(
 *         {
 *             debug: 0,
 *             urlPrefix: 'http://127.0.0.1:8765',
 *             server: {
 *                 start: '../bin/start_test_server.sh',
 *                 stop: '../bin/stop_test_server.sh',
 *                 reset: '../bin/clean_test_server.sh'
 *             }
 *         },
 *         {
 *             AppSettings: {
 *                 backendApi: '/api/v1/'
 *             }
 *         }
 *     ));
 * });
 *
 * First parameter accepts options object.
 * * debug - Int. Allowed values: (0,1,2). 0 - reports most essential info. 2 - reports are most verbouse.
 * * urlPrefix - Prefix added to every api url (typically protocol, domain and port)
 * * server - Options for test server. This object contains scripts config.
 *     * start - scritp to start server (it should end execution when serer is ready to respond)
 *     * stop - script to stop server
 *     * reset - script to reset stae of server (database reset)
 *
 * Second parameter is optional. It's injection map used during evaluation of all src files.
 * Only angular.module('whatever').run() parts of src files are run (in example: e2e-mocks.js) and any required
 * injections are provided from injection map.
 * Additionally there are 2 core services provided by default:
 * * $httpBackend
 * * loginBackend
 *
 * If angular.module('whatever').run() injects any other object it must be mocked in injection map.
 *
 * Setup e2e-loginBackend.js
 * =========================
 *
 * angular.module('whatever').run() will depend on non standard extension. Mocks for it are in file
 * src/app/e2e-loginBackend.js. Add that file beside e2e-mocks.js in index.html to make following changes
 * transparent for e2e tests.
 *
 * Changes in e2e-mocks.js
 * =======================
 *
 * Inject loginBackend in angular.module('whatever').run().
 * Before using httpBackend configure and use loginBackend. It's used to register login requests for easy use with
 * endpoints that require login before they are available.
 *
 * Known bugs
 * ==========
 * * None
 *
 * Configuration
 * -------------
 *
 * loginBackend.config(requestIdGetter, sessionGetter, responseOverride, sessionFactory)
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *
 * @param requestIdGetter(method, url, data, headers) - function that accepts mocked request and returns session id
 *     of selected login (e.g. username)
 * @param sessionGetter(status, data, headers, statusText) - function that accepts response and returns session
 *     value (e.g. token value). It's used in following functions.
 * @param responseOverride(status, data, headers, statusText, session) - function that accepts endpoint response
 *     and session value (acuired by sessionGetter).
 *     It returns transformated response overriding elements generated by endpoint with predefined values.
 *     Return value should be an array: [status, data, headers, statusText]
 * @param sessionFactory(session) - function that accepts session value (acuired by sessionGetter) and returns
 *     headers for logged in session (object).
 *
 * Example:
 *
 * loginBackend.config(
 *     function(method, url, data, headers) {
 *         return data.username;
 *     },
 *     function(status, data, headers, statusText) {
 *         return data.token;
 *     },
 *     function(status, data, headers, statusText, session) {
 *         if(session !== undefined && data.hasOwnProperty('token')) {
 *             data.token = session;
 *         }
 *         return [status, data, headers, statusText];
 *     },
 *     function(session) {
 *         var result = {
 *             'Content-Type': 'application/json; charset=utf8'
 *         };
 *
 *         if(session) {
 *             result.Authorization = 'Token ' + session;
 *         }
 *
 *         return result;
 *     }
 * );
 *
 * loginBackend.when(method, url, [data], [headers])
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *
 * It accepts same attributes as $httpBackend.when (https://docs.angularjs.org/api/ngMockE2E/service/$httpBackend),
 * but every request defined using it will be considered a login and will be registeres for later use.
 *
 * NOTE: loginBackend accepts currently only .when() calls. Wrappers for method specific calls (e.g. .whenPOST())
 * are not available.
 *
 * loginBackend.session(sessionId)
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *
 * It accepts session id value (same as defined by requestIdGetter during requests reristration) and returns
 * headers for logged in user using that id.
 *
 * NOTE: Currently mocks defined in e2e-loginBackend.js allways return undefined, but it can be changed to use
 * similar logic as in api-tests to generate correct login headers.
 *
 * Example:
 *
 * $httpBackend.whenDELETE(
 *     backendApi + 'tokens',
 *     loginBackend.session('test@test.pl')
 * ).respond(204, '');
 *
 * .respond([status,] data[, headers, statusText, responseOverride])
 * ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *
 * Objects returned by any loginBackend.when() or $httpBackend.when*() functions have .respond() method.
 * It accepts same parameters as defined in documentation for $httpBackend but it's last parameter is:
 * @param responseOverride(status, data, headers, statusText) - Optional. Function accepting response and returning
 *     transformed response with overwritten elements generated by endpoint (e.g. token).
 *     Return value should be an array: [status, data, headers, statusText]
 *
 * Example:
 *
 * $httpBackend.whenPOST(
 *     backendApi + 'users',
 *     {
 *         email: 'newUser@test.pl',
 *         password: 'new password'
 *     }
 * ).respond(
 *     201,
 *     {
 *         id: 2,
 *         email: 'newUser@test.pl',
 *         token: '8c92a1ea7ee011e4ba898c89a5640f47'
 *     },
 *     undefined,
 *     undefined,
 *     function(status, data, headers, statusText) {
 *         data.token = '8c92a1ea7ee011e4ba898c89a5640f47';
 *         data.id = 2;
 *         return [status, data, headers, statusText];
 *     }
 * );
 */
'use strict';

// consts
var PLUGIN_NAME = 'angularApiTest';

module.exports = function(options, injectMap) {
    var shell = require('shelljs'),
        stringify = require('json-stable-stringify'),
        // through2 is a thin wrapper around node transform streams
        through = require('through2'),
        vm = require('vm'),
        gutil = require('gulp-util'),
        syncrequest = require('sync-request'),
        nodeunit = require('nodeunit'),
        PluginError = gutil.PluginError,
        i = 0,
        definitions = [],
        fakeConsole = {
            log: function() {},
            error: function() {}
        },
        stream, initSandbox, context, httpBackend, loginBackend, definitions;

    function endpointGather(definition) {
        definitions.push(definition);
    };

    function logger(message, level) {
        if(level <= options.debug) {
            gutil.log(message);
        }
    };

    function serverCommand(command, message, level) {
        var result;

        if(!message) {
            message = 'Running server "' + command + '" command...';
        }

        logger(message, level);
        if(options.server.hasOwnProperty(command)) {
            result = shell.exec(options.server[command], {silent: options.debug < 2});
            if(result.code != 0) {
                throw new PluginError(PLUGIN_NAME, 'Unexpected server command error: ' + result.code);
            }
        }
        else {
            throw new PluginError(PLUGIN_NAME, 'Unexpected server command');
        }
    };

    function httpRequest(request) {
        var requestOptions = {
                headers: request.headers || {}
            },
            url = options.urlPrefix + request.url,
            req, resp, attr, result;

        requestOptions.headers = normalizeHeaders(requestOptions.headers);
        request.extraHeaders = normalizeHeaders(request.extraHeaders);

        if(request.extraHeaders) {
            for(attr in request.extraHeaders) {
                requestOptions.headers[attr] = request.extraHeaders[attr];
            }
        }

        if(!requestOptions.headers['CONTENT-TYPE']) {
            requestOptions.headers['CONTENT-TYPE'] = 'application/json; charset=utf-8';
        }

        if(request.data !== undefined && typeof request.data === 'object') {
            request.data = JSON.stringify(request.data);
        }

        if(request.data !== undefined) {
            requestOptions.body = request.data;
        }

        if(options.debug) {
            logger('REQUEST: ' + request.method + ' ' + url + ' data: ' + requestOptions.body + ' headers: '  +
                stringify(requestOptions.headers), 1);
        }

        resp = syncrequest(request.method, url, requestOptions);

        result = {
            status: resp.statusCode,
            data: resp.body.toString(),
            headers: resp.headers,
            statusText: undefined
        };

        if(options.debug) {
            logger(result, 2);
        }

        if(result.data !== undefined) {
            try {
                result.data = JSON.parse(result.data);
            }
            catch(err) {
                //pass: Data not in json
            }
        }

        return result;
    }

    function normalizeHeaders(headers) {
        var result = {},
            name;

        for(name in headers) {
            if(headers.hasOwnProperty(name)) {
                result[name.toUpperCase()] = String(headers[name]);
            }
        }

        return result;
    }

    function endpointTest(definition, testSuite) {
        var request = definition[0],
            response = definition[1],
            responseOverride = definition[2],
            suite = {},
            data, tmp, endpointResponse, expectedHeaders, responseHeaders, name;

        if(request.headers instanceof Function) {
            request.headers = request.headers();
        }

        endpointResponse = httpRequest(request);

        if(typeof responseOverride === 'function') {
            tmp = responseOverride(endpointResponse.status, endpointResponse.data, endpointResponse.headers,
                endpointResponse.statusText);

            endpointResponse = {
                status: tmp[0],
                data: tmp[1],
                headers: tmp[2],
                statusText: tmp[3]
            };
        }

        if(typeof endpointResponse.data === 'string') {
            try {
                endpointResponse.data = JSON.parse(endpointResponse.data);
            }
            catch(e) {
                // pass
            }
        }

        if(typeof response.data === 'string') {
            try {
                response.data = JSON.parse(response.data);
            }
            catch(e) {
                // pass
            }
        }

        testSuite['Endpoint ' + request.method + ' ' + request.url + ' data: ' + request.data + ' headers: ' +
            stringify(request.headers) + ' extraHeaders: ' + stringify(request.extraHeaders)] = suite;

        suite.status = function(test) {
            test.equal(response.status, endpointResponse.status, 'Status code mismatch');
            test.done();
        };

        suite.data = function(test) {
            test.deepEqual(response.data, endpointResponse.data);
            test.done();
        };

        suite.headers = function(test) {
            if(response.headers !== undefined) {
                expectedHeaders = normalizeHeaders(response.headers);
                responseHeaders = normalizeHeaders(endpointResponse.headers);

                for(name in expectedHeaders) {
                    test.equal(responseHeaders[name], expectedHeaders[name], 'Headers mismatch for "' + name + '"');
                }
            }
            test.done();
        };
    }

    loginBackend = {
        _register: {},
        config: function(requestIdGetter, sessionGetter, responseOverride, sessionFactory) {
            this.requestIdGetter = requestIdGetter;
            this.responseOverride = responseOverride;
            this.sessionGetter = sessionGetter;
            this.sessionFactory = sessionFactory;
        },
        session: function(username) {
            var that = this;
            return function() {
                return that._session(username);
            };
        },
        _session: function(username) {
            var loginRequest = this._register[username],
                response;

            if(loginRequest) {
                response = httpRequest(loginRequest);
                return this.sessionFactory(this.sessionGetter(response.status, response.data, response.headers,
                    response.statusText));
            }

            throw new PluginError(PLUGIN_NAME, 'Unexpected login "' + username + '"');
            return undefined;
        },
        when: function(method, url, data, headers) {
            var username = this.requestIdGetter(method, url, data, headers),
                that = this,
                connection;

            this._register[username] = {
                method: method,
                url: url,
                data: data,
                headers: headers
            };

            connection = httpBackend.when(method, url, data, headers);

            return {
                respond: function(status, data, headers, statusText, override) {
                    var responseOverride;

                    if(!override) {
                        override = function(apiStatus, apiData, apiHeaders, apiStatusText) {
                            return that.responseOverride(apiStatus, apiData, apiHeaders, apiStatusText,
                                that.sessionGetter(status, data, headers, statusText));
                        };
                    }

                    return connection.respond.call(connection, status, data, headers, statusText, override);
                }
            };
        }
    };

    httpBackend = {
        when: function(method, url, data, headers, options) {
            options = options || {};

            return {
                request: {
                    method: method,
                    url: url,
                    data: data,
                    headers: headers,
                    extraHeaders: options.extraHeaders
                },
                response: null,
                responseOverride: null,
                process: typeof url === 'string',
                passThrough: function() {},
                respond: function() {
                    var response;

                    if(this.process) {
                        if(arguments.length === 1) {
                            if(arguments[0] instanceof Function) {
                                response = arguments[0](this.request.method, this.request.url,
                                    this.request.data, this.request.headers);
                            }
                            else {
                                response = [200, arguments[0], undefined, undefined];
                            }
                        }
                        else {
                            response = [arguments[0], arguments[1], arguments[2], arguments[3]];
                        }

                        if(arguments[4]) {
                            this.responseOverride = arguments[4];
                        }

                        this.response = {
                            status: response[0],
                            data: response[1],
                            headers: response[2],
                            statusText: response[3]
                        };

                        if(!options.skip) {
                            endpointGather([this.request, this.response, this.responseOverride]);
                        }
                    }
                }
            };
        },
        whenGET: function(url, headers, options) {
            return this.when('GET', url, undefined, headers, options);
        },
        whenHEAD: function(url, headers, options) {
            return this.when('HEAD', url, undefined, headers, options);
        },
        whenDELETE: function(url, headers, options) {
            return this.when('DELETE', url, undefined, headers, options);
        },
        whenPOST: function(url, data, headers, options) {
            return this.when('POST', url, data, headers, options);
        },
        whenPUT: function(url, data, headers, options) {
            return this.when('PUT', url, data, headers, options);
        },
        whenPATCH: function(url, data, headers, options) {
            return this.when('PATCH', url, data, headers, options);
        },
        whenJSONP: function(url, options) {
            return this.when('GET', url, undefined, undefined, options);
        }
    };

    injectMap = injectMap || {};
    injectMap.$httpBackend = httpBackend;
    injectMap.loginBackend = loginBackend;

    initSandbox = {
        // console: fakeConsole,
        console: console,
        $httpBackend: httpBackend,
        angular: {
            copy: function(obj) {
                return obj;
            },
            module: function() {
                return this._module;
            },
            _module: {
                requires: [],
                config: function() {
                    return this;
                },
                run: function(injectArray) {
                    var func = injectArray.pop(),
                        args = [],
                        i, injectName, injectObj;

                    for(i = 0; i < injectArray.length; i += 1) {
                        injectName = injectArray[i];
                        injectObj = injectMap[injectName];
                        if(injectObj === undefined) {
                            throw new PluginError(PLUGIN_NAME, 'Unexpected injection: "' + injectName + '"');
                        }

                        args.push(injectObj);
                    }

                    func.apply(null, args);

                    return this;
                }
            }
        }
    };

    context = vm.createContext(initSandbox);

    // creating a stream through which each file will pass
    stream = through.obj(function(file, enc, cb) {
        var i, definitionsLength,
            buffer = [],
            testSuite = {};

        function log(message) {
            buffer.push(message);
        }

        vm.runInContext(file.contents.toString(), context);

        serverCommand('stop', 'Stopping previous instance of test server...', 1);
        serverCommand('start', 'Starting new instance of test server...', 0);

        logger('Running tests...', 0);
        for(i = 0, definitionsLength = definitions.length; i < definitionsLength; i += 1) {
            logger('Request ' + (i + 1) + '/' + definitionsLength, 0);
            serverCommand('reset', 'Reseting database to initial state...', 1);
            endpointTest(definitions[i], testSuite);
        }

        serverCommand('stop', 'Stopping instance of test server...', 1);

        //TODO: Configure junit reporter
        // nodeunit.reporters.junit.run(testSuite);
        nodeunit.reporters.machineout.run(
            testSuite,
            {
                log: log
            },
            function(failures) {
                file.contents = new Buffer(buffer.join('\n'));
                file.path = gutil.replaceExtension(file.path, '.log');
                stream.push(file);

                stream.emit('end', failures);
            }
        );
        // nodeunit.reporters.default.run(testSuite, undefined, function(failures) {
            // stream.emit('end', failures);
        // });
    });

    // returning the file stream
    return stream;
};
