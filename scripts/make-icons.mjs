// Generates launcher icon, adaptive icon layers, splash and Play feature graphic from SVG. Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const TERRA = '#B8400E';
const CREAM = '#FFF6E6';
const glyph = (stroke, scale = 1, cx = 512, cy = 512) => `
<g transform="translate(${cx} ${cy}) scale(${scale}) translate(-480 -535)" fill="none" stroke="${stroke}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round">
  <path d="M300 300H724"/><path d="M300 420H724"/>
  <path d="M340 300H480C640 300 650 520 480 520H340"/><path d="M340 520L640 770"/>
</g>`;
const svg = (inner, w = 1024, h = 1024) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const png = (inner, out, w = 1024, h = 1024) => sharp(svg(inner, w, h)).png().toFile(out);

// full-bleed icon (also used for iOS / stores)
await png(`<rect width="1024" height="1024" fill="${TERRA}"/><circle cx="512" cy="512" r="330" fill="none" stroke="${CREAM}" stroke-opacity=".25" stroke-width="14"/>${glyph(CREAM, 1)}`, 'assets/icon.png');
// adaptive layers (content inside the 66% safe zone)
await png(`<rect width="1024" height="1024" fill="${TERRA}"/>`, 'assets/android-icon-background.png');
await png(glyph(CREAM, 0.72), 'assets/android-icon-foreground.png');
await png(glyph('#FFFFFF', 0.72), 'assets/android-icon-monochrome.png');
await png(glyph(TERRA, 1), 'assets/splash-icon.png');
await png(`<rect width="1024" height="1024" fill="${TERRA}"/>${glyph(CREAM, 0.7)}`, 'assets/favicon.png', 1024, 1024);
// Play Store: 512x512 icon + 1024x500 feature graphic
await png(`<rect width="1024" height="1024" fill="${TERRA}"/>${glyph(CREAM, 1)}`, 'store/play-icon-1024.png');
await sharp('store/play-icon-1024.png').resize(512, 512).toFile('store/play-icon-512.png');
await png(
  `<rect width="1024" height="500" fill="#F6EEDF"/><rect x="0" y="0" width="360" height="500" fill="${TERRA}"/>${glyph(CREAM, 0.5, 180, 250)}
   <text x="400" y="230" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="96" fill="#1E1812">Kharchi</text>
   <text x="402" y="300" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#6B5F4F">Track every rupee. Split without limits.</text>`,
  'store/feature-graphic-1024x500.png', 1024, 500);
writeFileSync('store/.generated', new Date().toISOString());
console.log('icons generated');
