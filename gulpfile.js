var gulp = require('gulp'),
    server = require('./gulp/server'),
    jasmine = require('gulp-jasmine');

gulp.task('test', function(done){
    return gulp.src('spec/*.js')
        .pipe(jasmine());
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['test']);
