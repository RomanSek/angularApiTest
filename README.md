# angular-api-test

## What is it?
It's a gulp plugin that can be used to compare mocked responces for E2E tests with actual responces from an instance of
test server. Plugin expects that test server will be using some kind of persistent storage (e.g. database) and runs
scripts to restore this storage between tests.

## How it works?
Plugin parses provided angular modules with mockup responce definitions for E2E tests and executes them replacing
[$httpBackend](https://docs.angularjs.org/api/ngMockE2E/service/$httpBackend) service with it's own implementation to
gather all mocked responces.

After that it starts test server and runs a test for each defined response. Before each test persistent storage of test
server is restored and request is send. Test compares responce from test server with expected result (it includes
response code, body and headers).

When all tests are finnished plugin stops test server and returns results using selected reporter.

## Is there authentication support?
Yes. Plugin also provides it's own implementation of
[ccLoginBackend](https://github.com/ClearcodeHQ/angular-login-backend) service. This service can be used to register
login requests and run them before testing request that requires authentication. Usage details are in
[ccLoginBackend](https://github.com/ClearcodeHQ/angular-login-backend) docs.

## How to install?
```bash
npm install ClearcodeHQ/angular-api-test --save-dev
```

## How to use it in a task?
Plugin should be configured using options object. Here's full list of options:

* debug - **Int** *optional* Allowed values: 0-2. 0 is default value and will output least information.
* reporter - **String**|**Function** *optional* Reporter to use.
    Tests are run using [nodeunit](https://github.com/caolan/nodeunit) so any reporter for it can be selected.

    > **WARNING**: Nodeunit reporters have problems with running tests from modules (only default reporter can do that).
    Currently plugin uses [pached version](https://github.com/RomanSek/nodeunit/tree/modules_reporters) that allows to
    use more reporters.

    Values: 'default' (default), 'machineout', 'junit'.
* reporterOptions - **Object** *optional* Contains reporter specific options (e.g. 'junit' reporter requires output
    option with path of output file).
* server - **Object** This object contains paths to executable scripts and optional configuration:
    * start - **String** Path to script that starts server (it should end execution when serer is ready to respond).
    * stop - **String** Path to script that stops server.
    * reset - **String** Path to script that resets state of server (database reset).
    * config - **Object** *optional* Contains server configuration:
        * protocol - **String** *optional* Protocol used when communicating with server (default: "http").
        * host - **String** *optional* Host name used when communicating with server (default: "127.0.0.1").
        * port - **String**|**Number** *optional* Port used when communicating with server (default: 9876).
* injectMap - **Object** *optional* This object is an injection map used by plugin during execution of
    `angular.module('whatever').run()` parts of provided **src** files. If such a function uses any services other than
    those provided by the plugin ([$httpBackend](https://docs.angularjs.org/api/ngMockE2E/service/$httpBackend) and
    [ccLoginBackend](https://github.com/ClearcodeHQ/angular-login-backend)) - mockups of them must be provided here.

### Example

```javascript
var gulp = require('gulp'),
    angularApiTest = require('angular-api-test');

gulp.task('test-api', function() {
    return gulp.src(['src/app/e2e-mocks.js']).pipe(angularApiTest(
        {
            debug: 0,
            reporter: 'junit',
            reporterOptions: {
                output: 'var/test-api.xml'
            },
            server: {
                config: {
                    protocol: 'http',
                    host: '127.0.0.1',
                    port: 9876,
                },
                start: 'bin/start_test_server.sh',
                stop: 'bin/stop_test_server.sh',
                reset: 'bin/clean_test_server.sh'
            },
            injectMap: {
                AppSettings: {
                    backendApi: '/api/v1/'
                }
            }
        }
    ));
});
```

## Are there differences in usage of plugin implementation of services?
Yes. Plugin implementation accepts few additional parameters. They are always positioned last so angular services will
ignore them.

### $httpBackend.when(method, url, data, headers, options)
`options` - **Object** *optional* Additional parameter expected by plugin implementation of
[$httpBackend](https://docs.angularjs.org/api/ngMockE2E/service/$httpBackend) service:

* skip - **Boolean** *optional* Indicator for plugin to skip this request in tests.

    Defalt value: `false`.

    ```javascript
    $httpBackend.whenGET(
        '/api/not_implemented_yet',
        undefined,
        {
            skip: true
        }
    ).respond(
        200,
        {
            'message': 'I\'ll be back.'
        }
    );
    ```
* extraHeaders - **Object** *optional* Headers object that contains extra headers. They are not expected to be send by
    angular application, just by plugin. Those headers can be used by test server to force behavior that is normally
    triggered by complicated or non deterministic rules. For example adding `{'X-bot':'true'}` header can force test
    server to return response normally triggered by exceeding a limit of requests in a period.

    Default value: `{}`.

    ```javascript
    $httpBackend.whenPOST(
        '/api/users',
        {
            email: 'bot@example.com',
            password: 'password attempt'
        },
        undefined,
        {
            extraHeaders: {
                'X-bot': 'true'
            }
        }
    ).respond(
        400,
        {
            error: 'You send too many requests in last minute. Please wait a while and try again.'
        }
    );
    ```

### Respond method
Both services ([$httpBackend](https://docs.angularjs.org/api/ngMockE2E/service/$httpBackend) and
[ccLoginBackend](https://github.com/ClearcodeHQ/angular-login-backend)) `when` methods return object with `respond`
method. Plugin is aware of additional parameter not covered by respective documentation:

`respond([status,] data[, headers, statusText, responseOverride])`

`responseOverride(status, data, headers, statusText)` *optional* Function accepting test server response and returning
transformed response with overwritten elements generated by endpoint (e.g. token).

Return value should be an array: `[status, data, headers, statusText]`

### Example

```javascript
$httpBackend.whenPOST(
    '/api/users',
    {
        email: 'newUser@test.pl',
        password: 'new password'
    }
).respond(
    201,
    {
        id: 2,
        email: 'newUser@test.pl',
        token: '8c92a1ea7ee011e4ba898c89a5640f47'
    },
    undefined,
    undefined,
    function(status, data, headers, statusText) {
        data.token = '8c92a1ea7ee011e4ba898c89a5640f47';
        data.id = 2;
        return [status, data, headers, statusText];
    }
);
```

## TODO List

* Add check that compares original test server response with response changed by `responseOverride` (types, length).
* Create unit tests.
* Separate independent parts into modules.
* Add integration tests for parameters described in
    **Are there differences in usage of plugin implementation of services?** section.
