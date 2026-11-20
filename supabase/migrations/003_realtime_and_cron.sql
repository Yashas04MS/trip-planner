alter publication supabase_realtime add table
  messages,
  plan_steps,
  tool_calls,
  approvals,
  bookings,
  itinerary_items,
  notifications,
  disruptions;

-- Scheduled jobs (requires pg_cron & pg_net enabled in Supabase)
-- Replace <PUBLIC_BASE_URL> and <CRON_SECRET> before applying in production.
select cron.schedule(
  'wayfinder-expire-approvals',
  '* * * * *',
  $$update approvals set status = 'expired' where status = 'pending' and expires_at < now();$$
);
