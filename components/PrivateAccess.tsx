/** Shown instead of the wedding content when there is no valid invitation. Reveals nothing about the event. */
export default function PrivateAccess({ reason }: { reason?: 'invalid' | 'revoked' | 'expired' | 'unavailable' }) {
  const message =
    reason === 'revoked'
      ? 'This invitation link has been withdrawn. Please contact the couple for a new one.'
      : reason === 'expired'
        ? 'This invitation link has expired. Please contact the couple for a new one.'
        : reason === 'unavailable'
          ? 'This page is temporarily unavailable. Please try again in a few minutes.'
          : 'This wedding website is private. Please open the personal invitation link that was sent to you by email.';
  return (
    <main className="private-screen">
      <div className="private-card">
        <span className="script">A&amp;B</span>
        <p className="eyebrow">Private invitation</p>
        <h1>By invitation only</h1>
        <div className="divider" />
        <p className="lead">{message}</p>
      </div>
    </main>
  );
}
