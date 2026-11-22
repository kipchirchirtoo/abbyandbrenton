'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import type { CardData } from '@/lib/rsvp/types';

type Props = {
  card: CardData;
  /** The guest's secret link to this card (shown with a copy button when present). */
  viewUrl?: string | null;
};

/** A personalised, downloadable wedding invitation with the guest's party and a unique QR code. */
export default function InvitationCard({ card, viewUrl }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState<'' | 'image' | 'share'>('');
  const [note, setNote] = useState('');

  async function render(): Promise<string> {
    const node = ref.current;
    if (!node) throw new Error('no card');
    node.classList.add('capturing'); // stills the animation so the picture is clean
    try {
      await document.fonts?.ready;
      await new Promise((r) => setTimeout(r, 80));
      const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: '#fffaf5' };
      try {
        return await toPng(node, opts);
      } catch {
        return await toPng(node, { ...opts, skipFonts: true }); // fall back if the web fonts cannot be embedded
      }
    } finally {
      node.classList.remove('capturing');
    }
  }

  const fileName = `Abigael-Brenton-Invitation-${card.reference}.png`;

  async function downloadImage() {
    setBusy('image');
    setNote('');
    try {
      const dataUrl = await render();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      a.click();
    } catch {
      setNote('Sorry, the image could not be created. Please try “Save as PDF” instead, or take a screenshot.');
    } finally {
      setBusy('');
    }
  }

  async function shareToPhone() {
    setBusy('share');
    setNote('');
    try {
      const dataUrl = await render();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Our wedding invitation' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        a.click();
        setNote('Saved to your downloads. On a phone, open it and choose “Add to Photos”.');
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setNote('Sorry, we could not share it. Please use “Download image”.');
    } finally {
      setBusy('');
    }
  }

  function saveAsPdf() {
    // The print stylesheet shows only the card; choose “Save as PDF” in the print dialog.
    document.body.classList.add('printing-card');
    const done = () => document.body.classList.remove('printing-card');
    window.addEventListener('afterprint', done, { once: true });
    window.print();
    setTimeout(done, 4000);
  }

  async function copyLink() {
    if (!viewUrl) return;
    try {
      await navigator.clipboard.writeText(viewUrl);
      setNote('Link copied. Keep it private: anyone with it can see your invitation.');
    } catch {
      setNote('Could not copy automatically. Please select and copy the link.');
    }
  }


  return (
    <div className="inv-wrap">
      <article className="inv-card" id="invitation-card" ref={ref} aria-label="Your wedding invitation">
        <span className="inv-frame" aria-hidden="true" />
        <span className="inv-shimmer" aria-hidden="true" />
        <span className="inv-ghost" aria-hidden="true">15<br />01<br />27</span>

        <header className="inv-head">
          <p className="inv-small">Together with their families</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inv-photo" src="/photos/proposal/story-1.jpg" alt="" crossOrigin="anonymous" />
          <h2 className="inv-names">Abigael <em>&amp;</em> Brenton</h2>
          <p className="inv-small">request the pleasure of your company</p>
        </header>

        <section className="inv-guest">
          <p className="inv-label">Reserved for</p>
          <p className="inv-primary">{card.fullName}</p>
          {card.companions.length > 0 && (
            <ul className="inv-companions">
              {card.companions.map((c, i) => (
                <li key={i}>{c.fullName}{c.category === 'child' ? <small> · child</small> : null}</li>
              ))}
            </ul>
          )}
          <div className="inv-count">
            <span className="inv-badge">RSVP confirmed ✓</span>
            <p>
              {card.total} {card.total === 1 ? 'guest' : 'guests'}
              <small> · {card.adults} adult{card.adults === 1 ? '' : 's'}{card.children ? ` · ${card.children} child${card.children === 1 ? '' : 'ren'}` : ''}</small>
            </p>
          </div>
        </section>

        <section className="inv-when">
          <div><p className="inv-label">Date</p><p>Friday, 15 January 2027</p><p className="inv-sub">Ceremony at 2:00 PM</p></div>
          <div><p className="inv-label">Venue</p><p>Sultan Palace</p><p className="inv-sub">Kikambala, Mtwapa, Kenya</p></div>
        </section>

        {card.qrDataUrl && (
          <section className="inv-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.qrDataUrl} alt={`Check-in QR code for invitation ${card.reference}`} width={168} height={168} />
            <p className="inv-ref">{card.reference}</p>
            <p className="inv-sub">Please show this code at the entrance</p>
          </section>
        )}

        {card.accommodation && (
          <p className="inv-stay">
            Accommodation request: {card.accommodation.roomName} × {card.accommodation.units} · <b>{card.accommodation.status}</b>
          </p>
        )}

        <footer className="inv-foot">
          <p>We are so happy you will celebrate with us. Please keep this invitation on your phone for the wedding day.</p>
          <p className="inv-sign">With love, Abigael &amp; Brenton</p>
        </footer>
      </article>

      <div className="inv-actions no-print">
        <button type="button" className="btn solid" onClick={downloadImage} disabled={busy !== ''}>
          {busy === 'image' ? 'Preparing…' : 'Download image'}
        </button>
        <button type="button" className="btn" onClick={saveAsPdf}>Save as PDF</button>
        <button type="button" className="btn" onClick={shareToPhone} disabled={busy !== ''}>
          {busy === 'share' ? 'Preparing…' : 'Save to my phone'}
        </button>
        {viewUrl && <button type="button" className="btn" onClick={copyLink}>Copy my private link</button>}
      </div>
      {note && <p className="notice no-print" role="status">{note}</p>}
    </div>
  );
}
