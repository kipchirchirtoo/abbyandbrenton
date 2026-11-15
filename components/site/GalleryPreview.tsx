import Link from 'next/link';
import data from '@/lib/gallery.json';

type List = [string, number, number][];

/** Home-page gallery teaser: a mosaic of photos from every category, linking to the full gallery. */
export default function GalleryPreview() {
  const d = data as unknown as Record<string, List>;
  const total = Object.values(d).reduce((n, l) => n + l.length, 0);

  // Interleave categories so the mosaic shows variety: proposal first, then one from each other set.
  // Nine tiles = one large (2x2) + eight small, which fills the 4-column grid with no gaps.
  const order = ['proposal', 'bride', 'groom', 'family', 'bridal', 'venue'];
  const picks: string[] = [];
  for (let round = 0; picks.length < 9 && round < 5; round++) {
    for (const k of order) {
      const item = d[k]?.[round];
      if (item && picks.length < 9) picks.push(item[0]);
    }
  }
  const extra = total - picks.length;

  return (
    <section className="reveal section wide">
      <p className="eyebrow">Gallery</p>
      <h2>Moments we love</h2>
      <div className="mosaic home-mosaic">
        {picks.map((src, i) => (
          <Link key={src} href="/gallery" className={`mosaic-item m${i}`} aria-label="Open the gallery" style={{ animationDelay: `${i * 80}ms` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" />
            {i === picks.length - 1 && extra > 0 && <span className="more">+{extra} more</span>}
          </Link>
        ))}
      </div>
      <Link className="btn solid" href="/gallery" style={{ marginTop: 28 }}>View all {total} photos</Link>
    </section>
  );
}
