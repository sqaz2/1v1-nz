import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const generator of ['pinball/extract.cjs', 'odyssey-tanks/build.cjs']) {
  execFileSync(process.execPath, [generator], { cwd: root, stdio: 'inherit' });
}
const tailwind = {
  name: 'original-component-styles',
  setup(builder) {
    builder.onLoad({ filter: /\.css$/ }, async ({ path: sourcePath }) => {
      const source = await readFile(sourcePath, 'utf8');
      const result = await postcss([tailwindcss({
        content: [path.join(root, 'simon/**/*.{tsx,ts,html}'), path.join(root, 'tetris/**/*.{tsx,ts,html}')],
        theme: { extend: {} }, plugins: [],
      })]).process(source, { from: sourcePath, map: false });
      return { contents: result.css, loader: 'css', resolveDir: path.dirname(sourcePath) };
    });
  },
};

for (const game of ['tetris', 'simon']) {
  await build({
    absWorkingDir: root,
    entryPoints: [`${game}/main.tsx`],
    outfile: `${game}/app.js`,
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    target: ['es2020'],
    minify: true,
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [tailwind],
  });
  console.log(`Built original StarMuff ${game}`);
}
