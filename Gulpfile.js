/**
 * Created by staticfunction on 8/27/14.
 */
var gulp = require('gulp');
var ts = require('gulp-typescript');
var mocha = require('gulp-mocha');
var replace = require('gulp-replace');
var insert = require('gulp-insert');
var pkg = require('./package.json');
var del = require('del');
var merge = require('merge2');
var filter = require('gulp-filter');

var tsProject = ts.createProject({
    "declaration": true,
    "module": "commonjs"   
});

gulp.task('clean', function(cb) {
    del(['.build'], cb);
})

gulp.task('build', function() {
    var result = gulp.src(['src/**/*.ts', 'typings/tsd.d.ts'])
                    .pipe(ts(tsProject));
    
    return merge([
        result.js.pipe(gulp.dest('.build')),
        result.dts.pipe(gulp.dest('.build'))
    ])
});

gulp.task('test', ['build'], function() {
    return gulp.src('.build/**/*Spec.js', {read: false})
                .pipe(mocha({reporter: 'nyan'}));
})

gulp.task('dev', ['clean', 'build', 'test'], function() {
    gulp.watch(['src/**/*.ts', 'typings/tsd.d.ts'], ['build', 'test']);
})


gulp.task('clean-release', function(cb) {
    del(['dist'], cb);
})

gulp.task('release', ['clean-release'], function() {

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
