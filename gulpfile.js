var gulp = require('gulp'),
    jasmine = require('gulp-jasmine');

gulp.task('test', function(done){
    return gulp.src('spec/*.js')
        .pipe(jasmine());
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['test']);
