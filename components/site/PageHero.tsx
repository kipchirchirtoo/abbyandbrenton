/** Banner at the top of inner pages: photo with slow zoom, gradient and animated title. */
export default function PageHero({
  eyebrow,
  title,
  sub,
  image,
  position = 'center 25%',
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  image: string;
  position?: string;
}) {
  return (
    <section className="page-hero">
      <div className="ph-img" style={{ backgroundImage: `url('${image}')`, backgroundPosition: position }} />
      <div className="ph-shade" />
      <div className="ph-text">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {sub && <p className="ph-sub">{sub}</p>}
      </div>
    </section>
  );
}
