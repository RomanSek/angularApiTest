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
(function() {
    'use strict';
    // jscs:disable
    angular.module('angulardashDev',['ngMockE2E', 'ccMockE2E'])
        .config(['$httpProvider', function($httpProvider) {
            throw new Error('Non "run" functions should not be run by API tests');
        }])
        //mock backend
        .run(['ccLoginBackend', '$httpBackend', 'AppSettings', function(ccLoginBackend, $httpBackend, AppSettings) {
            var backendApi = AppSettings.backendApi;

            ccLoginBackend.config(
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
            ccLoginBackend.when(
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
                ccLoginBackend.session('test@example.com')
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
                ccLoginBackend.session('test@example.com')
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
                ccLoginBackend.session('test@example.com')
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
                ccLoginBackend.session('test@example.com')
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
                ccLoginBackend.session('test@example.com')
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
