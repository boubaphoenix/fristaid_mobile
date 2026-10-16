#!/usr/bin/env node
// Redimensionne et recompresse en place les photos de contenu (étapes de
// leçon, accueil) — ces fichiers sont actuellement en très haute
// résolution (jusqu'à ~1800x2400) alors qu'ils s'affichent en petit sur
// un téléphone. Le public cible a des connexions 3G instables et des
// données chères (voir plan PWA), donc leur poids compte directement.
//
// Même nom de fichier, même extension .jpg en sortie : aucun changement
// de code ailleurs. Quand les visuels définitifs remplaceront ces
// placeholders (voir TODO dans homeAssets.ts / lessonStepImages.ts),
// relancer ce script dessus aussi pour garder l'app légère.
//
// Usage: node scripts/optimize-content-images.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIRS = [path.join(ROOT, 'assets/images/home'), path.join(ROOT, 'assets/images/lesson-steps')];

// Longueur max du plus grand côté : large marge pour un écran haute
// densité (2x/3x) affichant l'image sur ~500-600px de large en logique.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 78;

async function optimizeFile(filePath) {
  const before = fs.statSync(filePath).size;
  const image = sharp(filePath).rotate(); // applique l'orientation EXIF puis la retire
  const meta = await image.metadata();

  const needsResize = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_DIMENSION;
  const pipeline = needsResize
    ? image.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    : image;

  const buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();

  // Ne jamais réécrire si, pour une raison quelconque, le résultat est
  // plus gros que l'original (petit fichier déjà optimisé). Écrit dans un
  // fichier temporaire puis renomme : sharp/libvips peut garder le
  // fichier source ouvert sous Windows, ce qui fait échouer une écriture
  // directe sur le même chemin.
  if (buffer.length < before) {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);
    return { before, after: buffer.length, resized: needsResize };
  }
  return { before, after: before, resized: false, skipped: true };
}

async function main() {
  let totalBefore = 0;
  let totalAfter = 0;
  let count = 0;

  for (const dir of DIRS) {
    const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const result = await optimizeFile(filePath);
      totalBefore += result.before;
      totalAfter += result.after;
      count += 1;
      const pct = (100 * (1 - result.after / result.before)).toFixed(0);
      console.log(
        `${result.skipped ? '· skip ' : '✓ '}${path.relative(ROOT, filePath)} — ${(result.before / 1024).toFixed(0)}KB → ${(result.after / 1024).toFixed(0)}KB (${pct}%)`,
      );
    }
  }

  console.log(
    `\n${count} fichiers — total ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
