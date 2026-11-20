import { useEffect } from 'react';
import { REALTIME_EVENTS, type RealtimePayload } from '../../shared/events';
import { supabaseClient } from '../lib/supabase';
import { useSessionStore } from '../store/session.store';

export function useRealtimeSession(sessionId: string | null | undefined) {
  useEffect(() => {
    if (!sessionId) return;

    const store = useSessionStore.getState();
    const es = new EventSource(`/api/agora/session/${sessionId}/events`, {
      withCredentials: true,
    });

    const handleEvent = (raw: MessageEvent) => {
      try {
        const parsed = JSON.parse(raw.data) as RealtimePayload;
        switch (parsed.type) {
          case REALTIME_EVENTS.SESSION_SNAPSHOT:
            store.applySnapshot(parsed.data);
            break;
          case REALTIME_EVENTS.MESSAGE_CREATED:
            store.upsertMessage(parsed.data);
            break;
          case REALTIME_EVENTS.PLAN_UPDATED:
            store.setPlan(parsed.data);
            break;
          case REALTIME_EVENTS.PLAN_STEP_UPDATED:
            store.upsertPlanStep(parsed.data);
            break;
          case REALTIME_EVENTS.TOOL_CALL_UPDATED:
            store.upsertToolCall(parsed.data);
            break;
          case REALTIME_EVENTS.APPROVAL_UPDATED:
            store.upsertApproval(parsed.data);
            break;
          case REALTIME_EVENTS.BOOKING_CREATED:
            store.upsertBooking(parsed.data);
            break;
          case REALTIME_EVENTS.ITINERARY_UPDATED:
            store.upsertItineraryItem(parsed.data);
            break;
          case REALTIME_EVENTS.DISRUPTION_UPDATED:
            store.upsertDisruption(parsed.data);
            break;
          case REALTIME_EVENTS.NOTIFICATION_CREATED:
            store.pushNotification(parsed.data);
            break;
          case REALTIME_EVENTS.EXPENSE_UPDATED:
            store.upsertExpense(parsed.data);
            break;
          case REALTIME_EVENTS.COMBINED_TRIP_UPDATED:
            store.upsertCombinedTrip(parsed.data);
            break;
        }
      } catch {
        // Ignore malformed frame
      }
    };

    for (const evtName of Object.values(REALTIME_EVENTS)) {
      es.addEventListener(evtName, handleEvent as EventListener);
    }

    const channel = supabaseClient
      ? supabaseClient
          .channel(`wayfinder-${sessionId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', filter: `session_id=eq.${sessionId}` },
            () => {
              // SSE stream handles immediate delivery
            },
          )
          .subscribe()
      : null;

    return () => {
      es.close();
      if (channel && supabaseClient) {
        void supabaseClient.removeChannel(channel);
      }
    };
  }, [sessionId]);
}
