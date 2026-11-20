-- Demo user preferences & sample completed trip seed for Wayfinder
-- Replace the UUID with an actual auth.users id when seeding Supabase directly.
insert into profiles (id, full_name, email, home_city, home_airport)
values ('00000000-0000-0000-0000-000000000001', 'Aarav Mehta', 'aarav@wayfinder.travel', 'Bengaluru', 'BLR')
on conflict (id) do nothing;

insert into travel_preferences (user_id, default_budget, currency, cabin, hotel_stars, interests, avoid)
values (
  '00000000-0000-0000-0000-000000000001',
  40000,
  'INR',
  'economy',
  4,
  array['boutique coastal stays', 'direct flights', 'quiet lounges'],
  array['red-eye departures', 'unverified transfers']
)
on conflict (user_id) do nothing;
