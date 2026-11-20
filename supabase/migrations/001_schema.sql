create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
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
  avoid text[] default '{}'
);

create table if not exists calendar_connections (
  user_id uuid primary key references profiles(id) on delete cascade,
  provider text default 'google',
  calendar_id text default 'primary',
  refresh_token_enc text not null,
  connected_at timestamptz default now()
);

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

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  destination text,
  origin text default 'BLR',
  start_date date,
  end_date date,
  budget numeric,
  total_cost numeric,
  status text default 'planning',
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references voice_sessions(id) on delete cascade,
  trip_id uuid references trips(id),
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
  plan_step_id uuid references plan_steps(id),
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
  trip_id uuid references trips(id),
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
  approval_id uuid references approvals(id),
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
  booking_id uuid references bookings(id),
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
  booking_id uuid references bookings(id),
  type text,
  detail jsonb,
  status text default 'open',
  detected_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  trip_id uuid references trips(id),
  type text,
  title text,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);
