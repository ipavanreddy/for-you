/* Rebuilds the static site and refreshes docs/, which GitHub Pages serves. */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = '/for-you';

execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_BASE_PATH: BASE } });

fs.rmSync('docs', { recursive: true, force: true });
fs.renameSync('out', 'docs');
// Without this, GitHub Pages runs Jekyll, which skips every _next/ folder.
fs.writeFileSync('docs/.nojekyll', '');

console.log(`\ndocs/ refreshed — the site will be served from ${BASE}/`);
