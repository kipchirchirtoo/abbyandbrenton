import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Privileged Supabase client (bypasses RLS). SERVER ONLY.
 * Never import this from a client component or expose the key to the browser.
 */
export function getAdminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured (SUPABASE_URL and SUPABASE_SECRET_KEY are required).');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Hard time limit on every database call: an unreachable database fails fast instead of hanging the page.
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(8000) }) },
  });
  return client;
}
