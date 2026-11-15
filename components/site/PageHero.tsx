/** Banner at the top of inner pages: photo with slow zoom, gradient and animated title. */
export default function PageHero({
  eyebrow,
  title,
  sub,
  image,
  position = 'center 25%',
  collage,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  image: string;
  position?: string;
  /** Optional strip of photos shown side by side instead of one big image (best for tall portrait photos). */
  collage?: { src: string; pos?: string }[];
}) {
  return (
    <section className="page-hero">
      {collage?.length ? (
        <div className="ph-collage">
          {collage.map((c, i) => (
            <div key={c.src} className="ph-tile" style={{ animationDelay: `${i * 0.12}s` }}>
              <div style={{ backgroundImage: `url('${c.src}')`, backgroundPosition: c.pos ?? 'center 30%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ph-img" style={{ backgroundImage: `url('${image}')`, backgroundPosition: position }} />
      )}
      <div className="ph-shade" />
      <div className="ph-text">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {sub && <p className="ph-sub">{sub}</p>}
      </div>
    </section>
  );
}
