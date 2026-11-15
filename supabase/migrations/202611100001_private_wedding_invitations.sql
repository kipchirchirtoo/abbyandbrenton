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
