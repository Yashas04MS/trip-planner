-- Wayfinder Complete Supabase Setup Script
-- Copy and run this entire script in your Supabase SQL Editor (https://supabase.com/dashboard/project/ibnoznltpfbdisyabxuv/sql)

create extension if not exists "pgcrypto";

-- 1. Core Profiles & Travel Preferences
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  home_city text default 'Bengaluru',
  home_airport text default 'BLR',
  created_at timestamptz default now()
);

create table if not exists travel_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  default_budget numeric default 40000,
  currency text default 'INR',
  cabin text default 'economy',
  hotel_stars int default 4,
  interests text[] default '{}',
  avoid text[] default '{}',
  voice_persona text default 'aria',
  voice_cadence numeric default 1.0,
  read_prices_aloud boolean default true,
  approval_ttl_minutes int default 5
);

-- 2. Trips, Combined Multi-Trip Circuits & Bookings
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  destination text,
  origin text default 'BLR',
  start_date date,
  end_date date,
  budget numeric default 40000,
  total_cost numeric default 0,
  status text default 'planning',
  created_at timestamptz default now()
);

create table if not exists combined_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text default '',
  total_budget numeric default 80000,
  total_cost numeric default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists combined_trip_legs (
  id uuid primary key default gen_random_uuid(),
  combined_trip_id uuid references combined_trips(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  ordinal int not null default 1,
  transfer_note text default '',
  created_at timestamptz default now()
);

-- 3. Voice Concierge Sessions & Orchestration Trace
create table if not exists voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  channel text not null,
  agent_id text,
  status text default 'active',
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  goal text,
  status text default 'running',
  created_at timestamptz default now()
);

create table if not exists plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  ordinal int,
  key text,
  title text,
  agent text,
  depends_on text[] default '{}',
  status text default 'pending',
  result_summary text,
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists tool_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  plan_step_id uuid references plan_steps(id) on delete set null,
  tool text not null,
  args jsonb,
  result jsonb,
  status text default 'running',
  latency_ms int,
  error text,
  created_at timestamptz default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  summary text,
  payload jsonb not null,
  total_cost numeric,
  status text default 'pending',
  resolved_via text,
  expires_at timestamptz default (now() + interval '5 minutes'),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  approval_id uuid references approvals(id) on delete set null,
  type text check (type in ('flight', 'hotel')),
  provider text,
  provider_ref text,
  details jsonb,
  price numeric,
  status text default 'confirmed',
  idempotency_key text unique not null,
  created_at timestamptz default now()
);

create table if not exists itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  kind text,
  title text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  calendar_event_id text,
  status text default 'scheduled'
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  remind_at timestamptz not null,
  message text,
  sent_at timestamptz
);

create table if not exists disruptions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  type text,
  detail jsonb,
  status text default 'open',
  detected_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  type text,
  title text,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- 4. USP: Travel Expense Tracker Ledger
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  combined_trip_id uuid references combined_trips(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  category text not null check (category in ('flight', 'hotel', 'transport', 'dining', 'experience', 'other')),
  merchant text not null,
  description text default '',
  amount numeric not null,
  currency text default 'INR',
  payment_method text default 'Amex Corporate',
  reimbursable boolean default true,
  status text default 'logged' check (status in ('logged', 'authorized', 'reimbursed')),
  spent_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 5. Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table travel_preferences enable row level security;
alter table trips enable row level security;
alter table combined_trips enable row level security;
alter table combined_trip_legs enable row level security;
alter table voice_sessions enable row level security;
alter table messages enable row level security;
alter table plans enable row level security;
alter table plan_steps enable row level security;
alter table tool_calls enable row level security;
alter table approvals enable row level security;
alter table bookings enable row level security;
alter table itinerary_items enable row level security;
alter table reminders enable row level security;
alter table disruptions enable row level security;
alter table notifications enable row level security;
alter table expenses enable row level security;

-- Helper expression: allows authenticated users to access their own rows AND allows the seeded executive demo profile
do $$
begin
  -- Profiles
  drop policy if exists "profiles_own_or_demo" on profiles;
  create policy "profiles_own_or_demo" on profiles for all
    using (id = auth.uid() or id = '00000000-0000-0000-0000-000000000001')
    with check (id = auth.uid() or id = '00000000-0000-0000-0000-000000000001');

  -- Travel Preferences
  drop policy if exists "prefs_own_or_demo" on travel_preferences;
  create policy "prefs_own_or_demo" on travel_preferences for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');

  -- Trips
  drop policy if exists "trips_own_or_demo" on trips;
  create policy "trips_own_or_demo" on trips for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');

  -- Combined Trips
  drop policy if exists "combined_trips_own_or_demo" on combined_trips;
  create policy "combined_trips_own_or_demo" on combined_trips for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');

  drop policy if exists "combined_legs_own_or_demo" on combined_trip_legs;
  create policy "combined_legs_own_or_demo" on combined_trip_legs for all
    using (exists (select 1 from combined_trips ct where ct.id = combined_trip_legs.combined_trip_id and (ct.user_id = auth.uid() or ct.user_id = '00000000-0000-0000-0000-000000000001')))
    with check (exists (select 1 from combined_trips ct where ct.id = combined_trip_legs.combined_trip_id and (ct.user_id = auth.uid() or ct.user_id = '00000000-0000-0000-0000-000000000001')));

  -- Expenses
  drop policy if exists "expenses_own_or_demo" on expenses;
  create policy "expenses_own_or_demo" on expenses for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');

  -- Voice Sessions & Child Records
  drop policy if exists "sessions_own_or_demo" on voice_sessions;
  create policy "sessions_own_or_demo" on voice_sessions for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');

  drop policy if exists "messages_own_or_demo" on messages;
  create policy "messages_own_or_demo" on messages for all
    using (exists (select 1 from voice_sessions s where s.id = messages.session_id and (s.user_id = auth.uid() or s.user_id = '00000000-0000-0000-0000-000000000001')))
    with check (exists (select 1 from voice_sessions s where s.id = messages.session_id and (s.user_id = auth.uid() or s.user_id = '00000000-0000-0000-0000-000000000001')));

  drop policy if exists "bookings_own_or_demo" on bookings;
  create policy "bookings_own_or_demo" on bookings for all
    using (exists (select 1 from trips t where t.id = bookings.trip_id and (t.user_id = auth.uid() or t.user_id = '00000000-0000-0000-0000-000000000001')))
    with check (exists (select 1 from trips t where t.id = bookings.trip_id and (t.user_id = auth.uid() or t.user_id = '00000000-0000-0000-0000-000000000001')));

  drop policy if exists "itinerary_own_or_demo" on itinerary_items;
  create policy "itinerary_own_or_demo" on itinerary_items for all
    using (exists (select 1 from trips t where t.id = itinerary_items.trip_id and (t.user_id = auth.uid() or t.user_id = '00000000-0000-0000-0000-000000000001')))
    with check (exists (select 1 from trips t where t.id = itinerary_items.trip_id and (t.user_id = auth.uid() or t.user_id = '00000000-0000-0000-0000-000000000001')));

  drop policy if exists "reminders_own_or_demo" on reminders;
  create policy "reminders_own_or_demo" on reminders for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');

  drop policy if exists "disruptions_own_or_demo" on disruptions;
  create policy "disruptions_own_or_demo" on disruptions for all
    using (exists (select 1 from trips t where t.id = disruptions.trip_id and (t.user_id = auth.uid() or t.user_id = '00000000-0000-0000-0000-000000000001')))
    with check (exists (select 1 from trips t where t.id = disruptions.trip_id and (t.user_id = auth.uid() or t.user_id = '00000000-0000-0000-0000-000000000001')));

  drop policy if exists "notifications_own_or_demo" on notifications;
  create policy "notifications_own_or_demo" on notifications for all
    using (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001')
    with check (user_id = auth.uid() or user_id = '00000000-0000-0000-0000-000000000001');
end $$;

-- 6. Seed Executive Circle Demo Data
insert into profiles (id, full_name, email, home_city, home_airport)
values ('00000000-0000-0000-0000-000000000001', 'Aarav Mehta', 'aarav.mehta@wayfinder.travel', 'Bengaluru', 'BLR')
on conflict (id) do nothing;

insert into travel_preferences (user_id, default_budget, currency, cabin, hotel_stars, interests, avoid, voice_persona, voice_cadence, read_prices_aloud, approval_ttl_minutes)
values ('00000000-0000-0000-0000-000000000001', 40000, 'INR', 'premium_economy', 4, array['Beaches','Food & Dining','Culture & Art','Wellness & Spa'], array['Red-eye departures','Layovers over 90 mins'], 'aria', 1.0, true, 5)
on conflict (user_id) do nothing;

insert into trips (id, user_id, title, destination, origin, start_date, end_date, budget, total_cost, status)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Jaipur Heritage Retreat', 'Jaipur', 'BLR', '2026-10-14', '2026-10-18', 95000, 89200, 'completed'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Coorg Coffee Trail', 'Coorg', 'BLR', '2026-08-22', '2026-08-25', 45000, 42500, 'completed')
on conflict (id) do nothing;

insert into combined_trips (id, user_id, title, description, total_budget, total_cost, status)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Royal Heritage & Estate Circuit', 'Jaipur palace retreat seamlessly paired with Coorg plantation rest.', 140000, 131700, 'completed')
on conflict (id) do nothing;

insert into combined_trip_legs (id, combined_trip_id, trip_id, ordinal, transfer_note)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 1, 'Direct BLR -> JAI executive leg'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 2, 'Chauffeur plantation transfer via Mysuru')
on conflict (id) do nothing;

insert into expenses (id, user_id, trip_id, category, merchant, description, amount, currency, payment_method, reimbursable, status, spent_at)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'hotel', 'Sujan Rajmahal Palace', '3-night Heritage Suite stay', 64000, 'INR', 'Amex Corporate', true, 'reimbursed', '2026-10-14T15:00:00Z'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'flight', 'Air India Executive', 'BLR ⇄ JAI return flight', 21400, 'INR', 'Amex Corporate', true, 'reimbursed', '2026-10-14T08:00:00Z'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'dining', 'Bar Palladio Jaipur', 'Partner dinner & tasting menu', 3800, 'INR', 'Amex Corporate', true, 'authorized', '2026-10-15T20:30:00Z'),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'hotel', 'Evolve Back Coorg', 'Plantation Pool Villa', 36500, 'INR', 'HDFC Infinia', false, 'logged', '2026-08-22T14:00:00Z'),
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'transport', 'Wayfinder Chauffeur', 'Innova Crysta BLR → Coorg return', 6000, 'INR', 'Amex Corporate', true, 'reimbursed', '2026-08-22T09:00:00Z')
on conflict (id) do nothing;
