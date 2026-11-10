# Abigael & Brenton — wedding website (Next.js)

Next.js (App Router, TypeScript) wedding site with a private, per-guest invitation layer backed by Supabase,
email via Resend, and an admin dashboard.

The original static version is kept in `legacy/` for reference.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev
```

With no Supabase variables the public site still works (RSVP goes to the Google Sheet as before).

## How the private invitations work

1. Admin adds a guest (or imports a CSV) at `/admin/guests`.
2. **Send** generates a random 256-bit token, stores **only its SHA-256 hash**, and emails `…/invite/<token>`.
3. The guest opens the link. The server hashes the token, looks it up, rejects revoked/expired links, and renders the
   existing wedding site with the guest's name and allowed party size.
4. The RSVP posts to `/api/rsvp`, which re-validates the token server-side and saves the response through the
   `submit_wedding_rsvp` Postgres function (one atomic transaction, party-size enforced in the database too).

Because the link is a bearer credential, anyone holding it can use it. Controls: **revoke** (also rotates the hash),
**expiry** (links stop working 22 Jan 2027), and re-sending always issues a fresh link and disables the old one.
Invitation pages are served `no-store`, `noindex` and `Referrer-Policy: no-referrer`.

`PRIVATE_MODE=true` makes the public homepage show only a "private invitation" screen.

## Setup checklist

1. **Supabase** — run `supabase/migrations/202611100001_private_wedding_invitations.sql` (SQL editor or `supabase db push`).
   RLS is enabled with no public policies; only the server-side secret key can read/write.
2. **Resend** — verify a sending domain (SPF, DKIM, DMARC), create an API key, set `RESEND_FROM`.
3. **Vercel env vars** — everything in `.env.example`. Never expose `SUPABASE_SECRET_KEY` to the browser
   (do not prefix it `NEXT_PUBLIC_`).
4. Deploy, open `/admin/login`, add a test guest with your own email, send, open the link, submit an RSVP.
5. When satisfied, set `PRIVATE_MODE=true`.

## Known limits

- Rate limiting is in-memory per serverless instance (slows casual abuse; not a global hard limit). Use Upstash/Vercel KV for stricter limits.
- Admin login is a single shared password with a signed session cookie (not Supabase Auth).
- Email delivery/bounce tracking needs Resend webhooks (not yet wired).
- CSV import skips guests whose email already exists; it does not update them.
