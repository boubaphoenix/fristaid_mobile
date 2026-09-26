#!/usr/bin/env node
// Regenerates the Android adaptive icon layers (+ the general icon/favicon/
// splash-icon that share the same mark) from a single flattened source logo,
// or from an already-separated foreground/background pair.
//
// Android's adaptive icon canvas is 108x108dp; content must stay inside the
// 66dp "safe zone" circle centered on it so no launcher mask clips it
// (see https://developer.android.com/develop/ui/views/launch/icon_design_adaptive).
//
// Usage:
//   node scripts/generate-adaptive-icon.mjs
//     -> reads assets/source/logo.png (flattened: mark + solid background baked in)
//   node scripts/generate-adaptive-icon.mjs --source path/to/logo.png
//   node scripts/generate-adaptive-icon.mjs --foreground path/to/mark.png --background "#173B2E"
//     -> mark.png must already be transparent around the shape

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets/images');

const CANVAS_SIZE = 1024; // master export resolution; Expo/EAS derive every mipmap density from this
const ICON_DP = 108;
const SAFE_ZONE_DP = 66;
const SAFE_ZONE_RATIO = SAFE_ZONE_DP / ICON_DP; // ~0.611 — max fraction of the canvas the mark may fill
const BG_MATCH_THRESHOLD = 24; // euclidean RGB distance below which a pixel counts as "background"

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--source') args.source = argv[++i];
    else if (key === '--foreground') args.foreground = argv[++i];
    else if (key === '--background') args.background = argv[++i];
  }
  return args;
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Auto-separates a flattened logo (solid background + mark) into a transparent mark. */
async function extractForeground(sourcePath) {
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const bg = { r: data[0], g: data[1], b: data[2] };
  const threshSq = BG_MATCH_THRESHOLD * BG_MATCH_THRESHOLD;

  const alpha = Buffer.alloc(width * height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const dr = data[i] - bg.r;
      const dg = data[i + 1] - bg.g;
      const db = data[i + 2] - bg.b;
      if (dr * dr + dg * dg + db * db > threshSq) {
        alpha[y * width + x] = 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    throw new Error('No foreground mark detected — the source image looks like a single flat color.');
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    rgba[p * 4] = data[p * channels];
    rgba[p * 4 + 1] = data[p * channels + 1];
    rgba[p * 4 + 2] = data[p * channels + 2];
    rgba[p * 4 + 3] = alpha[p];
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toBuffer();

  return { mark: cropped, bg };
}

/** Centers `mark` on a square canvas, scaled so its longest side fills `fraction` of the canvas. */
async function placeOnCanvas(mark, canvasSize, fraction, background) {
  const meta = await sharp(mark).metadata();
  const scale = (canvasSize * fraction) / Math.max(meta.width, meta.height);
  const targetW = Math.max(1, Math.round(meta.width * scale));
  const targetH = Math.max(1, Math.round(meta.height * scale));
  const resized = await sharp(mark).resize(targetW, targetH, { fit: 'inside' }).toBuffer();

  return sharp({ create: { width: canvasSize, height: canvasSize, channels: 4, background } })
    .composite([
      { input: resized, left: Math.round((canvasSize - targetW) / 2), top: Math.round((canvasSize - targetH) / 2) },
    ])
    .png()
    .toBuffer();
}

/** Flattens the mark's alpha shape into a single solid color, for Android's themed (monochrome) icon. */
async function silhouette(mark, color = { r: 0, g: 0, b: 0 }) {
  const { data, info } = await sharp(mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    out[p * 4] = color.r;
    out[p * 4 + 1] = color.g;
    out[p * 4 + 2] = color.b;
    out[p * 4 + 3] = data[p * 4 + 3];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let mark;
  let bg;

  if (args.foreground) {
    mark = await sharp(path.resolve(ROOT, args.foreground)).ensureAlpha().png().toBuffer();
    bg = hexToRgb(args.background ?? '#000000');
    console.log(`Foreground: ${args.foreground}`);
    console.log(`Background: ${args.background ?? '#000000'}`);
  } else {
    const sourcePath = path.resolve(ROOT, args.source ?? 'assets/source/logo.png');
    console.log(`Source: ${sourcePath}`);
    const extracted = await extractForeground(sourcePath);
    mark = extracted.mark;
    bg = extracted.bg;
    console.log(`Detected background: rgb(${bg.r}, ${bg.g}, ${bg.b})`);
  }

  console.log(`Safe zone: ${SAFE_ZONE_DP}dp / ${ICON_DP}dp canvas (mark fills up to ${(SAFE_ZONE_RATIO * 100).toFixed(1)}% of ${CANVAS_SIZE}px)`);

  const bgOpaque = { r: bg.r, g: bg.g, b: bg.b, alpha: 1 };
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  const foreground = await placeOnCanvas(mark, CANVAS_SIZE, SAFE_ZONE_RATIO, transparent);
  await sharp(foreground).toFile(path.join(IMAGES_DIR, 'android-icon-foreground.png'));

  const background = await sharp({ create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4, background: bgOpaque } })
    .png()
    .toBuffer();
  await sharp(background).toFile(path.join(IMAGES_DIR, 'android-icon-background.png'));

  const monoMark = await silhouette(mark);
  const monochrome = await placeOnCanvas(monoMark, CANVAS_SIZE, SAFE_ZONE_RATIO, transparent);
  await sharp(monochrome).toFile(path.join(IMAGES_DIR, 'android-icon-monochrome.png'));

  // General app icon (iOS fallback / legacy Android launcher / web): mark on its own background, larger fill.
  const icon = await placeOnCanvas(mark, CANVAS_SIZE, 0.62, bgOpaque);
  await sharp(icon).flatten({ background: bgOpaque }).toFile(path.join(IMAGES_DIR, 'icon.png'));

  const favicon = await sharp(icon).resize(48, 48).toBuffer();
  await sharp(favicon).toFile(path.join(IMAGES_DIR, 'favicon.png'));

  // Splash screen keeps the app's existing 228x213 canvas, mark only, transparent background.
  const splashW = 228;
  const splashH = 213;
  const markMeta = await sharp(mark).metadata();
  const splashScale = (splashW * 0.7) / Math.max(markMeta.width, markMeta.height);
  const splashMark = await sharp(mark)
    .resize(Math.round(markMeta.width * splashScale), Math.round(markMeta.height * splashScale), { fit: 'inside' })
    .toBuffer();
  const splashMarkMeta = await sharp(splashMark).metadata();
  const splash = await sharp({ create: { width: splashW, height: splashH, channels: 4, background: transparent } })
    .composite([
      {
        input: splashMark,
        left: Math.round((splashW - splashMarkMeta.width) / 2),
        top: Math.round((splashH - splashMarkMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();
  await sharp(splash).toFile(path.join(IMAGES_DIR, 'splash-icon.png'));

  console.log(`Background color for app.json (adaptiveIcon.backgroundColor / splash backgroundColor): #${[bg.r, bg.g, bg.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`);
  console.log('Done — wrote icon.png, favicon.png, splash-icon.png, android-icon-{foreground,background,monochrome}.png');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
