const gulp = require('gulp');
const babel = require('gulp-babel');
const replace = require('gulp-replace');
const del = require('del');
const { defaultOptions } = require('@gera2ld/plaid');
const pkg = require('./package.json');

const DIST = defaultOptions.distDir;

function clean() {
  return del([DIST, 'types']);
}

function build() {
  return gulp.src(['src/**/*.ts', '!**/*.d.ts'])
    .pipe(babel({
      root: '../..',
      presets: [
        ['@babel/preset-env', {
          loose: true,
        }],
      ],
      plugins: [
        ['@babel/plugin-transform-runtime', {
          version: '^7.5.0',
        }],
      ],
    }))
    .pipe(replace('process.env.VERSION', JSON.stringify(pkg.version)))
    .pipe(gulp.dest(DIST));
}

function watch() {
  gulp.watch('src/**', build);
}

exports.clean = clean;
exports.build = build;
exports.dev = gulp.series(build, watch);
