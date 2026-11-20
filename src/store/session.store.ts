import { create } from 'zustand';
import type {
  ApprovalRequest,
  BookingRecord,
  CalendarBusyBlock,
  ChaosMode,
  ChatMessage,
  CombinedTripPlan,
  DisruptionItem,
  ExpenseRecord,
  FlightOffer,
  HotelOffer,
  ItineraryItem,
  NotificationItem,
  OrbState,
  Plan,
  PlanStep,
  SessionSnapshot,
  ToolCallLog,
  TravelPreferences,
  Trip,
  UserProfile,
  VoiceSession,
  WeatherForecast,
} from '../../shared/types';

interface ToastItem {
  id: string;
  title: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

interface SessionStoreState {
  profile: UserProfile | null;
  preferences: TravelPreferences | null;
  calendarConnected: boolean;
  authLoading: boolean;

  session: VoiceSession | null;
  voiceMode: 'agora_live' | 'browser_voice';
  orbState: OrbState;
  muted: boolean;
  connected: boolean;
  busyTurn: boolean;
  errorBanner: string | null;

  messages: ChatMessage[];
  plan: Plan | null;
  planSteps: PlanStep[];
  toolCalls: ToolCallLog[];
  approvals: ApprovalRequest[];
  bookings: BookingRecord[];
  itinerary: ItineraryItem[];
  flightOptions: FlightOffer[];
  hotelOptions: HotelOffer[];
  weather: WeatherForecast | null;
  calendarBlocks: CalendarBusyBlock[];
  disruptions: DisruptionItem[];
  notifications: NotificationItem[];
  expenses: ExpenseRecord[];
  combinedTrips: CombinedTripPlan[];
  trip: Trip | null;
  chaosMode: ChaosMode;

  toasts: ToastItem[];

  setAuthState: (patch: {
    profile?: UserProfile | null;
    preferences?: TravelPreferences | null;
    calendarConnected?: boolean;
    authLoading?: boolean;
  }) => void;
  setSessionControl: (patch: {
    voiceMode?: 'agora_live' | 'browser_voice';
    orbState?: OrbState;
    muted?: boolean;
    connected?: boolean;
    busyTurn?: boolean;
    errorBanner?: string | null;
  }) => void;
  applySnapshot: (snapshot: SessionSnapshot) => void;
  upsertMessage: (msg: ChatMessage) => void;
  setPlan: (plan: Plan) => void;
  upsertPlanStep: (step: PlanStep) => void;
  upsertToolCall: (log: ToolCallLog) => void;
  upsertApproval: (app: ApprovalRequest) => void;
  upsertBooking: (booking: BookingRecord) => void;
  upsertItineraryItem: (item: ItineraryItem) => void;
  upsertDisruption: (d: DisruptionItem) => void;
  upsertExpense: (expense: ExpenseRecord) => void;
  upsertCombinedTrip: (plan: CombinedTripPlan) => void;
  pushNotification: (n: NotificationItem) => void;
  pushToast: (title: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  profile: null,
  preferences: null,
  calendarConnected: false,
  authLoading: true,

  session: null,
  voiceMode: 'browser_voice',
  orbState: 'idle',
  muted: false,
  connected: false,
  busyTurn: false,
  errorBanner: null,

  messages: [],
  plan: null,
  planSteps: [],
  toolCalls: [],
  approvals: [],
  bookings: [],
  itinerary: [],
  flightOptions: [],
  hotelOptions: [],
  weather: null,
  calendarBlocks: [],
  disruptions: [],
  notifications: [],
  expenses: [],
  combinedTrips: [],
  trip: null,
  chaosMode: 'off',

  toasts: [],

  setAuthState: (patch) => set((s) => ({ ...s, ...patch })),

  setSessionControl: (patch) => set((s) => ({ ...s, ...patch })),

  applySnapshot: (snap) =>
    set(() => ({
      session: snap.session,
      connected: snap.session.status === 'active',
      messages: snap.messages,
      plan: snap.plan,
      planSteps: snap.planSteps,
      toolCalls: snap.toolCalls,
      approvals: snap.approvals,
      bookings: snap.bookings,
      itinerary: snap.itinerary,
      flightOptions: snap.flightOptions,
      hotelOptions: snap.hotelOptions,
      weather: snap.weather,
      calendarBlocks: snap.calendarBlocks,
      disruptions: snap.disruptions,
      notifications: snap.notifications,
      expenses: snap.expenses ?? [],
      combinedTrips: snap.combinedTrips ?? [],
      trip: snap.trip,
      chaosMode: snap.chaosMode,
    })),

  upsertMessage: (msg) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = [...s.messages];
        next[idx] = msg;
        return { messages: next };
      }
      return { messages: [...s.messages, msg] };
    }),

  setPlan: (plan) => set(() => ({ plan })),

  upsertPlanStep: (step) =>
    set((s) => {
      const idx = s.planSteps.findIndex((p) => p.id === step.id || p.key === step.key);
      const next = [...s.planSteps];
      if (idx >= 0) next[idx] = step;
      else next.push(step);
      next.sort((a, b) => a.ordinal - b.ordinal);
      return { planSteps: next };
    }),

  upsertToolCall: (log) =>
    set((s) => {
      const idx = s.toolCalls.findIndex((t) => t.id === log.id);
      const next = [...s.toolCalls];
      if (idx >= 0) next[idx] = log;
      else next.push(log);
      return { toolCalls: next };
    }),

  upsertApproval: (app) =>
    set((s) => {
      const idx = s.approvals.findIndex((a) => a.id === app.id);
      const next = [...s.approvals];
      if (idx >= 0) next[idx] = app;
      else next.unshift(app);
      return { approvals: next };
    }),

  upsertBooking: (booking) =>
    set((s) => {
      const idx = s.bookings.findIndex((b) => b.id === booking.id);
      const next = [...s.bookings];
      if (idx >= 0) next[idx] = booking;
      else next.push(booking);
      return { bookings: next };
    }),

  upsertItineraryItem: (item) =>
    set((s) => {
      const idx = s.itinerary.findIndex((i) => i.id === item.id);
      const next = [...s.itinerary];
      if (idx >= 0) next[idx] = item;
      else next.push(item);
      return { itinerary: next };
    }),

  upsertDisruption: (d) =>
    set((s) => {
      const idx = s.disruptions.findIndex((x) => x.id === d.id);
      const next = [...s.disruptions];
      if (idx >= 0) next[idx] = d;
      else next.unshift(d);
      return { disruptions: next };
    }),

  upsertExpense: (expense) =>
    set((s) => {
      const idx = s.expenses.findIndex((e) => e.id === expense.id);
      const next = [...s.expenses];
      if (idx >= 0) next[idx] = expense;
      else next.unshift(expense);
      return { expenses: next };
    }),

  upsertCombinedTrip: (plan) =>
    set((s) => {
      const idx = s.combinedTrips.findIndex((c) => c.id === plan.id);
      const next = [...s.combinedTrips];
      if (idx >= 0) next[idx] = plan;
      else next.unshift(plan);
      return { combinedTrips: next };
    }),

  pushNotification: (n) =>
    set((s) => {
      if (s.notifications.some((x) => x.id === n.id)) return {};
      return { notifications: [n, ...s.notifications] };
    }),

  pushToast: (title, tone = 'info') =>
    set((s) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setTimeout(() => {
        useSessionStore.getState().dismissToast(id);
      }, 4500);
      return { toasts: [...s.toasts, { id, title, tone }] };
    }),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  resetSession: () =>
    set(() => ({
      session: null,
      connected: false,
      orbState: 'idle',
      messages: [],
      plan: null,
      planSteps: [],
      toolCalls: [],
      approvals: [],
      bookings: [],
      itinerary: [],
      flightOptions: [],
      hotelOptions: [],
      weather: null,
      calendarBlocks: [],
      trip: null,
    })),
}));
