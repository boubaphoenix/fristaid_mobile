#!/usr/bin/env node
// Bundles src/sw/sw-src.ts (TypeScript + workbox-* imports from
// node_modules) into a single classic script with esbuild, then runs
// Workbox's injectManifest to replace self.__WB_MANIFEST with the real
// list of exported files — producing the final dist/sw.js.
//
// Must run AFTER `expo export -p web` (it reads from dist/).

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { injectManifest } from 'workbox-build';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const SW_SRC = path.join(ROOT, 'src/sw/sw-src.ts');
const SW_BUNDLED = path.join(DIST_DIR, '_sw-bundled.js');
const SW_DEST = path.join(DIST_DIR, 'sw.js');

async function main() {
  await esbuild.build({
    entryPoints: [SW_SRC],
    bundle: true,
    format: 'iife', // classic script — avoids module-service-worker browser support gaps
    platform: 'browser',
    target: 'es2019',
    outfile: SW_BUNDLED,
    logLevel: 'info',
  });

  const { count, size, warnings } = await injectManifest({
    swSrc: SW_BUNDLED,
    swDest: SW_DEST,
    globDirectory: DIST_DIR,
    // Exclut le bundle intermédiaire et le SW lui-même de leur propre
    // manifeste précaché (non-sens / fichiers jetables).
    globIgnores: ['_sw-bundled.js', 'sw.js'],
    globPatterns: ['**/*.{js,html,json,png,ico,woff2}'],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  });

  if (warnings.length > 0) {
    console.warn('workbox-build warnings:', warnings);
  }
  console.log(`Service worker written: ${SW_DEST} (${count} files precached, ${(size / 1024 / 1024).toFixed(1)} MB)`);

  await import('node:fs/promises').then((fs) => fs.unlink(SW_BUNDLED));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
