// Builds lib/gallery.json from the photo folders, so EVERY picture in them appears in the Gallery automatically.
//   public/photos/proposal/  -> "Proposal"
//   public/photos/gallery/   -> Groom / Bride / Family / Bridal Team / Event Location (by file-name prefix)
// Runs automatically before `npm run dev` and `npm run build`. Run `npm run gallery` after adding photos while the
// dev server is already running. (Reading image sizes here, at build time, also works on Vercel, where
// the public/ folder is not available to server code at runtime.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photos = path.join(root, 'public', 'photos');

/** Width/height of a JPEG or PNG, read from the file header (no dependencies). */
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; // PNG
  if (b[0] !== 0xff || b[1] !== 0xd8) return null; // not a JPEG
  let o = 2;
  let orientation = 1;
  while (o < b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1];
    const len = b.readUInt16BE(o + 2);
    if (m === 0xe1 && b.toString('ascii', o + 4, o + 8) === 'Exif') {
      // EXIF orientation (values 5-8 mean the picture is shown rotated by 90 degrees)
      const t = o + 10;
      const le = b.toString('ascii', t, t + 2) === 'II';
      const u16 = (p) => (le ? b.readUInt16LE(p) : b.readUInt16BE(p));
      const u32 = (p) => (le ? b.readUInt32LE(p) : b.readUInt32BE(p));
      const ifd = t + u32(t + 4);
      const n = u16(ifd);
      for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === 0x0112) orientation = u16(ifd + 2 + i * 12 + 8);
    }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      let h = b.readUInt16BE(o + 5);
      let w = b.readUInt16BE(o + 7);
      if (orientation >= 5) [w, h] = [h, w];
      return { w, h };
    }
    o += 2 + len;
  }
  return null;
}

const IMG = /\.(jpe?g|png)$/i;
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });

function scan(dir, urlBase, skip = () => false) {
  const abs = path.join(photos, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => IMG.test(f) && !skip(f)).sort(natural).flatMap((f) => {
    const s = imageSize(path.join(abs, f));
    if (!s) { console.warn(`  skipped (unreadable): ${dir}/${f}`); return []; }
    return [[`${urlBase}/${f}`, s.w, s.h]];
  });
}

// proposal/: hero-N.jpg are the big-screen copies of story-N.jpg (same photo), so only list one of each.
const proposal = scan('proposal', '/photos/proposal', (f) => /^hero-\d+\./i.test(f));
const gallery = scan('gallery', '/photos/gallery');
const by = (prefix) => gallery.filter(([u]) => path.basename(u).toLowerCase().startsWith(prefix + '-'));
const known = new Set(['groom', 'bride', 'family', 'bridal', 'venue']);
const other = gallery.filter(([u]) => !known.has(path.basename(u).toLowerCase().split('-')[0]));

const out = {
  proposal,
  groom: by('groom'),
  bride: by('bride'),
  family: by('family'),
  bridal: by('bridal'),
  venue: by('venue'),
  // Anything dropped into public/photos/gallery without a known prefix still shows up, under "More".
  more: other,
};
fs.writeFileSync(path.join(root, 'lib', 'gallery.json'), JSON.stringify(out));
const total = Object.values(out).reduce((n, a) => n + a.length, 0);
console.log(`gallery: ${total} photos (${Object.entries(out).map(([k, v]) => `${k} ${v.length}`).join(', ')})`);
