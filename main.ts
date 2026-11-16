// makefun-frontend-01 entry program (Node 22, standard library only).
//
// The entry is the static frontend in app/ beside this file: index.html plus
// its ES modules and stylesheet, no build step, reading make.fun's public API.
// This program hands it in: it copies app/ and screenshots/ into /output and
// writes /output/dossier.json with the vendored make.fun library, the same
// library the scorer uses — so the dossier it writes is the dossier the
// scorer expects, byte for byte. Leave vendor/makefun-frontend.ts untouched.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });

const shotsDir = join(outDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The scorer's own caps: the dossier text is capped at 160 KiB, at most 3
// screenshots of 256 KiB each, app/ at most 993 files and 16 MiB. An entry
// past any of those is refused here with the library's own words.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
