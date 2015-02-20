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

// consts
var PLUGIN_NAME = 'angularApiTest';

module.exports = function(options) {
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
            log: function() {
                logger((arguments.length === 1) ? arguments[1] : arguments, 2);
            },
            error: function() {
                logger((arguments.length === 1) ? arguments[1] : arguments, 1);
            }
        },
        stream, initSandbox, context, httpBackend, loginBackend, definitions;

    options.debug = options.debug || 0;
    options.reporter = options.reporter || 'default';

    if(!options.server) {
        throw new PluginError(PLUGIN_NAME, 'Missing server section in options');
    }

    options.server.config = options.server.config || {};
    options.server.config.protocol = options.server.config.protocol || 'http';
    options.server.config.host = options.server.config.host || '127.0.0.1';
    options.server.config.port = options.server.config.port || 9876;
    options.injectMap = options.injectMap || {};

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
            result = shell.exec(
                [
                    options.server[command],
                    options.server.config.protocol,
                    options.server.config.host,
                    options.server.config.port
                ].join(' '),
                {
                    silent: options.debug < 2
                }
            );
            if(result.code != 0) {
                throw new PluginError(PLUGIN_NAME, 'Unexpected server command error: ' + result.code);
            }
        }
        else {
            throw new PluginError(PLUGIN_NAME, 'Unexpected server command');
        }
    };

    function httpRequest(request) {
        var req, resp, attr, result, requestOptions,
            url = options.server.config.protocol + '://' + options.server.config.host + ':' +
                options.server.config.port + request.url;

        requestOptions = {
            headers: request.headers || {}
        };

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

    options.injectMap.$httpBackend = httpBackend;
    options.injectMap.ccLoginBackend = loginBackend;

    initSandbox = {
        console: fakeConsole,
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
                        injectObj = options.injectMap[injectName];
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

        options.log = log;

        nodeunit.reporters[options.reporter].run(
            testSuite,
            options,
            function(failures) {
                file.contents = new Buffer(buffer.join('\n'));
                file.path = gutil.replaceExtension(file.path, '.log');
                stream.push(file);

                stream.emit('end', failures);
            }
        );
    });

    // returning the file stream
    return stream;
};
