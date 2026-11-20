import { store } from '../lib/store';

export async function runRemindersJob(): Promise<{ processed: number }> {
  const due = await store.getDueReminders(new Date().toISOString());
  for (const reminder of due) {
    await store.addNotification(null, {
      user_id: reminder.user_id,
      trip_id: reminder.trip_id,
      type: 'reminder_dispatched',
      title: 'Travel Reminder',
      body: reminder.message,
      read_at: null,
    });
    await store.markReminderSent(reminder.trip_id, reminder.id);
  }
  return { processed: due.length };
}
