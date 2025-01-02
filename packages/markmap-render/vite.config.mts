import { readFile } from 'fs/promises';
import { builtinModules } from 'module';
import { join } from 'path';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mts';

const getVersion = versionLoader(import.meta.dirname);
const { packageJson: pkg } = await readPackageUp({ cwd: import.meta.dirname });

const TEMPLATE = await readFile(
  join(import.meta.dirname, 'templates/markmap.html'),
  'utf8',
);
const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  '__define__.TEMPLATE': JSON.stringify(TEMPLATE),
  '__define__.D3_VERSION': JSON.stringify(await getVersion('d3')),
  '__define__.VIEW_VERSION': JSON.stringify(await getVersion('markmap-view')),
};

export default defineConfig({
  define,
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
      },
      fileName: '[name]',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      external,
    },
  },
});
