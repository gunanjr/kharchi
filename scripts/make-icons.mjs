// Builds the launcher icon, adaptive layers, splash, favicon and Play graphics from the brand mark.
// Source: assets/brand/mark.png (transparent). Run: node scripts/make-icons.mjs
// The app name is deliberately NOT drawn on any store graphic: the name is a separate founder decision.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const MARK = 'assets/brand/mark.png';
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const NONE = { r: 0, g: 0, b: 0, alpha: 0 };

/** The mark scaled to `frac` of a square canvas of `size`, centred. */
async function markAt(size, frac) {
  const m = sharp(MARK).resize({ width: Math.round(size * frac), height: Math.round(size * frac), fit: 'inside' });
  return m.toBuffer();
}
async function onCanvas(size, frac, background, out) {
  const buf = await markAt(size, frac);
  await sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: buf, gravity: 'centre' }]).png().toFile(out);
}

await onCanvas(1024, 0.66, WHITE, 'assets/icon.png');
await onCanvas(1024, 0.66, WHITE, 'assets/favicon.png');
await onCanvas(1024, 0.52, NONE, 'assets/android-icon-foreground.png');
await onCanvas(1024, 1, WHITE, 'assets/android-icon-background.png').catch(() => {});
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } }).png().toFile('assets/android-icon-background.png');
// themed (monochrome) icon: a white silhouette of the mark
const sil = await sharp(await markAt(1024, 0.52)).ensureAlpha().linear(0, 255).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: NONE } }).composite([{ input: sil, gravity: 'centre' }]).png().toFile('assets/android-icon-monochrome.png');
await onCanvas(1024, 0.7, NONE, 'assets/splash-icon.png');

// Play Store: 512x512 icon and a 1024x500 feature graphic (mark only, no name)
await onCanvas(1024, 0.66, WHITE, 'store/play-icon-1024.png');
await sharp('store/play-icon-1024.png').resize(512, 512).toFile('store/play-icon-512.png');
const g = await sharp(MARK).resize({ height: 380, fit: 'inside' }).toBuffer();
await sharp({ create: { width: 1024, height: 500, channels: 4, background: { r: 243, g: 241, b: 236, alpha: 1 } } }).composite([{ input: g, gravity: 'centre' }]).png().toFile('store/feature-graphic-1024x500.png');
writeFileSync('store/.generated', new Date().toISOString());
console.log('icons generated');
