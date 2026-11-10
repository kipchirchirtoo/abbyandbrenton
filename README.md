# Abigael & Brenton — wedding website (Next.js)

Multi-page animated wedding site (Next.js App Router + TypeScript) with private per-guest invitations
(Supabase), email (Resend), RSVP, M-Pesa gifts (Daraja) and an admin dashboard.
The original static version is kept in `legacy/`.

## Pages (menu)

The Day · Our Story · Gallery (Groom / Bride / Family / Bridal Team / Event Location) · Bridal Team · Programme
(wedding day only) · Dress Code · Location · Book a Room · FAQs · M-Pesa Gift · RSVP

**All wording, days, FAQs, dress code, hotels and the gift number live in `lib/content.ts`.**
Items marked `TODO` there are placeholders to confirm. Photos are in `public/photos/` (gallery data: `lib/gallery.json`).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Private invitations

1. Admin adds a guest (or imports a CSV) at `/admin/guests`.
2. **Send** creates a random 256-bit token, stores only its SHA-256 hash and emails `…/invite/<token>`.
3. Opening the link validates the token server-side, stores it in an **httpOnly cookie** and redirects to `/`
   (the token disappears from the URL, history and Referer headers). The whole site is then personalised.
4. RSVPs post to `/api/rsvp`, which re-validates the cookie and saves via the atomic `submit_wedding_rsvp` Postgres function.

Controls: revoke (also rotates the hash), expiry (22 Jan 2027), resend always issues a fresh link.
`PRIVATE_MODE=true` makes every page show a neutral "by invitation only" screen (and no event details in `<head>`)
unless the visitor has a valid invitation. **Every page checks access itself** (a layout check alone can be bypassed).

## M-Pesa gifts

- The gift page always shows the manual number (`gift.mpesaNumber` in `lib/content.ts`).
- **Prompt on the guest's phone (STK push)** needs Safaricom Daraja credentials (`MPESA_*` in `.env.example`) and pays a
  **Paybill or Till**, not a personal phone number. Without them the page shows the manual number only.
- Register `https://YOUR-SITE/api/mpesa/callback/<MPESA_CALLBACK_SECRET>` as the callback. Results appear at `/admin/gifts`
  (phone numbers are stored masked).

## Room bookings (Paystack)

Guests pick a room on **Book a Room**, enter their details and pay on Paystack's hosted checkout (cards / M-Pesa).
Every booking, with the guest's name, email, phone, dates, room and total, appears at `/admin/bookings`
(filter, cancel unpaid ones, export CSV). Money settles to the **bank account set in your Paystack dashboard**.

- **Hotels, rooms, prices and photos** are in `lib/content.ts` (`stay.hotels`). Rooms with `published: false` are
  hidden from guests and cannot be booked. Prices are whole KES per room per night.
- The **server** computes the total; the browser never sets a price.
- A booking is only confirmed when Paystack confirms the payment **and** the amount and currency match what the server priced
  (webhook with HMAC-SHA512 signature check, plus a direct verify call when the guest returns). Mismatches go to "review".
- Set the webhook in Paystack: Settings → API Keys & Webhooks → `https://YOUR-SITE/api/paystack/webhook`.
- Use `sk_test_…` while testing; switch to `sk_live_…` for real money. KES availability depends on your Paystack account.
- Set `BOOKING_PREVIEW=true` locally only, to preview the SAMPLE rooms.
- A confirmation email is sent through Resend when it is configured.
- Refunds are made in the Paystack dashboard (the admin page cannot move money).

## Setup checklist

1. Supabase: run `supabase/migrations/*.sql` in order (001 invitations, 002 gifts). RLS on, no public policies.
2. Resend: verify a sending domain (SPF, DKIM, DMARC), create an API key, set `RESEND_FROM`.
3. Vercel: add every variable from `.env.example`. Never prefix secrets with `NEXT_PUBLIC_`.
4. Test: add yourself as a guest → send → open the link → RSVP → check `/admin`.
5. Set `PRIVATE_MODE=true` when ready.

## Known limits

- Rate limiting is in-memory per serverless instance (use Upstash/Vercel KV for a hard limit).
- Admin login is one shared password with a signed session cookie (not Supabase Auth).
- No email delivery/bounce tracking yet (needs Resend webhooks).
- Room availability is not tracked (no inventory limit per room type); admin reviews bookings in `/admin/bookings`.
