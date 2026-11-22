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
