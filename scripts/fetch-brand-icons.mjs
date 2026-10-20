// Build-time only (never runs in the app). Fetches each merchant's own site icon once, normalises it to a small PNG
// in assets/brands/, and writes src/features/brands/images.ts. Re-run to refresh; review the contact sheet before use.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets/brands');
const list = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'brand-list.json'), 'utf8'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const slug = (n) => n.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function get(url, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: ctl.signal });
    if (!r.ok) return null;
    return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || '', url: r.url };
  } catch { return null; } finally { clearTimeout(t); }
}

async function candidates(domain) {
  const out = [];
  for (const base of [`https://www.${domain}/`, `https://${domain}/`]) {
    const page = await get(base);
    if (!page || !/html/.test(page.type)) continue;
    const html = page.buf.toString('utf8').slice(0, 400000);
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
      const tag = m[0];
      const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
      if (!/icon/.test(rel)) continue;
      const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
      if (!href || href.startsWith('data:')) continue;
      const size = parseInt(/sizes=["'](\d+)x\d+/i.exec(tag)?.[1] ?? '0', 10);
      let u; try { u = new URL(href, page.url).toString(); } catch { continue; }
      if (/\.(svg|ico)(\?|$)/i.test(u)) continue;
      out.push({ u, score: (rel.includes('apple') ? 1000 : 0) + size });
    }
    const mf = /<link\b[^>]*rel=["']manifest["'][^>]*>/i.exec(html)?.[0];
    const mhref = mf && /href=["']([^"']+)["']/i.exec(mf)?.[1];
    if (mhref) {
      try {
        const m = await get(new URL(mhref, page.url).toString());
        const j = m && JSON.parse(m.buf.toString('utf8'));
        for (const ic of j?.icons ?? []) {
          const sz = parseInt(String(ic.sizes ?? '').split(' ').pop()?.split('x')[0] ?? '0', 10);
          if (/svg/.test(ic.type ?? '') || /\.svg/.test(ic.src ?? '')) continue;
          out.push({ u: new URL(ic.src, new URL(mhref, page.url)).toString(), score: 500 + sz });
        }
      } catch {}
    }
    if (out.length) break;
  }
  out.sort((a, b) => b.score - a.score);
  const direct = ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png', 'favicon.png'].map((f) => ({ u: `https://${domain}/${f}`, score: 0 }));
  return [...out, ...direct, { u: `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`, score: -1, weak: true }];
}

const MIN_SRC = 128; // below this the picture would be stretched and look soft
const globe = new Set();
async function loadGlobeHashes() {
  const r = await get('https://www.google.com/s2/favicons?domain=this-domain-does-not-exist-zzqq.example&sz=128');
  if (r) globe.add(crypto.createHash('md5').update(r.buf).digest('hex'));
}

async function normalise(buf) {
  const img = sharp(buf, { failOn: 'none' });
  const meta = await img.metadata();
  if (!meta.width || !meta.height) return null;
  const src = Math.min(meta.width, meta.height);
  if (src < MIN_SRC) return null;
  if (Math.max(meta.width, meta.height) / Math.min(meta.width, meta.height) > 1.25) return null;
  const hasAlpha = !!meta.hasAlpha;
  let pipeline = sharp(buf, { failOn: 'none' }).ensureAlpha();
  const raw = await pipeline.clone().resize(32, 32, { fit: 'cover' }).raw().toBuffer();
  let sum = 0, n = 0, opaque = 0;
  for (let i = 0; i < raw.length; i += 4) { const a = raw[i + 3]; if (a > 40) { opaque++; sum += (0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2]) * a / 255; n += a / 255; } }
  if (opaque < 32 * 32 * 0.05) return null; // empty
  const lum = n ? sum / n / 255 : 0;
  const transparent = hasAlpha && opaque < 32 * 32 * 0.9;
  const bg = transparent ? (lum > 0.88 ? { r: 26, g: 26, b: 26, alpha: 1 } : { r: 255, g: 255, b: 255, alpha: 1 }) : { r: 255, g: 255, b: 255, alpha: 1 };
  const SIZE = 144;
  let out;
  if (transparent) {
    const inner = Math.round(SIZE * 0.72);
    const logo = await sharp(buf, { failOn: 'none' }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    out = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: bg } }).composite([{ input: logo, gravity: 'centre' }]).png({ palette: true, quality: 82, effort: 8 }).toBuffer();
  } else {
    out = await sharp(buf, { failOn: 'none' }).flatten({ background: bg }).resize(SIZE, SIZE, { fit: 'cover' }).png({ palette: true, quality: 82, effort: 8 }).toBuffer();
  }
  // average colour for the tile behind the picture
  const px = await sharp(out).resize(1, 1).raw().toBuffer({ resolveWithObject: false });
  const hex = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  return { out, hex, src };
}

await loadGlobeHashes();
const PREV_FILE = path.join(import.meta.dirname, 'brand-icons.json');
const prev = fs.existsSync(PREV_FILE) && !process.argv.includes('--all') ? JSON.parse(fs.readFileSync(PREV_FILE, 'utf8')) : [];
const known = new Map(prev.map((r) => [r.name, r]));
fs.mkdirSync(OUT, { recursive: true });
const results = [];
let idx = 0;
async function worker() {
  while (idx < list.length) {
    const [name, domain, aliases] = list[idx++];
    if (known.has(name)) { results.push(known.get(name)); continue; }
    const file = `${slug(name)}.png`;
    let best = null;
    let tried = 0;
    for (const c of await candidates(domain)) {
      if (tried >= 8 || (best && best.src >= 180)) break;
      const r = await get(c.u);
      if (!r || !/image\/(png|jpeg|webp)/.test(r.type)) continue;
      tried++;
      if (globe.has(crypto.createHash('md5').update(r.buf).digest('hex'))) continue;
      const n = await normalise(r.buf).catch(() => null);
      if (n && (!best || n.src > best.src)) best = { ...n, from: c.weak ? 'gstatic' : 'site' };
    }
    let done = null;
    if (best) { fs.writeFileSync(path.join(OUT, file), best.out); done = { name, domain, aliases, file, hex: best.hex, src: best.src, from: best.from }; }
    results.push(done ?? { name, domain, aliases, file: null });
    process.stdout.write(done ? '.' : 'x');
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
results.sort((a, b) => list.findIndex((l) => l[0] === a.name) - list.findIndex((l) => l[0] === b.name));
fs.writeFileSync(path.join(import.meta.dirname, 'brand-icons.json'), JSON.stringify(results, null, 1));
console.log(`\n${results.filter((r) => r.file).length}/${results.length} icons`);
console.log('missing:', results.filter((r) => !r.file).map((r) => r.name).join(', '));
