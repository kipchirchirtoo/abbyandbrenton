-- ALL migrations in order. Paste this whole file into Supabase > SQL Editor > New query > Run. Safe to re-run.

-- ===== 202611100001_private_wedding_invitations.sql =====
-- Abigael & Brenton private wedding invitations
-- Run as a Supabase database migration. Designed to coexist with existing tables.

create extension if not exists pgcrypto;

create table if not exists public.wedding_guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  guest_limit integer not null default 1
    check (guest_limit between 1 and 10),
  token_hash text unique not null,
  invitation_status text not null default 'pending'
    check (invitation_status in ('pending', 'sent', 'accepted', 'declined', 'revoked')),
  token_expires_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wedding_rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique
    references public.wedding_guests(id) on delete cascade,
  attending boolean not null,
  attending_count integer not null default 0,
  dietary_requirements text,
  message text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attending_count >= 0 and attending_count <= 10)
);

create table if not exists public.wedding_rsvp_attendees (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null
    references public.wedding_rsvps(id) on delete cascade,
  full_name text not null
);

-- All guest and RSVP data is accessed only through trusted server-side code.
alter table public.wedding_guests enable row level security;
alter table public.wedding_rsvps enable row level security;
alter table public.wedding_rsvp_attendees enable row level security;

-- No public or authenticated-user policies are created on purpose.
-- Use the Supabase secret / service-role client on the server only.

create index if not exists idx_wedding_guests_status
  on public.wedding_guests(invitation_status);
create index if not exists idx_wedding_rsvps_guest
  on public.wedding_rsvps(guest_id);
create index if not exists idx_wedding_attendees_rsvp
  on public.wedding_rsvp_attendees(rsvp_id);

-- Atomic RSVP submission: guest row lock + validation + upsert + attendees + status,
-- all inside one transaction (a Postgres function call is a single transaction).
create or replace function public.submit_wedding_rsvp(
  p_guest_id uuid,
  p_attending boolean,
  p_attendee_names text[],
  p_dietary text,
  p_message text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.wedding_guests%rowtype;
  v_rsvp_id uuid;
  v_count integer;
  v_name text;
begin
  select * into v_guest from public.wedding_guests where id = p_guest_id for update;
  if not found then raise exception 'guest_not_found'; end if;
  if v_guest.invitation_status = 'revoked' then raise exception 'revoked'; end if;
  if v_guest.token_expires_at is not null and v_guest.token_expires_at < now() then
    raise exception 'expired';
  end if;

  v_count := case when p_attending then coalesce(array_length(p_attendee_names, 1), 0) else 0 end;
  if p_attending and (v_count < 1 or v_count > v_guest.guest_limit) then
    raise exception 'invalid_guest_count';
  end if;

  insert into public.wedding_rsvps (guest_id, attending, attending_count, dietary_requirements, message)
  values (p_guest_id, p_attending, v_count, nullif(p_dietary, ''), nullif(p_message, ''))
  on conflict (guest_id) do update
    set attending = excluded.attending,
        attending_count = excluded.attending_count,
        dietary_requirements = excluded.dietary_requirements,
        message = excluded.message,
        updated_at = now()
  returning id into v_rsvp_id;

  delete from public.wedding_rsvp_attendees where rsvp_id = v_rsvp_id;
  if p_attending then
    foreach v_name in array p_attendee_names loop
      insert into public.wedding_rsvp_attendees (rsvp_id, full_name) values (v_rsvp_id, v_name);
    end loop;
  end if;

  update public.wedding_guests
     set invitation_status = case when p_attending then 'accepted' else 'declined' end,
         updated_at = now()
   where id = p_guest_id;
end;
$$;

-- Only the server (service role) may call it; never anon/authenticated browser clients.
revoke all on function public.submit_wedding_rsvp(uuid, boolean, text[], text, text) from public, anon, authenticated;
grant execute on function public.submit_wedding_rsvp(uuid, boolean, text[], text, text) to service_role;

-- ===== 202611100002_wedding_gifts.sql =====
-- M-Pesa gift contributions (STK push). Written/read only by trusted server code.

create table if not exists public.wedding_gifts (
  id uuid primary key default gen_random_uuid(),
  checkout_request_id text not null unique,
  merchant_request_id text,
  amount integer not null check (amount > 0),
  phone_masked text not null,            -- e.g. 2547****5462 (full number is never stored)
  giver_name text,
  guest_id uuid references public.wedding_guests(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'cancelled')),
  mpesa_receipt text,
  result_desc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wedding_gifts enable row level security;
-- No policies on purpose: only the server-side secret key can access this table.

create index if not exists idx_wedding_gifts_status on public.wedding_gifts(status);
create index if not exists idx_wedding_gifts_created on public.wedding_gifts(created_at desc);

-- ===== 202611100003_wedding_bookings.sql =====
-- Room bookings paid through Paystack. Written/read only by trusted server code.

create table if not exists public.wedding_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,            -- also the Paystack transaction reference
  guest_id uuid references public.wedding_guests(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  hotel_id text not null,
  hotel_name text not null,
  room_id text not null,
  room_name text not null,
  check_in date not null,
  check_out date not null,
  nights integer not null check (nights between 1 and 30),
  rooms integer not null check (rooms between 1 and 10),
  guests integer not null check (guests between 1 and 40),
  notes text,
  currency text not null default 'KES',
  price_per_night integer not null check (price_per_night > 0),   -- whole currency units, computed on the server
  total integer not null check (total > 0),                       -- whole currency units, computed on the server
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'review')),
  payment_note text,                         -- e.g. why a payment needs review
  paystack_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

alter table public.wedding_bookings enable row level security;
-- No policies on purpose: only the server-side secret key can access this table.

create index if not exists idx_wedding_bookings_status on public.wedding_bookings(status);
create index if not exists idx_wedding_bookings_created on public.wedding_bookings(created_at desc);

-- ===== 202611220001_rsvp_system.sql =====
-- RSVP system upgrade: complete guest details, accompanying guests, accommodation requests, QR check-in,
-- and a deadline that is enforced inside the database as well as in the API.
-- All tables are reachable ONLY through server-side code (RLS on, no policies).

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ settings */
create table if not exists public.wedding_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.wedding_settings enable row level security;

-- RSVPs are open through 11:59:59 PM on 30 December 2026 (Africa/Nairobi, UTC+3), i.e. they close at the stroke of
-- midnight. 'auto' follows the deadline; an admin can force 'open' (reopen) or 'closed'.
insert into public.wedding_settings (key, value) values
  ('rsvp_closes_at', '2026-12-31T00:00:00+03:00'),
  ('rsvp_mode', 'auto')
on conflict (key) do nothing;

create or replace function public.rsvp_is_open() returns boolean
language sql stable
set search_path = public
as $$
  select case coalesce((select value from public.wedding_settings where key = 'rsvp_mode'), 'auto')
    when 'open' then true
    when 'closed' then false
    else now() < coalesce((select value::timestamptz from public.wedding_settings where key = 'rsvp_closes_at'), '2026-12-31T00:00:00+03:00'::timestamptz)
  end
$$;

/* --------------------------------------------------------------- RSVP records */
create table if not exists public.wedding_responses (
  id uuid primary key default gen_random_uuid(),
  reference text not null,                       -- human friendly, e.g. AB-7K3QMX (not a secret)
  view_token_hash text not null,                 -- SHA-256 of the secret link token (guest's private link)
  qr_token text not null,                        -- random verification id placed in the QR code (no personal data)
  idempotency_key text,
  guest_id uuid references public.wedding_guests(id) on delete set null,   -- set when they used a private invitation link
  full_name text not null,
  email text not null,
  whatsapp text not null,                        -- E.164, e.g. +254712345678
  attending boolean not null,
  adults integer not null default 0 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  dietary text,
  accessibility text,
  special_requests text,
  message text,
  email_sent_at timestamptz,
  last_link_sent_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wedding_responses_reference_key unique (reference),
  constraint wedding_responses_view_key unique (view_token_hash),
  constraint wedding_responses_qr_key unique (qr_token),
  constraint wedding_responses_idem_key unique (idempotency_key)
);
create unique index if not exists wedding_responses_email_key on public.wedding_responses (lower(email));
create index if not exists idx_wedding_responses_whatsapp on public.wedding_responses (whatsapp);
create index if not exists idx_wedding_responses_name on public.wedding_responses (lower(full_name));
alter table public.wedding_responses enable row level security;

create table if not exists public.wedding_response_guests (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.wedding_responses(id) on delete cascade,
  position integer not null default 0,
  full_name text not null,
  category text not null default 'adult' check (category in ('adult', 'child')),
  dietary text,
  is_primary boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by text
);
create index if not exists idx_wedding_response_guests_response on public.wedding_response_guests (response_id);
alter table public.wedding_response_guests enable row level security;

create table if not exists public.wedding_stay_requests (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.wedding_responses(id) on delete cascade,
  room_type text not null check (room_type in ('villa', 'townhouse-3br', 'apartment-3br', 'apartment-2br', 'apartment-1br')),
  room_name text not null,
  units integer not null check (units between 1 and 10),
  check_in date not null,
  check_out date not null,
  occupants_count integer not null check (occupants_count between 1 and 40),
  occupant_names text[] not null default '{}',
  special_requests text,
  unit_price integer not null check (unit_price > 0),         -- KES per unit (not per night)
  estimated_amount integer not null check (estimated_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists idx_wedding_stay_status on public.wedding_stay_requests (status);
alter table public.wedding_stay_requests enable row level security;

/* ------------------------------------------------------------ atomic submission */
-- One transaction: checks the deadline, then writes the RSVP, every guest and the accommodation request together.
create or replace function public.submit_rsvp_response(p jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_constraint text;
  g jsonb;
  i integer := 1;
  s jsonb := p->'stay';
begin
  if not public.rsvp_is_open() then raise exception 'rsvp_closed'; end if;

  begin
    insert into public.wedding_responses
      (reference, view_token_hash, qr_token, idempotency_key, guest_id, full_name, email, whatsapp, attending,
       adults, children, dietary, accessibility, special_requests, message)
    values
      (p->>'reference', p->>'view_token_hash', p->>'qr_token', nullif(p->>'idempotency_key', ''),
       nullif(p->>'guest_id', '')::uuid, p->>'full_name', lower(p->>'email'), p->>'whatsapp',
       (p->>'attending')::boolean, coalesce((p->>'adults')::int, 0), coalesce((p->>'children')::int, 0),
       nullif(p->>'dietary', ''), nullif(p->>'accessibility', ''), nullif(p->>'special_requests', ''), nullif(p->>'message', ''))
    returning id into v_id;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'wedding_responses_email_key' then raise exception 'duplicate_email'; end if;
    if v_constraint = 'wedding_responses_idem_key' then raise exception 'duplicate_submission'; end if;
    raise exception 'duplicate_reference';
  end;

  if (p->>'attending')::boolean then
    insert into public.wedding_response_guests (response_id, position, full_name, category, dietary, is_primary)
    values (v_id, 0, p->>'full_name', 'adult', nullif(p->>'dietary', ''), true);
    for g in select * from jsonb_array_elements(coalesce(p->'guests', '[]'::jsonb)) loop
      insert into public.wedding_response_guests (response_id, position, full_name, category, dietary)
      values (v_id, i, g->>'full_name', coalesce(nullif(g->>'category', ''), 'adult'), nullif(g->>'dietary', ''));
      i := i + 1;
    end loop;

    if s is not null and jsonb_typeof(s) = 'object' then
      insert into public.wedding_stay_requests
        (response_id, room_type, room_name, units, check_in, check_out, occupants_count, occupant_names,
         special_requests, unit_price, estimated_amount)
      values
        (v_id, s->>'room_type', s->>'room_name', (s->>'units')::int, (s->>'check_in')::date, (s->>'check_out')::date,
         (s->>'occupants_count')::int,
         coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(s->'occupant_names', '[]'::jsonb)) x), '{}'),
         nullif(s->>'special_requests', ''), (s->>'unit_price')::int, (s->>'estimated_amount')::int);
    end if;
  end if;

  return jsonb_build_object('id', v_id, 'reference', p->>'reference');
end;
$$;

revoke all on function public.submit_rsvp_response(jsonb) from public, anon, authenticated;
grant execute on function public.submit_rsvp_response(jsonb) to service_role;
revoke all on function public.rsvp_is_open() from public, anon, authenticated;
grant execute on function public.rsvp_is_open() to service_role;
