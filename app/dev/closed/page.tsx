import { notFound } from 'next/navigation';
import RsvpClosed from '@/components/rsvp/RsvpClosed';

export const dynamic = 'force-dynamic';

/** Development-only preview of the closure screen. Returns 404 in production. */
export default function PreviewClosed() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="standalone">
      <RsvpClosed />
    </main>
  );
}
