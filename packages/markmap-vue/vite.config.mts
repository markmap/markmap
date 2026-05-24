import { builtinModules } from 'module';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'vite';

const { packageJson: pkg } = await readPackageUp({ cwd: import.meta.dirname });

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

function isExternal(id: string) {
  return external.some((name) => id === name || id.startsWith(`${name}/`));
}

export default defineConfig({
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
      external: isExternal,
      output: {
        exports: 'named',
      },
    },
  },
});
