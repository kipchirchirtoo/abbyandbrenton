import Link from 'next/link';

/** Shown when the RSVP is closed (after the deadline, or closed by the couple). The API refuses submissions too. */
export default function RsvpClosed() {
  return (
    <div className="rsvp-closed" role="status">
      <div className="rc-seal" aria-hidden="true">
        <svg viewBox="0 0 120 120" width="96" height="96">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#c9a65b" strokeWidth="1.4" strokeDasharray="3 6" />
          <circle cx="60" cy="60" r="44" fill="none" stroke="#5c1a27" strokeOpacity=".5" strokeWidth="1" />
          <path d="M34 50 60 70 86 50M34 50v28a4 4 0 0 0 4 4h44a4 4 0 0 0 4-4V50l-26-12z" fill="none" stroke="#5c1a27" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <i className="rc-petal p1" /><i className="rc-petal p2" /><i className="rc-petal p3" /><i className="rc-petal p4" />
      </div>
      <h2>RSVPs are now closed.</h2>
      <p className="lead">Thank you for your interest in celebrating the special day of Abigail &amp; Brenton.</p>
      <p className="lead">The RSVP deadline has passed. We look forward to celebrating with our confirmed guests!</p>
      <Link className="btn" href="/">Back to the invitation</Link>
    </div>
  );
}
