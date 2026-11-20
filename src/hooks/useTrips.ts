import { useCallback, useEffect, useState } from 'react';
import type { DisruptionItem, NotificationItem, Trip } from '../../shared/types';
import { apiFetch } from '../lib/api';

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        trips: Trip[];
        disruptions: DisruptionItem[];
        notifications: NotificationItem[];
      }>('/api/trips');
      setTrips(data.trips);
      setDisruptions(data.disruptions);
      setNotifications(data.notifications);
    } catch {
      // Ignore if unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { trips, disruptions, notifications, loading, refresh };
}
