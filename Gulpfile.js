/**
 * Created by staticfunction on 8/27/14.
 */
var gulp = require('gulp');
var dts = require('dts-bundle');
var ts = require('gulp-tsc');
var mocha = require('gulp-mocha');

var BUILD_DIR = "bin-build";
var RELEASE_DIR = "bin-release";

//TODO: automate release to commonjs, amd and umd

gulp.task("compile", function() {
    var stream = gulp.src(['src/kola.ts', 'typings/tsd.d.ts'])
        .pipe(ts({
            module: "commonjs",
            declaration: true
        }))
        .pipe(gulp.dest(BUILD_DIR));

    return stream;
});

gulp.task('test', function() {
    return gulp.src('test/**/*.js', {read: false})
        .pipe(mocha({reporter: 'nyan'}));
});

gulp.task('bundle', function(cb) {
    dts.bundle({
        name: "kola",
        main: BUILD_DIR + '/kola.d.ts',
        out:  'kola.d.ts'
    });

    cb();
})

gulp.task('release', function() {
    gulp.src(BUILD_DIR + '/kola.js')
        .pipe(gulp.dest(RELEASE_DIR));

    gulp.src(['package.json','README.md','LICENSE'])
        .pipe(gulp.dest(RELEASE_DIR));

    gulp.src(BUILD_DIR + '/kola.d.ts').pipe(gulp.dest(RELEASE_DIR));
})
