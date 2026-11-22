import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { RSVP_CLOSES_AT, type RsvpMode, type RsvpStatus } from '@/lib/rsvp/config';

/**
 * Is the RSVP open right now? Decided on the SERVER from the server clock, the stored deadline and the
 * admin override (wedding_settings). The database function submit_rsvp_response applies the same rule again,
 * so a request that slips past the API is still rejected.
 * If the database cannot be reached we fall back to the built-in deadline.
 */
export async function getRsvpStatus(): Promise<RsvpStatus & { dbOk: boolean }> {
  let mode: RsvpMode = 'auto';
  let closesAt = RSVP_CLOSES_AT;
  let dbOk = true;
  try {
    const { data, error } = await getAdminClient().from('wedding_settings').select('key,value').in('key', ['rsvp_mode', 'rsvp_closes_at']);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.key === 'rsvp_mode' && (row.value === 'open' || row.value === 'closed' || row.value === 'auto')) mode = row.value;
      if (row.key === 'rsvp_closes_at') {
        const t = Date.parse(row.value);
        if (!Number.isNaN(t)) closesAt = t;
      }
    }
  } catch {
    dbOk = false;
  }
  const serverNow = Date.now();
  const open = mode === 'open' ? true : mode === 'closed' ? false : serverNow < closesAt;
  return { open, mode, closesAt, serverNow, dbOk };
}

export async function setRsvpMode(mode: RsvpMode): Promise<void> {
  const { error } = await getAdminClient()
    .from('wedding_settings')
    .upsert({ key: 'rsvp_mode', value: mode, updated_at: new Date().toISOString() });
  if (error) throw new Error('Could not update the RSVP setting.');
}
