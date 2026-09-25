// Build the release copy of theme.css into dist/: the same stylesheet without
// its comments. The repository keeps the explanations; the file users download
// doesn't need them, and the community directory flags themes over 100 KiB.
// The first comment stays — it carries the license and the font credits.
//
// Usage: npm run build   (fails on any lint problem or if the file is too big)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';

const LIMIT = 100 * 1024;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'theme.css');

const source = await readFile(join(root, 'theme.css'), 'utf8');
let seenHeader = false;
const stripped = source
  .replace(/\/\*[\s\S]*?\*\//g, (comment) => (seenHeader ? '' : ((seenHeader = true), comment)))
  .split('\n').map((line) => line.trimEnd()).join('\n') // what inline comments leave behind
  .replace(/\n{3,}/g, '\n\n'); // gaps where comment blocks stood

// The emptied lines break the lint's blank-line rules in places; --fix settles them.
const { code, results } = await stylelint.lint({ code: stripped, codeFilename: out, fix: true });
const problems = results.flatMap((r) => r.warnings);
if (problems.length) {
  for (const p of problems) console.error(`${p.line}:${p.column} ${p.text}`);
  process.exit(1);
}

await mkdir(dirname(out), { recursive: true });
await writeFile(out, code);
const size = Buffer.byteLength(code);
console.log(`dist/theme.css: ${size.toLocaleString('en')} bytes (limit ${LIMIT.toLocaleString('en')})`);
if (size >= LIMIT) {
  console.error('Too big for the community directory: trim theme.css or the fonts.');
  process.exit(1);
}
