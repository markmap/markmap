import plaid from '@gera2ld/plaid';
import pkg from './package.json' assert { type: 'json' };

const { getRollupPlugins, getRollupExternal, defaultOptions } = plaid;

const DIST = defaultOptions.distDir;
const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

export default async () => {
  const external = getRollupExternal(['d3', 'markmap-common']);
  const bundleOptions = {
    extend: true,
    esModule: false,
  };
  const postcssOptions = {
    inject: false,
    minimize: true,
  };
  const rollupConfig = [
    {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        esm: true,
        postcss: postcssOptions,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
      }),
      output: {
        format: 'esm',
        file: `${DIST}/index.js`,
        name: 'markmap',
        ...bundleOptions,
      },
    },
    {
      input: 'src/index.ts',
      external: ['d3'],
      plugins: getRollupPlugins({
        esm: true,
        postcss: postcssOptions,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
      }),
      output: {
        format: 'iife',
        file: `${DIST}/browser/index.js`,
        name: 'markmap',
        globals: {
          d3: 'd3',
        },
        ...bundleOptions,
      },
    },
  ];

  rollupConfig.forEach((item) => {
    item.output = {
      indent: false,
      // If set to false, circular dependencies and live bindings for external imports won't work
      externalLiveBindings: false,
      ...item.output,
      ...(BANNER && {
        banner: BANNER,
      }),
    };
  });

  return rollupConfig;
};
