import { builtinModules } from 'module';
import plaid from '@gera2ld/plaid';
import { versionLoader } from '../../util.mjs';
import pkg from './package.json' assert { type: 'json' };

const { getRollupPlugins, defaultOptions } = plaid;

export default async () => {
  const DIST = defaultOptions.distDir;
  const BANNER = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;
  const getVersion = versionLoader(import.meta.url);

  const replaceValues = {
    'process.env.TOOLBAR_VERSION': JSON.stringify(await getVersion('markmap-toolbar')),
  };

  // Bundle @babel/runtime to avoid requiring esm version in the output
  const external = [
    ...builtinModules,
    ...Object.keys(pkg.dependencies),
  ];
  const bundleOptions = {
    extend: true,
    esModule: false,
  };
  const rollupConfig = [
    {
      input: 'src/index.ts',
      external,
      plugins: getRollupPlugins({
        esm: true,
        extensions: defaultOptions.extensions,
        babelConfig: {
          rootMode: 'upward',
        },
        replaceValues,
      }),
      output: {
        format: 'es',
        file: `${DIST}/index.js`,
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
