import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
await build({
  absWorkingDir:root,
  entryPoints:['bomberman/src/main.mjs'],
  outfile:'bomberman/app.js',
  bundle:true,
  minify:true,
  format:'iife',
  target:'es2020',
  legalComments:'eof'
});
console.log('Built 3D Bomberman 1v1.');
