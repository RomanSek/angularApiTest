(function() {
    'use strict';
    // jscs:disable
    angular.module('angulardashDev',['ngMockE2E'])
        .config(['$httpProvider', function($httpProvider) {
            throw new Error('Non "run" functions should not be run by API tests');
        }])
        //mock backend
        .run(['loginBackend', '$httpBackend', 'AppSettings', function(loginBackend, $httpBackend, AppSettings) {
            var backendApi = AppSettings.backendApi;

            loginBackend.config(
                function(method, url, data, headers) {
                    return data.email;
                },
                function(status, data, headers, statusText) {
                    return data.token;
                },
                function(status, data, headers, statusText, session) {
                    data.token = session;
                    return [status, data, headers, statusText];
                },
                function(session) {
                    return {
                        // 'Accept': 'application/json, text/plain, */*',
                        'Authorization': 'Token ' + session
                    };
                }
            );

            // Login attempts
            loginBackend.when(
                'POST',
                backendApi + 'tokens',
                {
                    email: 'test@example.com',
                    password: '123qwe'
                }
            ).respond(
                201,
                {
                    token: '9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b'
                }
            );

            $httpBackend.whenPOST(
                backendApi + 'tokens',
                {
                    email: 'nonExistingUser@example.com',
                    password: 'none'
                }
            ).respond(
                400,
                {
                    non_field_errors: ['Unable to log in with provided credentials.']
                }
            );

            // Get element list (filtered)
            $httpBackend.whenGET(
                backendApi + 'element?id=1'
            ).respond(
                403,
                {
                    non_field_errors: ['Authorization required']
                }
            );

            $httpBackend.whenGET(
                backendApi + 'element?id=1',
                loginBackend.session('test@example.com')
            ).respond(
                200,
                [
                    {
                        id: 1,
                        name: 'dummy element'
                    }
                ]
            );

            // Create new element
            $httpBackend.whenPOST(
                backendApi + 'element',
                {
                    name: 'new element'
                }
            ).respond(
                403,
                {
                    non_field_errors: ['Authorization required']
                }
            );

            $httpBackend.whenPOST(
                backendApi + 'element',
                {
                    name: 'new element'
                },
                loginBackend.session('test@example.com')
            ).respond(
                200,
                {
                    id: 2,
                    name: 'new element'
                }
            );

            // Update element
            $httpBackend.whenPUT(
                backendApi + 'element/1',
                {
                    id: 1,
                    name: 'updated element'
                }
            ).respond(
                403,
                {
                    non_field_errors: ['Authorization required']
                }
            );

            $httpBackend.whenPUT(
                backendApi + 'element/1',
                {
                    id: 1,
                    name: 'updated element'
                },
                loginBackend.session('test@example.com')
            ).respond(
                200,
                {
                    id: 1,
                    name: 'updated element'
                }
            );

            // Apply partial modification of element
            $httpBackend.whenPATCH(
                backendApi + 'element/1',
                {
                    name: 'changed element'
                }
            ).respond(
                403,
                {
                    non_field_errors: ['Authorization required']
                }
            );

            $httpBackend.whenPATCH(
                backendApi + 'element/1',
                {
                    name: 'changed element'
                },
                loginBackend.session('test@example.com')
            ).respond(
                200,
                {
                    id: 1,
                    name: 'changed element'
                }
            );

            // Delete element
            $httpBackend.whenDELETE(
                backendApi + 'element/1'
            ).respond(
                403,
                {
                    non_field_errors: ['Authorization required']
                }
            );

            $httpBackend.whenDELETE(
                backendApi + 'element/1',
                loginBackend.session('test@example.com')
            ).respond(
                204,
                ''
            );


            // Passthrough
            $httpBackend.whenGET(/.*/).passThrough();
            $httpBackend.whenPOST(/.*/).passThrough();
            $httpBackend.whenPUT(/.*/).passThrough();
            $httpBackend.whenDELETE(/.*/).passThrough();
            $httpBackend.whenPATCH(/.*/).passThrough();
        }]);

    angular.module('angulardash').requires.push('angulardashDev');
})();
