var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cleanCss  = require('gulp-clean-css');
var babel = require('gulp-babel'); 
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
//var uglify = require('gulp-uglify-es').default; // ES6

gulp.task('sw', function () {
  var bundler = browserify('sw.js'); // ['1.js', '2.js']

  return bundler
    .transform(babelify)    // required for ES6 'import' syntax
    .bundle()               // combine code
    .pipe(source('swNew.js'))  // get text stream; set destination filename
    .pipe(buffer())         // required to use stream w/ other plugin
    .pipe(uglify())         // condense & minify
    .pipe(gulp.dest('dist/js'));
});

gulp.task('cssDist', function () {
  return gulp.src('css/**/*.css')
    .pipe(concat('style.min.css'))
    .pipe(cleanCss())
    .pipe(gulp.dest('dist/css/'));
});

gulp.task('jsDist', function () {
  return gulp.src('js/**/*.js')
    .pipe(babel({ presets: ['env'] }))
    .pipe(concat('all.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js/'));
});

gulp.task('default', ['cssDist', 'jsDist', 'sw']);