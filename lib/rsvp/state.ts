import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { RSVP_CLOSES_AT, type RsvpMode, type RsvpStatus } from '@/lib/rsvp/config';

type Settings = { mode: RsvpMode; closesAt: number; dbOk: boolean };

const OK_TTL = 3_000; // how long a good answer is reused
const FAIL_TTL = 10_000; // how long a failure is remembered (so a dead database does not slow every request)
const QUERY_TIMEOUT = 1500;
let cached: { at: number; value: Settings } | null = null;

const withTimeout = <T,>(p: PromiseLike<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

async function loadSettings(): Promise<Settings> {
  let mode: RsvpMode = 'auto';
  let closesAt = RSVP_CLOSES_AT;
  try {
    const { data, error } = await withTimeout(
      getAdminClient().from('wedding_settings').select('key,value').in('key', ['rsvp_mode', 'rsvp_closes_at']),
      QUERY_TIMEOUT,
    );
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.key === 'rsvp_mode' && (row.value === 'open' || row.value === 'closed' || row.value === 'auto')) mode = row.value;
      if (row.key === 'rsvp_closes_at') {
        const t = Date.parse(row.value);
        if (!Number.isNaN(t)) closesAt = t;
      }
    }
    return { mode, closesAt, dbOk: true };
  } catch {
    return { mode, closesAt, dbOk: false };
  }
}

/**
 * Is the RSVP open right now? Decided on the SERVER from the server clock, the stored deadline and the
 * admin override (wedding_settings). The database function submit_rsvp_response applies the same rule again,
 * so a request that slips past the API is still rejected.
 *
 * Pages use a short-lived cached answer so they stay fast; pass { fresh: true } where correctness matters most
 * (saving an RSVP, the post-deadline status check). If the database cannot be reached we fall back to the built-in
 * deadline immediately.
 */
export async function getRsvpStatus(opts: { fresh?: boolean } = {}): Promise<RsvpStatus & { dbOk: boolean }> {
  const now = Date.now();
  let value: Settings;
  if (!opts.fresh && cached && now - cached.at < (cached.value.dbOk ? OK_TTL : FAIL_TTL)) {
    value = cached.value;
  } else {
    value = await loadSettings();
    cached = { at: Date.now(), value };
  }
  const serverNow = Date.now();
  const open = value.mode === 'open' ? true : value.mode === 'closed' ? false : serverNow < value.closesAt;
  return { open, mode: value.mode, closesAt: value.closesAt, serverNow, dbOk: value.dbOk };
}

export async function setRsvpMode(mode: RsvpMode): Promise<void> {
  const { error } = await getAdminClient()
    .from('wedding_settings')
    .upsert({ key: 'rsvp_mode', value: mode, updated_at: new Date().toISOString() });
  if (error) throw new Error('Could not update the RSVP setting.');
  cached = null; // the change shows immediately
}
