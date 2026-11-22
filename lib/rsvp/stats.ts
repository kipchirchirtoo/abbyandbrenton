import type { ResponseRecord } from '@/lib/rsvp/store';

export type RsvpStats = {
  responses: number;
  confirmedInvitations: number;
  totalGuests: number;
  adults: number;
  children: number;
  declined: number;
  pending: number; // invited by personal link but not yet replied
  stay: {
    total: number;
    byType: Record<string, { requests: number; units: number }>;
    pending: number;
    confirmed: number;
    declined: number;
    cancelled: number;
  };
  checkin: {
    expected: number;
    checkedIn: number;
    notCheckedIn: number;
    groups: number; // invitations where everyone is in
    groupsTotal: number;
    individuals: number;
    percent: number;
  };
};

/** All the dashboard numbers, derived from the RSVP records (and the count of personal invitations still unanswered). */
export function computeStats(records: ResponseRecord[], pendingInvites: number): RsvpStats {
  const attending = records.filter((r) => r.attending);
  const guests = attending.flatMap((r) => r.guests);
  const checkedIn = guests.filter((g) => g.checkedInAt).length;
  const stayRows = records.map((r) => r.stay).filter((s): s is NonNullable<ResponseRecord['stay']> => !!s);

  const byType: RsvpStats['stay']['byType'] = {};
  for (const s of stayRows) {
    const t = (byType[s.roomType] ??= { requests: 0, units: 0 });
    t.requests += 1;
    t.units += s.units;
  }

  const groups = attending.filter((r) => r.guests.length > 0 && r.guests.every((g) => g.checkedInAt)).length;
  return {
    responses: records.length,
    confirmedInvitations: attending.length,
    totalGuests: attending.reduce((n, r) => n + r.adults + r.children, 0),
    adults: attending.reduce((n, r) => n + r.adults, 0),
    children: attending.reduce((n, r) => n + r.children, 0),
    declined: records.length - attending.length,
    pending: pendingInvites,
    stay: {
      total: stayRows.length,
      byType,
      pending: stayRows.filter((s) => s.status === 'pending').length,
      confirmed: stayRows.filter((s) => s.status === 'confirmed').length,
      declined: stayRows.filter((s) => s.status === 'declined').length,
      cancelled: stayRows.filter((s) => s.status === 'cancelled').length,
    },
    checkin: {
      expected: guests.length,
      checkedIn,
      notCheckedIn: guests.length - checkedIn,
      groups,
      groupsTotal: attending.length,
      individuals: checkedIn,
      percent: guests.length ? Math.round((checkedIn / guests.length) * 100) : 0,
    },
  };
}
