import plaid from '@gera2ld/plaid';
import { versionLoader } from '../../util.mjs';
import pkg from './package.json' assert { type: 'json' };

const { getRollupPlugins, defaultOptions } = plaid;
const getVersion = versionLoader(import.meta.url);

export default async () => {
  const DIST = defaultOptions.distDir;
  const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

  const replaceValues = {
    'process.env.D3_VERSION': JSON.stringify(await getVersion('d3')),
    'process.env.LIB_VERSION': JSON.stringify(await getVersion('markmap-lib')),
    'process.env.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
    'process.env.TOOLBAR_VERSION': JSON.stringify(await getVersion('markmap-toolbar')),
  };

  const globalList = [
  ];
  const bundleOptions = {
    extend: true,
    esModule: false,
  };
  const rollupConfig = [
    {
      input: 'src/index.ts',
      external: globalList,
      plugins: getRollupPlugins({
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
      output: {
        format: 'iife',
        file: `${DIST}/index.js`,
        name: 'markmap.autoLoader',
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
      ...BANNER && {
        banner: BANNER,
      },
    };
  });

  return rollupConfig;
};
