import { builtinModules } from 'module';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';

const { packageJson: pkg } = await readPackageUp({ cwd: import.meta.dirname });

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

const define = {
  '__define__.HTML_PARSER_VERSION': JSON.stringify(pkg.version),
};

export default defineConfig({
  define,
  build: {
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      external,
    },
  },
});
