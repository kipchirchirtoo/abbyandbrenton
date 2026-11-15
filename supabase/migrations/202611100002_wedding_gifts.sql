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
