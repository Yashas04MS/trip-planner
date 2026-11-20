alter table profiles enable row level security;
alter table travel_preferences enable row level security;
alter table calendar_connections enable row level security;
alter table voice_sessions enable row level security;
alter table messages enable row level security;
alter table trips enable row level security;
alter table plans enable row level security;
alter table plan_steps enable row level security;
alter table tool_calls enable row level security;
alter table approvals enable row level security;
alter table bookings enable row level security;
alter table itinerary_items enable row level security;
alter table reminders enable row level security;
alter table disruptions enable row level security;
alter table notifications enable row level security;

create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

create policy "prefs_select_own" on travel_preferences for select using (user_id = auth.uid());
create policy "prefs_update_own" on travel_preferences for update using (user_id = auth.uid());

create policy "calendar_select_own" on calendar_connections for select using (user_id = auth.uid());

create policy "sessions_select_own" on voice_sessions for select using (user_id = auth.uid());

create policy "messages_select_own" on messages for select
  using (exists (select 1 from voice_sessions s where s.id = messages.session_id and s.user_id = auth.uid()));

create policy "trips_select_own" on trips for select using (user_id = auth.uid());

create policy "plans_select_own" on plans for select
  using (exists (select 1 from voice_sessions s where s.id = plans.session_id and s.user_id = auth.uid()));

create policy "plan_steps_select_own" on plan_steps for select
  using (exists (
    select 1 from plans p
    join voice_sessions s on s.id = p.session_id
    where p.id = plan_steps.plan_id and s.user_id = auth.uid()
  ));

create policy "tool_calls_select_own" on tool_calls for select
  using (exists (select 1 from voice_sessions s where s.id = tool_calls.session_id and s.user_id = auth.uid()));

create policy "approvals_select_own" on approvals for select
  using (exists (select 1 from voice_sessions s where s.id = approvals.session_id and s.user_id = auth.uid()));

create policy "bookings_select_own" on bookings for select
  using (exists (select 1 from trips t where t.id = bookings.trip_id and t.user_id = auth.uid()));

create policy "itinerary_select_own" on itinerary_items for select
  using (exists (select 1 from trips t where t.id = itinerary_items.trip_id and t.user_id = auth.uid()));

create policy "reminders_select_own" on reminders for select using (user_id = auth.uid());

create policy "disruptions_select_own" on disruptions for select
  using (exists (select 1 from trips t where t.id = disruptions.trip_id and t.user_id = auth.uid()));

create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
