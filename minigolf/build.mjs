import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
await build({
  absWorkingDir: root, entryPoints: ['minigolf/src/main.mjs'], outfile: 'minigolf/app.js',
  bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
});
console.log('Built StarMuff Mini Golf.');
