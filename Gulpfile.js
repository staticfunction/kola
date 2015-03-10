/**
 * Created by staticfunction on 8/27/14.
 */
var gulp = require('gulp');
var dts = require('dts-bundle');
var ts = require('gulp-typescript');
var mocha = require('gulp-mocha');
var replace = require('gulp-replace');
var insert = require('gulp-insert');
var pkg = require('./package.json');
var del = require('del');
var merge = require('merge2');

var BUILD_DIR = "bin-build";

//TODO: automate release to commonjs, amd and umd

gulp.task("compile", function() {
    var stream = gulp.src(['src/kola.ts','typings/tsd.d.ts'])
        .pipe(ts({
            module: "commonjs",
            declaration: true
        }))
        .pipe(gulp.dest(BUILD_DIR));

    return stream;
});

gulp.task('test', ['compile'], function() {
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

gulp.task('clean', function(cb) {
    del(['dist'], cb);
})

gulp.task('release', ['clean'], function() {

    var commonjs = gulp.src(['src/kola.ts', 'typings/tsd.d.ts'])
                    .pipe(ts({
                        declarationFiles: true,
                        module: 'commonjs',
                        noExternalResolve: false
        }));

    var amd = gulp.src(['src/kola.ts', 'typings/tsd.d.ts'])
                    .pipe(ts({
                        module: 'amd',
                        noExternalResolve: false
                    }));

    return merge([
        commonjs.dts
            .pipe(replace(/declare\s/g, ''))
            .pipe(insert.wrap('declare module \"'+ pkg.name +'\" {\n', '\n}'))
            .pipe(gulp.dest('dist')),
        commonjs.js
            .pipe(gulp.dest('dist')),
        amd.js
            .pipe(gulp.dest('dist/amd'))
    ])
})
