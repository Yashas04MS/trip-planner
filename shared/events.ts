import type {
  ApprovalRequest,
  BookingRecord,
  ChatMessage,
  CombinedTripPlan,
  DisruptionItem,
  ExpenseRecord,
  ItineraryItem,
  NotificationItem,
  Plan,
  PlanStep,
  SessionSnapshot,
  ToolCallLog,
} from './types';

export const REALTIME_EVENTS = {
  SESSION_SNAPSHOT: 'session:snapshot',
  MESSAGE_CREATED: 'message:created',
  PLAN_UPDATED: 'plan:updated',
  PLAN_STEP_UPDATED: 'plan_step:updated',
  TOOL_CALL_UPDATED: 'tool_call:updated',
  APPROVAL_UPDATED: 'approval:updated',
  BOOKING_CREATED: 'booking:created',
  ITINERARY_UPDATED: 'itinerary:updated',
  DISRUPTION_UPDATED: 'disruption:updated',
  NOTIFICATION_CREATED: 'notification:created',
  EXPENSE_UPDATED: 'expense:updated',
  COMBINED_TRIP_UPDATED: 'combined_trip:updated',
} as const;

export type RealtimeEventType =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export type RealtimePayload =
  | { type: typeof REALTIME_EVENTS.SESSION_SNAPSHOT; data: SessionSnapshot }
  | { type: typeof REALTIME_EVENTS.MESSAGE_CREATED; data: ChatMessage }
  | { type: typeof REALTIME_EVENTS.PLAN_UPDATED; data: Plan }
  | { type: typeof REALTIME_EVENTS.PLAN_STEP_UPDATED; data: PlanStep }
  | { type: typeof REALTIME_EVENTS.TOOL_CALL_UPDATED; data: ToolCallLog }
  | { type: typeof REALTIME_EVENTS.APPROVAL_UPDATED; data: ApprovalRequest }
  | { type: typeof REALTIME_EVENTS.BOOKING_CREATED; data: BookingRecord }
  | { type: typeof REALTIME_EVENTS.ITINERARY_UPDATED; data: ItineraryItem }
  | { type: typeof REALTIME_EVENTS.DISRUPTION_UPDATED; data: DisruptionItem }
  | { type: typeof REALTIME_EVENTS.NOTIFICATION_CREATED; data: NotificationItem }
  | { type: typeof REALTIME_EVENTS.EXPENSE_UPDATED; data: ExpenseRecord }
  | { type: typeof REALTIME_EVENTS.COMBINED_TRIP_UPDATED; data: CombinedTripPlan };
