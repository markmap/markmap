import { builtinModules } from 'module';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';
import { versionLoader } from '../../util.mjs';

const getVersion = versionLoader(import.meta.url);
const { packageJson: pkg } = await readPackageUp();

// Bundle @babel/runtime to avoid requiring esm version in the output
const external = [...builtinModules, ...Object.keys(pkg.dependencies)];

export default defineConfig({
  define: {
    'process.env.TOOLBAR_VERSION': JSON.stringify(
      await getVersion('markmap-toolbar'),
    ),
  },
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external,
    },
  },
});
