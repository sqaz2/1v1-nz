import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
await build({
  absWorkingDir: root, entryPoints: ['smackzone/main.tsx'], outfile: 'smackzone/app.js',
  bundle: true, minify: true, format: 'esm', jsx: 'automatic', target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': resolve(root, 'smackzone/src') },
  plugins: [{ name: 'original-starmuff-media', setup(builder) {
    builder.onResolve({ filter: /^@assets\// }, ({ path }) => ({ path: path.slice(8), namespace: 'starmuff-media' }));
    builder.onLoad({ filter: /.*/, namespace: 'starmuff-media' }, ({ path }) => ({
      contents: 'export default ' + JSON.stringify('https://starmuff-away.pages.dev/bridge-assets/media/' + encodeURIComponent(path)), loader: 'js',
    }));
  } }],
});
console.log('Built original Smackzone arcade.');
