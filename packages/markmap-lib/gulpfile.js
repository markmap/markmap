const fs = require('fs');
const gulp = require('gulp');
const babel = require('gulp-babel');
const replace = require('gulp-replace');
const log = require('fancy-log');
const del = require('del');
const { defaultOptions } = require('@gera2ld/plaid');
const pkgView = require(require.resolve('markmap-view/package.json'));

const DIST = defaultOptions.distDir;
const TEMPLATE = fs.readFileSync('templates/markmap.html', 'utf8');

function clean() {
  return del([DIST, 'types']);
}

function buildCjs() {
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
    .pipe(replace('process.env.VIEW_VERSION', JSON.stringify(pkgView.version)))
    .pipe(replace('process.env.TEMPLATE', JSON.stringify(TEMPLATE)))
    .pipe(gulp.dest(DIST));
}

function wrapError(handle) {
  const wrapped = () => handle()
  .catch(err => {
    log(err.toString());
  });
  wrapped.displayName = handle.name;
  return wrapped;
}

function watch() {
  gulp.watch('src/**', build);
}

const build = buildCjs;

exports.clean = clean;
exports.build = build;
exports.dev = gulp.series(build, watch);
