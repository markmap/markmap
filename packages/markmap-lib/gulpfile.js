const fs = require('fs');
const gulp = require('gulp');
const babel = require('gulp-babel');
const replace = require('gulp-replace');
const log = require('fancy-log');
const rollup = require('rollup');
const del = require('del');
const { defaultOptions } = require('@gera2ld/plaid');
const rollupConfig = require('./rollup.conf');
const pkg = require('./package.json');

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
    .pipe(replace('process.env.VERSION', JSON.stringify(pkg.version)))
    .pipe(replace('process.env.TEMPLATE', JSON.stringify(TEMPLATE)))
    .pipe(gulp.dest(DIST));
}

function buildRollup() {
  return Promise.all(rollupConfig.map(async (config) => {
    const bundle = await rollup.rollup(config);
    await bundle.write(config.output);
  }));
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

const safeBuildJs = wrapError(buildRollup);
const build = gulp.parallel(buildCjs, safeBuildJs);

exports.clean = clean;
exports.build = build;
exports.dev = gulp.series(build, watch);
