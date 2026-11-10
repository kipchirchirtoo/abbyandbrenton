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
