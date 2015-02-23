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

var gulp = require('gulp'),
    jasmine = require('gulp-jasmine');

gulp.task('test', function(done){
    return gulp.src('spec/*.js')
        .pipe(jasmine());
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['test']);
