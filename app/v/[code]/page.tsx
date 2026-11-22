import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import { isWellFormedQr } from '@/lib/rsvp/qr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wedding invitation', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };

/**
 * Where an invitation QR code leads. The public sees only a neutral message and NO guest information.
 * A signed-in wedding administrator is taken straight to the check-in screen, where the server looks the guest up.
 */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (isWellFormedQr(code) && (await isAdmin())) redirect(`/admin/checkin?code=${encodeURIComponent(code)}`);

  return (
    <main className="standalone">
      <div className="thanks-box">
        <p className="script">Abigael &amp; Brenton</p>
        <p className="lead">This is a wedding invitation code. It is checked by our team at the entrance on the day.</p>
        <p className="hint">Please keep it on your phone and show it when you arrive.</p>
      </div>
    </main>
  );
}
