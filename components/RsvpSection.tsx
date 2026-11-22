import RsvpCountdown from '@/components/rsvp/RsvpCountdown';
import RsvpForm from '@/components/rsvp/RsvpForm';
import RsvpClosed from '@/components/rsvp/RsvpClosed';
import { getRsvpStatus } from '@/lib/rsvp/state';
import type { GuestInfo } from '@/lib/types';

type Props = { guest?: GuestInfo | null };

/**
 * The RSVP area: countdown plus the form while RSVPs are open, or the closure screen once the deadline has
 * passed (or the couple have closed it). The server also refuses submissions after the deadline.
 */
export default async function RsvpSection({ guest }: Props) {
  const status = await getRsvpStatus();
  return (
    <section className="reveal section" id="rsvp">
      {status.open ? (
        <>
          <RsvpCountdown closesAt={status.closesAt} serverNow={status.serverNow} mode={status.mode} />
          <div className="divider" />
          <h2>RSVP</h2>
          <RsvpForm guest={guest ?? null} />
        </>
      ) : (
        <RsvpClosed />
      )}
    </section>
  );
}
