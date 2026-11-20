import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { REALTIME_EVENTS, type RealtimePayload } from '../../shared/events';
import type {
  ApprovalRequest,
  ApprovalStatus,
  BookingRecord,
  CalendarBusyBlock,
  ChaosMode,
  ChatMessage,
  CombinedTripLeg,
  CombinedTripPlan,
  DisruptionItem,
  ExpenseCategory,
  ExpenseRecord,
  FlightOffer,
  HotelOffer,
  ItineraryItem,
  NotificationItem,
  Plan,
  PlanStep,
  PlanStepStatus,
  ReminderItem,
  SessionSnapshot,
  ToolCallLog,
  TravelPreferences,
  Trip,
  TripDetailBundle,
  UserProfile,
  VoiceSession,
  WeatherForecast,
} from '../../shared/types';
import { env } from '../config/env';
import { safeSupabaseRun } from './supabase';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_TRIP_ID = '00000000-0000-0000-0000-000000000101';
export const DEMO_TRIP_JAIPUR_ID = '00000000-0000-0000-0000-000000000102';
export const DEMO_TRIP_COORG_ID = '00000000-0000-0000-0000-000000000103';
export const DEMO_COMBINED_ID = '00000000-0000-0000-0000-000000000201';

interface CalendarConnRecord {
  user_id: string;
  provider: string;
  calendar_id: string;
  refresh_token_enc: string;
  connected_at: string;
}

interface MemoryDb {
  profiles: Map<string, UserProfile>;
  preferences: Map<string, TravelPreferences>;
  calendarConnections: Map<string, CalendarConnRecord>;
  sessions: Map<string, VoiceSession>;
  messages: Map<string, ChatMessage[]>;
  plans: Map<string, Plan>;
  planSteps: Map<string, PlanStep[]>;
  toolCalls: Map<string, ToolCallLog[]>;
  approvals: Map<string, ApprovalRequest>;
  trips: Map<string, Trip>;
  bookings: Map<string, BookingRecord[]>;
  itinerary: Map<string, ItineraryItem[]>;
  reminders: Map<string, ReminderItem[]>;
  disruptions: Map<string, DisruptionItem[]>;
  notifications: Map<string, NotificationItem[]>;
  expenses: Map<string, ExpenseRecord[]>;
  combinedTrips: Map<string, CombinedTripPlan[]>;
  hydratedUsers: Set<string>;
  sessionExtras: Map<
    string,
    {
      flightOptions: FlightOffer[];
      hotelOptions: HotelOffer[];
      weather: WeatherForecast | null;
      calendarBlocks: CalendarBusyBlock[];
      tripId: string | null;
      chaosMode: ChaosMode;
    }
  >;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

const db: MemoryDb = {
  profiles: new Map(),
  preferences: new Map(),
  calendarConnections: new Map(),
  sessions: new Map(),
  messages: new Map(),
  plans: new Map(),
  planSteps: new Map(),
  toolCalls: new Map(),
  approvals: new Map(),
  trips: new Map(),
  bookings: new Map(),
  itinerary: new Map(),
  reminders: new Map(),
  disruptions: new Map(),
  notifications: new Map(),
  expenses: new Map(),
  combinedTrips: new Map(),
  hydratedUsers: new Set(),
  sessionExtras: new Map(),
};

function seedDemoData() {
  if (db.profiles.has(DEMO_USER_ID)) return;

  db.profiles.set(DEMO_USER_ID, {
    id: DEMO_USER_ID,
    full_name: 'Aarav Patel',
    email: 'aarav.mehta@wayfinder.travel',
    home_city: 'Bengaluru',
    home_airport: 'BLR',
    created_at: new Date('2026-10-01T08:00:00Z').toISOString(),
  });

  db.preferences.set(DEMO_USER_ID, {
    user_id: DEMO_USER_ID,
    default_budget: 40000,
    currency: 'INR',
    cabin: 'economy',
    hotel_stars: 4,
    interests: ['Beaches', 'Food & Dining', 'Culture & Art', 'Wellness & Spa'],
    avoid: ['Red-eye flights', 'Layovers over 90 mins', 'Non-refundable hotel rooms'],
    voice_persona: 'aria',
    voice_cadence: 1.0,
    read_prices_aloud: true,
    approval_ttl_minutes: 5,
  });

  const goaSeedTrip: Trip = {
    id: DEMO_TRIP_ID,
    user_id: DEMO_USER_ID,
    title: 'Goa Weekend Getaway',
    destination: 'Goa',
    origin: 'BLR',
    start_date: '2026-11-27',
    end_date: '2026-11-29',
    budget: 40000,
    total_cost: 34800,
    status: 'booked',
    created_at: new Date('2026-11-18T10:15:00Z').toISOString(),
  };

  const jaipurTrip: Trip = {
    id: DEMO_TRIP_JAIPUR_ID,
    user_id: DEMO_USER_ID,
    title: 'Jaipur Heritage Retreat',
    destination: 'Jaipur',
    origin: 'BLR',
    start_date: '2026-10-14',
    end_date: '2026-10-18',
    budget: 95000,
    total_cost: 89200,
    status: 'completed',
    created_at: new Date('2026-10-10T10:15:00Z').toISOString(),
  };

  const coorgTrip: Trip = {
    id: DEMO_TRIP_COORG_ID,
    user_id: DEMO_USER_ID,
    title: 'Coorg Coffee Trail',
    destination: 'Coorg',
    origin: 'BLR',
    start_date: '2026-08-22',
    end_date: '2026-08-25',
    budget: 48000,
    total_cost: 42500,
    status: 'completed',
    created_at: new Date('2026-08-15T10:15:00Z').toISOString(),
  };

  db.trips.set(goaSeedTrip.id, goaSeedTrip);
  db.trips.set(jaipurTrip.id, jaipurTrip);
  db.trips.set(coorgTrip.id, coorgTrip);

  db.bookings.set(goaSeedTrip.id, [
    {
      id: 'b-seed-goa-flight',
      trip_id: goaSeedTrip.id,
      approval_id: null,
      type: 'flight',
      provider: 'IndiGo',
      provider_ref: 'Q9XW4L',
      details: {
        airline: 'IndiGo',
        flight_number: '6E 6128',
        origin: 'BLR',
        destination: 'GOI',
        depart_at: '2026-11-27T18:05:00+05:30',
        arrive_at: '2026-11-27T19:20:00+05:30',
        return_flight_number: 'AI 559',
        return_depart_at: '2026-11-29T20:15:00+05:30',
        return_arrive_at: '2026-11-29T21:30:00+05:30',
        seat_class: 'Seat 3F (Aisle)',
      },
      price: 10450,
      status: 'confirmed',
      idempotency_key: 'seed-goa-flight',
      created_at: new Date('2026-11-18T10:16:00Z').toISOString(),
    },
    {
      id: 'b-seed-goa-hotel',
      trip_id: goaSeedTrip.id,
      approval_id: null,
      type: 'hotel',
      provider: 'Wayfinder Collection',
      provider_ref: 'PG-4912',
      details: {
        name: 'Palm Grove Beach Hotel',
        area: 'Benaulim, South Goa',
        nights: 2,
        stars: 4,
        room: 'Deluxe Sea Facing Cottage',
      },
      price: 24350,
      status: 'confirmed',
      idempotency_key: 'seed-goa-hotel',
      created_at: new Date('2026-11-18T10:16:20Z').toISOString(),
    },
  ]);

  db.bookings.set(jaipurTrip.id, [
    {
      id: 'b-seed-jai-flight',
      trip_id: jaipurTrip.id,
      approval_id: null,
      type: 'flight',
      provider: 'Air India',
      provider_ref: 'AI-JAI-910',
      details: {
        airline: 'Air India',
        flight_number: 'AI 804',
        origin: 'BLR',
        destination: 'JAI',
        depart_at: '2026-10-14T10:15:00+05:30',
        arrive_at: '2026-10-14T13:05:00+05:30',
        seat_class: 'Business 2A',
      },
      price: 24200,
      status: 'confirmed',
      idempotency_key: 'seed-jai-flight',
      created_at: new Date('2026-10-10T10:16:00Z').toISOString(),
    },
    {
      id: 'b-seed-jai-hotel',
      trip_id: jaipurTrip.id,
      approval_id: null,
      type: 'hotel',
      provider: 'Sujan Heritage',
      provider_ref: 'SR-2041',
      details: {
        name: 'Sujan Rajmahal Palace',
        area: 'C-Scheme, Jaipur',
        nights: 4,
        stars: 5,
        room: 'Royal Courtyard Suite',
      },
      price: 65000,
      status: 'confirmed',
      idempotency_key: 'seed-jai-hotel',
      created_at: new Date('2026-10-10T10:16:15Z').toISOString(),
    },
  ]);

  db.bookings.set(coorgTrip.id, [
    {
      id: 'b-seed-coorg-hotel',
      trip_id: coorgTrip.id,
      approval_id: null,
      type: 'hotel',
      provider: 'Evolve Back',
      provider_ref: 'EB-COORG-312',
      details: {
        name: 'Evolve Back Chikkana Halli Estate',
        area: 'Siddapura, Coorg',
        nights: 3,
        stars: 5,
        room: 'Heritage Pool Villa',
      },
      price: 42500,
      status: 'confirmed',
      idempotency_key: 'seed-coorg-hotel',
      created_at: new Date('2026-08-15T10:16:00Z').toISOString(),
    },
  ]);

  db.itinerary.set(goaSeedTrip.id, [
    {
      id: 'it-seed-goa-0',
      trip_id: goaSeedTrip.id,
      booking_id: null,
      kind: 'calendar_hold',
      title: 'Weekly Engineering Standup (Pre-flight Handoff)',
      location: 'Google Meet · Audio Sync',
      starts_at: '2026-11-27T16:00:00+05:30',
      ends_at: '2026-11-27T16:30:00+05:30',
      calendar_event_id: 'gcal_standup_01',
      status: 'scheduled',
    },
    {
      id: 'it-seed-goa-1',
      trip_id: goaSeedTrip.id,
      booking_id: 'b-seed-goa-flight',
      kind: 'flight',
      title: 'IndiGo 6E 6128 · BLR → GOI',
      location: 'Kempegowda Intl T1 → Dabolim T1',
      starts_at: '2026-11-27T18:05:00+05:30',
      ends_at: '2026-11-27T19:20:00+05:30',
      calendar_event_id: 'gcal_goa_01',
      status: 'scheduled',
    },
    {
      id: 'it-seed-goa-2',
      trip_id: goaSeedTrip.id,
      booking_id: 'b-seed-goa-hotel',
      kind: 'hotel',
      title: 'Check-in · Palm Grove Beach Hotel',
      location: 'Benaulim, South Goa',
      starts_at: '2026-11-27T20:30:00+05:30',
      ends_at: '2026-11-29T11:00:00+05:30',
      calendar_event_id: 'gcal_goa_02',
      status: 'scheduled',
    },
    {
      id: 'it-seed-goa-3',
      trip_id: goaSeedTrip.id,
      booking_id: null,
      kind: 'activity',
      title: 'South Goa Coastal Kayaking & Dinner at Cavatina',
      location: 'Sal Backwaters & Benaulim',
      starts_at: '2026-11-28T13:00:00+05:30',
      ends_at: '2026-11-28T21:30:00+05:30',
      calendar_event_id: 'gcal_goa_03',
      status: 'scheduled',
    },
  ]);

  db.itinerary.set(jaipurTrip.id, [
    {
      id: 'it-seed-jai-1',
      trip_id: jaipurTrip.id,
      booking_id: 'b-seed-jai-flight',
      kind: 'flight',
      title: 'BLR → JAI (Air India AI 804)',
      location: 'Kempegowda Intl → Jaipur Intl',
      starts_at: '2026-10-14T10:15:00+05:30',
      ends_at: '2026-10-14T13:05:00+05:30',
      calendar_event_id: 'gcal_jai_01',
      status: 'scheduled',
    },
    {
      id: 'it-seed-jai-2',
      trip_id: jaipurTrip.id,
      booking_id: 'b-seed-jai-hotel',
      kind: 'hotel',
      title: 'Check-in · Sujan Rajmahal Palace',
      location: 'C-Scheme, Jaipur',
      starts_at: '2026-10-14T14:30:00+05:30',
      ends_at: '2026-10-18T11:00:00+05:30',
      calendar_event_id: 'gcal_jai_02',
      status: 'scheduled',
    },
  ]);

  db.itinerary.set(coorgTrip.id, [
    {
      id: 'it-seed-coorg-1',
      trip_id: coorgTrip.id,
      booking_id: 'b-seed-coorg-hotel',
      kind: 'hotel',
      title: 'Private Estate Arrival · Evolve Back Coorg',
      location: 'Siddapura, Coorg',
      starts_at: '2026-08-22T14:00:00+05:30',
      ends_at: '2026-08-25T11:00:00+05:30',
      calendar_event_id: 'gcal_coorg_01',
      status: 'scheduled',
    },
  ]);

  db.reminders.set(goaSeedTrip.id, [
    {
      id: 'rem-goa-1',
      trip_id: goaSeedTrip.id,
      user_id: DEMO_USER_ID,
      remind_at: '2026-11-25T18:05:00+05:30',
      message: 'Web check-in opens for IndiGo 6E 6128 (Auto-assign Seat 3F)',
      sent_at: null,
    },
    {
      id: 'rem-goa-2',
      trip_id: goaSeedTrip.id,
      user_id: DEMO_USER_ID,
      remind_at: '2026-11-26T20:00:00+05:30',
      message: 'Pack linen wear & sun protection (South Goa 31°C, clear)',
      sent_at: null,
    },
    {
      id: 'rem-goa-3',
      trip_id: goaSeedTrip.id,
      user_id: DEMO_USER_ID,
      remind_at: '2026-11-28T10:00:00+05:30',
      message: 'Confirm late 2:00 PM check-out with Palm Grove desk',
      sent_at: null,
    },
  ]);

  db.reminders.set(jaipurTrip.id, [
    {
      id: 'rem-seed-1',
      trip_id: jaipurTrip.id,
      user_id: DEMO_USER_ID,
      remind_at: '2026-10-13T18:10:00+05:30',
      message: 'Web check-in completed for AI 804 BLR → JAI',
      sent_at: '2026-10-13T18:11:00+05:30',
    },
  ]);

  db.notifications.set(DEMO_USER_ID, [
    {
      id: 'notif-seed-1',
      user_id: DEMO_USER_ID,
      trip_id: goaSeedTrip.id,
      type: 'booking_confirmed',
      title: 'Goa Weekend Getaway reservations locked',
      body: 'IndiGo 6E 6128 (Seat 3F) & Palm Grove Beach Hotel confirmed within ₹40,000 budget.',
      read_at: null,
      created_at: new Date('2026-11-18T10:20:00Z').toISOString(),
    },
    {
      id: 'notif-seed-2',
      user_id: DEMO_USER_ID,
      trip_id: jaipurTrip.id,
      type: 'trip_completed',
      title: 'Jaipur Heritage Retreat settled',
      body: 'All boarding passes, tax invoices, and ₹89,200 expense receipts archived.',
      read_at: new Date('2026-10-19T09:00:00Z').toISOString(),
      created_at: new Date('2026-10-19T09:00:00Z').toISOString(),
    },
  ]);

  // Seed realistic Expenses for the USP Expense Tracker
  db.expenses.set(DEMO_USER_ID, [
    {
      id: 'exp-seed-1',
      user_id: DEMO_USER_ID,
      trip_id: goaSeedTrip.id,
      combined_trip_id: null,
      booking_id: 'b-seed-goa-flight',
      category: 'flight',
      merchant: 'IndiGo Airlines',
      description: 'BLR ⇄ GOI Round-trip Airfare (6E 6128 / AI 559 · Seat 3F)',
      amount: 10450,
      currency: 'INR',
      payment_method: 'Amex Corp •• 4102',
      reimbursable: true,
      status: 'authorized',
      spent_at: '2026-11-18T10:16:00Z',
      created_at: '2026-11-18T10:16:00Z',
    },
    {
      id: 'exp-seed-2',
      user_id: DEMO_USER_ID,
      trip_id: goaSeedTrip.id,
      combined_trip_id: null,
      booking_id: 'b-seed-goa-hotel',
      category: 'hotel',
      merchant: 'Palm Grove Beach Hotel',
      description: '2 Nights Deluxe Sea Facing Cottage · Benaulim (incl. breakfast)',
      amount: 24350,
      currency: 'INR',
      payment_method: 'Amex Corp •• 4102',
      reimbursable: true,
      status: 'authorized',
      spent_at: '2026-11-18T10:16:20Z',
      created_at: '2026-11-18T10:16:20Z',
    },
    {
      id: 'exp-seed-3',
      user_id: DEMO_USER_ID,
      trip_id: goaSeedTrip.id,
      combined_trip_id: null,
      booking_id: null,
      category: 'transport',
      merchant: 'BLR Executive Chauffeur',
      description: 'Toyota Innova Crysta pre-booked Indiranagar → Kempegowda T1',
      amount: 2400,
      currency: 'INR',
      payment_method: 'Personal UPI',
      reimbursable: true,
      status: 'logged',
      spent_at: '2026-11-19T14:10:00Z',
      created_at: '2026-11-19T14:10:00Z',
    },
    {
      id: 'exp-seed-4',
      user_id: DEMO_USER_ID,
      trip_id: jaipurTrip.id,
      combined_trip_id: DEMO_COMBINED_ID,
      booking_id: 'b-seed-jai-hotel',
      category: 'hotel',
      merchant: 'Sujan Rajmahal Palace',
      description: '4 Nights Royal Courtyard Suite · Settled executive retreat',
      amount: 65000,
      currency: 'INR',
      payment_method: 'Amex Corp •• 4102',
      reimbursable: true,
      status: 'reimbursed',
      spent_at: '2026-10-14T14:30:00Z',
      created_at: '2026-10-14T14:30:00Z',
    },
    {
      id: 'exp-seed-5',
      user_id: DEMO_USER_ID,
      trip_id: coorgTrip.id,
      combined_trip_id: DEMO_COMBINED_ID,
      booking_id: null,
      category: 'dining',
      merchant: 'Cavatina Cuchina & Estate Tasting',
      description: 'Private client tasting dinner & plantation coffee pairing',
      amount: 6850,
      currency: 'INR',
      payment_method: 'HDFC Infinia •• 8821',
      reimbursable: false,
      status: 'logged',
      spent_at: '2026-08-23T20:15:00Z',
      created_at: '2026-08-23T20:15:00Z',
    },
  ]);

  // Seed one Multi-Trip Combined Plan circuit
  db.combinedTrips.set(DEMO_USER_ID, [
    {
      id: DEMO_COMBINED_ID,
      user_id: DEMO_USER_ID,
      title: 'Royal Heritage & Coastal Circuit',
      description:
        'Combined two-part executive circuit pairing Jaipur architectural stays with South Goa coastal downtime and consolidated expense billing.',
      total_budget: 145000,
      total_cost: jaipurTrip.total_cost + goaSeedTrip.total_cost,
      status: 'active',
      legs: [
        {
          id: 'leg-seed-1',
          combined_trip_id: DEMO_COMBINED_ID,
          trip_id: jaipurTrip.id,
          ordinal: 1,
          transfer_note: 'Direct Air India AI 804 → Private Chauffeur to C-Scheme',
          trip: jaipurTrip,
        },
        {
          id: 'leg-seed-2',
          combined_trip_id: DEMO_COMBINED_ID,
          trip_id: goaSeedTrip.id,
          ordinal: 2,
          transfer_note: 'Connecting leg BLR → GOI IndiGo 6E 6128 after Friday standup',
          trip: goaSeedTrip,
        },
      ],
      created_at: new Date('2026-11-18T11:00:00Z').toISOString(),
    },
  ]);
}

seedDemoData();

function emit(sessionId: string, payload: RealtimePayload) {
  emitter.emit(`session:${sessionId}`, payload);
}

export function subscribeSessionEvents(
  sessionId: string,
  listener: (payload: RealtimePayload) => void,
): () => void {
  const channel = `session:${sessionId}`;
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}

function hydrateCombinedLegs(userId: string, plan: CombinedTripPlan): CombinedTripPlan {
  const enrichedLegs = plan.legs
    .map((leg) => ({
      ...leg,
      trip: db.trips.get(leg.trip_id) ?? leg.trip,
    }))
    .sort((a, b) => a.ordinal - b.ordinal);
  const computedCost = enrichedLegs.reduce((acc, leg) => acc + (leg.trip?.total_cost ?? 0), 0);
  return {
    ...plan,
    user_id: userId,
    legs: enrichedLegs,
    total_cost: computedCost > 0 ? computedCost : plan.total_cost,
  };
}

export const store = {
  async hydrateUserFromSupabase(userId: string): Promise<void> {
    if (db.hydratedUsers.has(userId)) return;
    db.hydratedUsers.add(userId);

    await safeSupabaseRun(async (sb) => {
      const [tripsRes, expensesRes, combinedRes] = await Promise.all([
        sb.from('trips').select('*').eq('user_id', userId),
        sb.from('expenses').select('*').eq('user_id', userId),
        sb.from('combined_trips').select('*, legs:combined_trip_legs(*)').eq('user_id', userId),
      ]);

      if (tripsRes.data && Array.isArray(tripsRes.data)) {
        for (const row of tripsRes.data) {
          const tripRow = row as Trip;
          if (tripRow?.id && !db.trips.has(tripRow.id)) {
            db.trips.set(tripRow.id, tripRow);
          }
        }
      }

      if (expensesRes.data && Array.isArray(expensesRes.data) && expensesRes.data.length > 0) {
        const current = db.expenses.get(userId) ?? [];
        const existingIds = new Set(current.map((e) => e.id));
        for (const row of expensesRes.data) {
          const exp = row as ExpenseRecord;
          if (exp?.id && !existingIds.has(exp.id)) {
            current.push(exp);
          }
        }
        current.sort((a, b) => b.spent_at.localeCompare(a.spent_at));
        db.expenses.set(userId, current);
      }

      if (combinedRes.data && Array.isArray(combinedRes.data) && combinedRes.data.length > 0) {
        const current = db.combinedTrips.get(userId) ?? [];
        const existingIds = new Set(current.map((c) => c.id));
        for (const row of combinedRes.data) {
          const plan = row as CombinedTripPlan;
          if (plan?.id && !existingIds.has(plan.id)) {
            current.push(hydrateCombinedLegs(userId, { ...plan, legs: plan.legs ?? [] }));
          }
        }
        db.combinedTrips.set(userId, current);
      }
    });
  },

  async ensureProfile(userId: string, email?: string, fullName?: string): Promise<UserProfile> {
    let profile = db.profiles.get(userId);
    if (!profile) {
      profile = {
        id: userId,
        full_name: fullName || 'Executive Traveler',
        email: email || 'traveler@wayfinder.travel',
        home_city: 'Bengaluru',
        home_airport: 'BLR',
        created_at: new Date().toISOString(),
      };
      db.profiles.set(userId, profile);
      db.preferences.set(userId, {
        user_id: userId,
        default_budget: 40000,
        currency: 'INR',
        cabin: 'economy',
        hotel_stars: 4,
        interests: ['Boutique stays', 'Direct evening flights'],
        avoid: ['Red-eye flights'],
        voice_persona: 'aria',
        voice_cadence: 1.0,
        read_prices_aloud: true,
        approval_ttl_minutes: 5,
      });
    }
    await safeSupabaseRun((sb) =>
      sb.from('profiles').upsert({
        id: profile!.id,
        full_name: profile!.full_name,
        email: profile!.email,
        home_city: profile!.home_city,
        home_airport: profile!.home_airport,
      }),
    );
    return profile;
  },

  async getProfile(userId: string): Promise<UserProfile> {
    return this.ensureProfile(userId);
  },

  async updateProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.ensureProfile(userId);
    const updated: UserProfile = {
      ...current,
      full_name: patch.full_name ?? current.full_name,
      home_city: patch.home_city ?? current.home_city,
      home_airport: (patch.home_airport ?? current.home_airport).toUpperCase(),
    };
    db.profiles.set(userId, updated);
    await safeSupabaseRun((sb) => sb.from('profiles').update(updated).eq('id', userId));
    return updated;
  },

  async getPreferences(userId: string): Promise<TravelPreferences> {
    await this.ensureProfile(userId);
    return (
      db.preferences.get(userId) ?? {
        user_id: userId,
        default_budget: 40000,
        currency: 'INR',
        cabin: 'economy',
        hotel_stars: 4,
        interests: [],
        avoid: [],
        voice_persona: 'aria',
        voice_cadence: 1.0,
        read_prices_aloud: true,
        approval_ttl_minutes: 5,
      }
    );
  },

  async updatePreferences(
    userId: string,
    patch: Partial<TravelPreferences>,
  ): Promise<TravelPreferences> {
    const current = await this.getPreferences(userId);
    const updated: TravelPreferences = {
      ...current,
      ...patch,
      user_id: userId,
    };
    db.preferences.set(userId, updated);
    await safeSupabaseRun((sb) =>
      sb.from('travel_preferences').upsert({
        user_id: updated.user_id,
        default_budget: updated.default_budget,
        currency: updated.currency,
        cabin: updated.cabin,
        hotel_stars: updated.hotel_stars,
        interests: updated.interests,
        avoid: updated.avoid,
      }),
    );
    return updated;
  },

  async resetPersonaMemory(userId: string): Promise<TravelPreferences> {
    return this.updatePreferences(userId, {
      default_budget: 40000,
      cabin: 'economy',
      hotel_stars: 4,
      interests: ['Boutique stays'],
      avoid: [],
      voice_persona: 'aria',
      voice_cadence: 1.0,
      read_prices_aloud: true,
      approval_ttl_minutes: 5,
    });
  },

  async setCalendarConnection(userId: string, refreshTokenEnc: string): Promise<void> {
    const record: CalendarConnRecord = {
      user_id: userId,
      provider: 'google',
      calendar_id: 'primary',
      refresh_token_enc: refreshTokenEnc,
      connected_at: new Date().toISOString(),
    };
    db.calendarConnections.set(userId, record);
    await safeSupabaseRun((sb) => sb.from('calendar_connections').upsert(record));
  },

  async getCalendarConnection(userId: string): Promise<CalendarConnRecord | null> {
    return db.calendarConnections.get(userId) ?? null;
  },

  async createVoiceSession(
    userId: string,
    channel: string,
    agentId: string | null = null,
  ): Promise<VoiceSession> {
    await this.ensureProfile(userId);
    const session: VoiceSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      channel,
      agent_id: agentId,
      status: 'active',
      started_at: new Date().toISOString(),
      ended_at: null,
    };
    db.sessions.set(session.id, session);
    db.messages.set(session.id, []);
    db.toolCalls.set(session.id, []);
    db.sessionExtras.set(session.id, {
      flightOptions: [],
      hotelOptions: [],
      weather: null,
      calendarBlocks: [],
      tripId: null,
      chaosMode: env.defaultChaosMode,
    });
    await safeSupabaseRun((sb) => sb.from('voice_sessions').insert(session));
    return session;
  },

  async getSession(sessionId: string): Promise<VoiceSession | null> {
    return db.sessions.get(sessionId) ?? null;
  },

  async listSessionsForUser(userId: string): Promise<VoiceSession[]> {
    return Array.from(db.sessions.values())
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  },

  async endVoiceSession(sessionId: string): Promise<VoiceSession | null> {
    const s = db.sessions.get(sessionId);
    if (!s) return null;
    s.status = 'ended';
    s.ended_at = new Date().toISOString();
    db.sessions.set(sessionId, s);
    await safeSupabaseRun((sb) =>
      sb
        .from('voice_sessions')
        .update({ status: 'ended', ended_at: s.ended_at })
        .eq('id', sessionId),
    );
    return s;
  },

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    const list = db.messages.get(sessionId) ?? [];
    list.push(msg);
    db.messages.set(sessionId, list);
    emit(sessionId, { type: REALTIME_EVENTS.MESSAGE_CREATED, data: msg });
    await safeSupabaseRun((sb) => sb.from('messages').insert(msg));
    return msg;
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return db.messages.get(sessionId) ?? [];
  },

  async createOrReplacePlan(
    sessionId: string,
    goal: string,
    tripId: string | null,
    stepsInput: Array<{
      ordinal: number;
      key: string;
      title: string;
      agent: PlanStep['agent'];
      depends_on: string[];
    }>,
  ): Promise<{ plan: Plan; steps: PlanStep[] }> {
    const plan: Plan = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      trip_id: tripId,
      goal,
      status: 'running',
      created_at: new Date().toISOString(),
    };
    db.plans.set(sessionId, plan);
    const steps: PlanStep[] = stepsInput.map((s) => ({
      id: crypto.randomUUID(),
      plan_id: plan.id,
      ordinal: s.ordinal,
      key: s.key,
      title: s.title,
      agent: s.agent,
      depends_on: s.depends_on,
      status: 'pending',
      result_summary: null,
      started_at: null,
      finished_at: null,
    }));
    db.planSteps.set(plan.id, steps);
    emit(sessionId, { type: REALTIME_EVENTS.PLAN_UPDATED, data: plan });
    for (const step of steps) {
      emit(sessionId, { type: REALTIME_EVENTS.PLAN_STEP_UPDATED, data: step });
    }
    await safeSupabaseRun(async (sb) => {
      await sb.from('plans').insert(plan);
      await sb.from('plan_steps').insert(steps);
    });
    return { plan, steps };
  },

  async updatePlanStatus(sessionId: string, status: Plan['status']): Promise<Plan | null> {
    const plan = db.plans.get(sessionId);
    if (!plan) return null;
    plan.status = status;
    db.plans.set(sessionId, plan);
    emit(sessionId, { type: REALTIME_EVENTS.PLAN_UPDATED, data: plan });
    await safeSupabaseRun((sb) => sb.from('plans').update({ status }).eq('id', plan.id));
    return plan;
  },

  async updatePlanStep(
    sessionId: string,
    key: string,
    status: PlanStepStatus,
    resultSummary?: string,
  ): Promise<PlanStep | null> {
    const plan = db.plans.get(sessionId);
    if (!plan) return null;
    const steps = db.planSteps.get(plan.id) ?? [];
    const step = steps.find((s) => s.key === key);
    if (!step) return null;

    const now = new Date().toISOString();
    if (status === 'running' && !step.started_at) {
      step.started_at = now;
    }
    if (status === 'done' || status === 'failed' || status === 'skipped') {
      step.finished_at = now;
    }
    step.status = status;
    if (resultSummary !== undefined) {
      step.result_summary = resultSummary;
    }
    emit(sessionId, { type: REALTIME_EVENTS.PLAN_STEP_UPDATED, data: step });
    await safeSupabaseRun((sb) =>
      sb
        .from('plan_steps')
        .update({
          status: step.status,
          result_summary: step.result_summary,
          started_at: step.started_at,
          finished_at: step.finished_at,
        })
        .eq('id', step.id),
    );
    return step;
  },

  async getPlanAndSteps(sessionId: string): Promise<{ plan: Plan | null; steps: PlanStep[] }> {
    const plan = db.plans.get(sessionId) ?? null;
    if (!plan) return { plan: null, steps: [] };
    return { plan, steps: db.planSteps.get(plan.id) ?? [] };
  },

  async logToolCallStart(
    sessionId: string,
    tool: string,
    args: Record<string, unknown>,
    planStepId: string | null = null,
  ): Promise<ToolCallLog> {
    const entry: ToolCallLog = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      plan_step_id: planStepId,
      tool,
      args,
      result: null,
      status: 'running',
      latency_ms: null,
      error: null,
      created_at: new Date().toISOString(),
    };
    const list = db.toolCalls.get(sessionId) ?? [];
    list.push(entry);
    db.toolCalls.set(sessionId, list);
    emit(sessionId, { type: REALTIME_EVENTS.TOOL_CALL_UPDATED, data: entry });
    await safeSupabaseRun((sb) => sb.from('tool_calls').insert(entry));
    return entry;
  },

  async logToolCallFinish(
    sessionId: string,
    toolCallId: string,
    status: 'ok' | 'error',
    latencyMs: number,
    result: Record<string, unknown> | null,
    error: string | null = null,
  ): Promise<ToolCallLog | null> {
    const list = db.toolCalls.get(sessionId) ?? [];
    const entry = list.find((t) => t.id === toolCallId);
    if (!entry) return null;
    entry.status = status;
    entry.latency_ms = latencyMs;
    entry.result = result;
    entry.error = error;
    emit(sessionId, { type: REALTIME_EVENTS.TOOL_CALL_UPDATED, data: entry });
    await safeSupabaseRun((sb) =>
      sb
        .from('tool_calls')
        .update({ status, latency_ms: latencyMs, result, error })
        .eq('id', toolCallId),
    );
    return entry;
  },

  async getAllToolCallsForUser(userId: string): Promise<ToolCallLog[]> {
    const userSessionIds = new Set(
      Array.from(db.sessions.values())
        .filter((s) => s.user_id === userId)
        .map((s) => s.id),
    );
    const logs: ToolCallLog[] = [];
    for (const [sid, entries] of db.toolCalls.entries()) {
      if (userSessionIds.has(sid)) {
        logs.push(...entries);
      }
    }
    return logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createApproval(input: {
    session_id: string;
    trip_id: string | null;
    summary: string;
    payload: ApprovalRequest['payload'];
    total_cost: number;
  }): Promise<ApprovalRequest> {
    for (const existing of db.approvals.values()) {
      if (existing.session_id === input.session_id && existing.status === 'pending') {
        existing.status = 'expired';
        emit(input.session_id, {
          type: REALTIME_EVENTS.APPROVAL_UPDATED,
          data: existing,
        });
      }
    }

    const session = db.sessions.get(input.session_id);
    const prefs = session ? db.preferences.get(session.user_id) : undefined;
    const ttlMinutes = prefs?.approval_ttl_minutes ?? 5;

    const approval: ApprovalRequest = {
      id: crypto.randomUUID(),
      session_id: input.session_id,
      trip_id: input.trip_id,
      summary: input.summary,
      payload: input.payload,
      total_cost: input.total_cost,
      status: 'pending',
      resolved_via: null,
      expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
      resolved_at: null,
      created_at: new Date().toISOString(),
    };
    db.approvals.set(approval.id, approval);
    emit(input.session_id, {
      type: REALTIME_EVENTS.APPROVAL_UPDATED,
      data: approval,
    });
    await safeSupabaseRun((sb) => sb.from('approvals').insert(approval));
    return approval;
  },

  async getApproval(approvalId: string): Promise<ApprovalRequest | null> {
    const app = db.approvals.get(approvalId);
    if (!app) return null;
    if (app.status === 'pending' && Date.parse(app.expires_at) < Date.now()) {
      app.status = 'expired';
      db.approvals.set(app.id, app);
    }
    return app;
  },

  async getPendingApprovalForSession(sessionId: string): Promise<ApprovalRequest | null> {
    const list = Array.from(db.approvals.values())
      .filter((a) => a.session_id === sessionId && a.status === 'pending')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const app of list) {
      if (Date.parse(app.expires_at) < Date.now()) {
        app.status = 'expired';
        db.approvals.set(app.id, app);
        continue;
      }
      return app;
    }
    return null;
  },

  async getApprovalsForSession(sessionId: string): Promise<ApprovalRequest[]> {
    return Array.from(db.approvals.values())
      .filter((a) => a.session_id === sessionId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getAllApprovalsForUser(userId: string): Promise<ApprovalRequest[]> {
    const userSessionIds = new Set(
      Array.from(db.sessions.values())
        .filter((s) => s.user_id === userId)
        .map((s) => s.id),
    );
    return Array.from(db.approvals.values())
      .filter((a) => userSessionIds.has(a.session_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async setApprovalStatus(
    approvalId: string,
    status: ApprovalStatus,
    resolvedVia: 'ui' | 'voice' | null = null,
  ): Promise<ApprovalRequest | null> {
    const app = db.approvals.get(approvalId);
    if (!app) return null;
    app.status = status;
    if (resolvedVia) app.resolved_via = resolvedVia;
    if (status === 'approved' || status === 'rejected') {
      app.resolved_at = new Date().toISOString();
    }
    db.approvals.set(approvalId, app);
    emit(app.session_id, {
      type: REALTIME_EVENTS.APPROVAL_UPDATED,
      data: app,
    });
    await safeSupabaseRun((sb) =>
      sb
        .from('approvals')
        .update({
          status: app.status,
          resolved_via: app.resolved_via,
          resolved_at: app.resolved_at,
        })
        .eq('id', approvalId),
    );
    return app;
  },

  async createOrUpdateTrip(
    userId: string,
    sessionId: string | null,
    data: Omit<Trip, 'id' | 'user_id' | 'created_at'> & { id?: string },
  ): Promise<Trip> {
    const existing = data.id ? db.trips.get(data.id) : undefined;
    const trip: Trip = existing
      ? { ...existing, ...data }
      : {
          id: data.id || crypto.randomUUID(),
          user_id: userId,
          title: data.title,
          destination: data.destination,
          origin: data.origin,
          start_date: data.start_date,
          end_date: data.end_date,
          budget: data.budget,
          total_cost: data.total_cost,
          status: data.status,
          created_at: new Date().toISOString(),
        };
    db.trips.set(trip.id, trip);
    if (sessionId) {
      const extras = db.sessionExtras.get(sessionId);
      if (extras) {
        extras.tripId = trip.id;
      }
      const plan = db.plans.get(sessionId);
      if (plan) {
        plan.trip_id = trip.id;
        emit(sessionId, { type: REALTIME_EVENTS.PLAN_UPDATED, data: plan });
      }
    }
    await safeSupabaseRun((sb) => sb.from('trips').upsert(trip));
    return trip;
  },

  async getTrip(tripId: string): Promise<Trip | null> {
    return db.trips.get(tripId) ?? null;
  },

  async listTripsForUser(userId: string): Promise<Trip[]> {
    await this.hydrateUserFromSupabase(userId);
    return Array.from(db.trips.values())
      .filter((t) => t.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async addBooking(
    sessionId: string | null,
    input: Omit<BookingRecord, 'id' | 'created_at'>,
  ): Promise<BookingRecord> {
    const list = db.bookings.get(input.trip_id) ?? [];
    const existing = list.find((b) => b.idempotency_key === input.idempotency_key);
    if (existing) return existing;

    const record: BookingRecord = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    list.push(record);
    db.bookings.set(input.trip_id, list);
    if (sessionId) {
      emit(sessionId, { type: REALTIME_EVENTS.BOOKING_CREATED, data: record });
    }
    await safeSupabaseRun((sb) => sb.from('bookings').insert(record));

    // Automatically log into Expense Tracker USP whenever a booking is confirmed
    const trip = db.trips.get(input.trip_id);
    if (trip) {
      const existingExpenses = db.expenses.get(trip.user_id) ?? [];
      if (!existingExpenses.some((e) => e.booking_id === record.id)) {
        const merchant =
          input.type === 'flight'
            ? String(input.details.airline || input.provider)
            : String(input.details.name || input.provider);
        const description =
          input.type === 'flight'
            ? `${String(input.details.flight_number || '')} · ${String(input.details.origin || '')} → ${String(input.details.destination || '')}`
            : `${String(input.details.name || 'Resort Stay')} (${String(input.details.nights || 2)} nights)`;

        await this.addExpense(sessionId, {
          user_id: trip.user_id,
          trip_id: trip.id,
          combined_trip_id: null,
          booking_id: record.id,
          category: input.type as ExpenseCategory,
          merchant,
          description: description.trim(),
          amount: record.price,
          currency: 'INR',
          payment_method: 'Amex Corp •• 4102',
          reimbursable: true,
          status: 'authorized',
          spent_at: record.created_at,
        });
      }
    }

    return record;
  },

  async updateBooking(
    tripId: string,
    bookingId: string,
    patch: Partial<BookingRecord>,
  ): Promise<BookingRecord | null> {
    const list = db.bookings.get(tripId) ?? [];
    const item = list.find((b) => b.id === bookingId);
    if (!item) return null;
    Object.assign(item, patch);
    await safeSupabaseRun((sb) => sb.from('bookings').update(patch).eq('id', bookingId));
    return item;
  },

  async addItineraryItem(
    sessionId: string | null,
    input: Omit<ItineraryItem, 'id'>,
  ): Promise<ItineraryItem> {
    const item: ItineraryItem = {
      ...input,
      id: crypto.randomUUID(),
    };
    const list = db.itinerary.get(input.trip_id) ?? [];
    list.push(item);
    db.itinerary.set(input.trip_id, list);
    if (sessionId) {
      emit(sessionId, { type: REALTIME_EVENTS.ITINERARY_UPDATED, data: item });
    }
    await safeSupabaseRun((sb) => sb.from('itinerary_items').insert(item));
    return item;
  },

  async addReminder(input: Omit<ReminderItem, 'id'>): Promise<ReminderItem> {
    const item: ReminderItem = {
      ...input,
      id: crypto.randomUUID(),
    };
    const list = db.reminders.get(input.trip_id) ?? [];
    list.push(item);
    db.reminders.set(input.trip_id, list);
    await safeSupabaseRun((sb) => sb.from('reminders').insert(item));
    return item;
  },

  async toggleReminder(tripId: string, reminderId: string, done: boolean): Promise<ReminderItem | null> {
    const list = db.reminders.get(tripId) ?? [];
    const item = list.find((r) => r.id === reminderId);
    if (!item) return null;
    item.sent_at = done ? new Date().toISOString() : null;
    await safeSupabaseRun((sb) =>
      sb.from('reminders').update({ sent_at: item.sent_at }).eq('id', reminderId),
    );
    return item;
  },

  async getDueReminders(nowIso: string): Promise<ReminderItem[]> {
    const nowMs = Date.parse(nowIso);
    const due: ReminderItem[] = [];
    for (const list of db.reminders.values()) {
      for (const r of list) {
        if (!r.sent_at && Date.parse(r.remind_at) <= nowMs) {
          due.push(r);
        }
      }
    }
    return due;
  },

  async markReminderSent(tripId: string, reminderId: string): Promise<void> {
    const list = db.reminders.get(tripId) ?? [];
    const r = list.find((x) => x.id === reminderId);
    if (r) {
      r.sent_at = new Date().toISOString();
      await safeSupabaseRun((sb) =>
        sb.from('reminders').update({ sent_at: r.sent_at }).eq('id', reminderId),
      );
    }
  },

  async addDisruption(
    sessionId: string | null,
    input: Omit<DisruptionItem, 'id' | 'detected_at'>,
  ): Promise<DisruptionItem> {
    const item: DisruptionItem = {
      ...input,
      id: crypto.randomUUID(),
      detected_at: new Date().toISOString(),
    };
    const list = db.disruptions.get(input.trip_id) ?? [];
    list.push(item);
    db.disruptions.set(input.trip_id, list);
    if (sessionId) {
      emit(sessionId, { type: REALTIME_EVENTS.DISRUPTION_UPDATED, data: item });
    }
    await safeSupabaseRun((sb) => sb.from('disruptions').insert(item));
    return item;
  },

  async resolveDisruption(
    tripId: string,
    disruptionId: string,
    resolutionNote: string,
  ): Promise<DisruptionItem | null> {
    const list = db.disruptions.get(tripId) ?? [];
    const d = list.find((x) => x.id === disruptionId);
    if (!d) return null;
    d.status = 'resolved';
    d.detail = { ...d.detail, resolution_note: resolutionNote };
    await safeSupabaseRun((sb) =>
      sb.from('disruptions').update({ status: 'resolved', detail: d.detail }).eq('id', disruptionId),
    );
    for (const [sid, ext] of db.sessionExtras.entries()) {
      if (ext.tripId === tripId) {
        emit(sid, { type: REALTIME_EVENTS.DISRUPTION_UPDATED, data: d });
      }
    }
    return d;
  },

  async listDisruptionsForUser(userId: string): Promise<DisruptionItem[]> {
    const userTrips = new Set((await this.listTripsForUser(userId)).map((t) => t.id));
    const items: DisruptionItem[] = [];
    for (const [tid, list] of db.disruptions.entries()) {
      if (userTrips.has(tid)) items.push(...list);
    }
    return items.sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  },

  async addNotification(
    sessionId: string | null,
    input: Omit<NotificationItem, 'id' | 'created_at'>,
  ): Promise<NotificationItem> {
    const item: NotificationItem = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    const list = db.notifications.get(input.user_id) ?? [];
    list.unshift(item);
    db.notifications.set(input.user_id, list);
    if (sessionId) {
      emit(sessionId, {
        type: REALTIME_EVENTS.NOTIFICATION_CREATED,
        data: item,
      });
    }
    await safeSupabaseRun((sb) => sb.from('notifications').insert(item));
    return item;
  },

  async listNotificationsForUser(userId: string): Promise<NotificationItem[]> {
    return db.notifications.get(userId) ?? [];
  },

  // --- EXPENSE TRACKER USP ---
  async listExpensesForUser(userId: string): Promise<ExpenseRecord[]> {
    await this.hydrateUserFromSupabase(userId);
    const list = db.expenses.get(userId) ?? [];
    return [...list].sort((a, b) => b.spent_at.localeCompare(a.spent_at));
  },

  async addExpense(
    sessionId: string | null,
    input: Omit<ExpenseRecord, 'id' | 'created_at'>,
  ): Promise<ExpenseRecord> {
    const record: ExpenseRecord = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    const list = db.expenses.get(input.user_id) ?? [];
    list.unshift(record);
    db.expenses.set(input.user_id, list);
    if (sessionId) {
      emit(sessionId, { type: REALTIME_EVENTS.EXPENSE_UPDATED, data: record });
    }
    await safeSupabaseRun((sb) => sb.from('expenses').insert(record));
    return record;
  },

  async updateExpense(
    userId: string,
    expenseId: string,
    patch: Partial<ExpenseRecord>,
  ): Promise<ExpenseRecord | null> {
    const list = db.expenses.get(userId) ?? [];
    const target = list.find((e) => e.id === expenseId);
    if (!target) return null;
    Object.assign(target, patch);
    await safeSupabaseRun((sb) => sb.from('expenses').update(patch).eq('id', expenseId));
    return target;
  },

  async deleteExpense(userId: string, expenseId: string): Promise<boolean> {
    const list = db.expenses.get(userId) ?? [];
    const next = list.filter((e) => e.id !== expenseId);
    if (next.length === list.length) return false;
    db.expenses.set(userId, next);
    await safeSupabaseRun((sb) => sb.from('expenses').delete().eq('id', expenseId));
    return true;
  },

  // --- MULTI-TRIP COMBINED PLANS ---
  async listCombinedTripsForUser(userId: string): Promise<CombinedTripPlan[]> {
    await this.hydrateUserFromSupabase(userId);
    const list = db.combinedTrips.get(userId) ?? [];
    return list
      .map((plan) => hydrateCombinedLegs(userId, plan))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createCombinedTrip(
    userId: string,
    input: {
      title: string;
      description: string;
      tripIds: string[];
      totalBudget?: number;
      defaultTransferNote?: string;
    },
    sessionId: string | null = null,
  ): Promise<CombinedTripPlan> {
    const id = crypto.randomUUID();
    const trips = input.tripIds
      .map((tid) => db.trips.get(tid))
      .filter((t): t is Trip => Boolean(t));

    const legs: CombinedTripLeg[] = trips.map((t, index) => ({
      id: crypto.randomUUID(),
      combined_trip_id: id,
      trip_id: t.id,
      ordinal: index + 1,
      transfer_note:
        index === 0
          ? `Circuit Origin · ${t.origin} → ${t.destination}`
          : input.defaultTransferNote || `Inter-leg connecting flight to ${t.destination}`,
      trip: t,
    }));

    const totalCost = trips.reduce((sum, t) => sum + (t.total_cost || t.budget), 0);
    const totalBudget =
      input.totalBudget && input.totalBudget > 0
        ? input.totalBudget
        : Math.max(totalCost + 15000, trips.reduce((sum, t) => sum + t.budget, 0));

    const plan: CombinedTripPlan = {
      id,
      user_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      total_budget: totalBudget,
      total_cost: totalCost,
      status: 'active',
      legs,
      created_at: new Date().toISOString(),
    };

    const list = db.combinedTrips.get(userId) ?? [];
    list.unshift(plan);
    db.combinedTrips.set(userId, list);

    if (sessionId) {
      emit(sessionId, { type: REALTIME_EVENTS.COMBINED_TRIP_UPDATED, data: plan });
    }

    await safeSupabaseRun(async (sb) => {
      await sb.from('combined_trips').insert({
        id: plan.id,
        user_id: plan.user_id,
        title: plan.title,
        description: plan.description,
        total_budget: plan.total_budget,
        total_cost: plan.total_cost,
        status: plan.status,
        created_at: plan.created_at,
      });
      if (legs.length > 0) {
        await sb.from('combined_trip_legs').insert(
          legs.map((l) => ({
            id: l.id,
            combined_trip_id: l.combined_trip_id,
            trip_id: l.trip_id,
            ordinal: l.ordinal,
            transfer_note: l.transfer_note,
          })),
        );
      }
    });

    return plan;
  },

  async addLegToCombinedTrip(
    userId: string,
    combinedTripId: string,
    tripId: string,
    transferNote: string,
  ): Promise<CombinedTripPlan | null> {
    const list = db.combinedTrips.get(userId) ?? [];
    const plan = list.find((c) => c.id === combinedTripId);
    const trip = db.trips.get(tripId);
    if (!plan || !trip) return null;

    const leg: CombinedTripLeg = {
      id: crypto.randomUUID(),
      combined_trip_id: combinedTripId,
      trip_id: tripId,
      ordinal: plan.legs.length + 1,
      transfer_note: transferNote || `Connecting transfer to ${trip.destination}`,
      trip,
    };
    plan.legs.push(leg);
    const updated = hydrateCombinedLegs(userId, plan);
    const idx = list.findIndex((c) => c.id === combinedTripId);
    list[idx] = updated;

    await safeSupabaseRun(async (sb) => {
      await sb.from('combined_trip_legs').insert({
        id: leg.id,
        combined_trip_id: leg.combined_trip_id,
        trip_id: leg.trip_id,
        ordinal: leg.ordinal,
        transfer_note: leg.transfer_note,
      });
      await sb
        .from('combined_trips')
        .update({ total_cost: updated.total_cost })
        .eq('id', combinedTripId);
    });

    return updated;
  },

  async deleteCombinedTrip(userId: string, combinedTripId: string): Promise<boolean> {
    const list = db.combinedTrips.get(userId) ?? [];
    const next = list.filter((c) => c.id !== combinedTripId);
    if (next.length === list.length) return false;
    db.combinedTrips.set(userId, next);
    await safeSupabaseRun((sb) => sb.from('combined_trips').delete().eq('id', combinedTripId));
    return true;
  },

  setSessionResearchArtifacts(
    sessionId: string,
    patch: Partial<{
      flightOptions: FlightOffer[];
      hotelOptions: HotelOffer[];
      weather: WeatherForecast | null;
      calendarBlocks: CalendarBusyBlock[];
      chaosMode: ChaosMode;
    }>,
  ) {
    const extras = db.sessionExtras.get(sessionId);
    if (!extras) return;
    Object.assign(extras, patch);
  },

  getSessionExtras(sessionId: string) {
    return (
      db.sessionExtras.get(sessionId) ?? {
        flightOptions: [],
        hotelOptions: [],
        weather: null,
        calendarBlocks: [],
        tripId: null,
        chaosMode: env.defaultChaosMode,
      }
    );
  },

  async getTripBundle(tripId: string): Promise<TripDetailBundle | null> {
    const trip = db.trips.get(tripId);
    if (!trip) return null;
    const allExpenses = await this.listExpensesForUser(trip.user_id);
    return {
      trip,
      bookings: db.bookings.get(tripId) ?? [],
      itinerary: db.itinerary.get(tripId) ?? [],
      reminders: db.reminders.get(tripId) ?? [],
      disruptions: db.disruptions.get(tripId) ?? [],
      expenses: allExpenses.filter((e) => e.trip_id === tripId),
    };
  },

  async getSessionSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    const session = db.sessions.get(sessionId);
    if (!session) return null;
    const extras = this.getSessionExtras(sessionId);
    const { plan, steps } = await this.getPlanAndSteps(sessionId);
    const trip = extras.tripId ? (db.trips.get(extras.tripId) ?? null) : null;
    const [expenses, combinedTrips] = await Promise.all([
      this.listExpensesForUser(session.user_id),
      this.listCombinedTripsForUser(session.user_id),
    ]);
    return {
      session,
      messages: db.messages.get(sessionId) ?? [],
      plan,
      planSteps: steps,
      toolCalls: db.toolCalls.get(sessionId) ?? [],
      approvals: await this.getApprovalsForSession(sessionId),
      bookings: trip ? (db.bookings.get(trip.id) ?? []) : [],
      itinerary: trip ? (db.itinerary.get(trip.id) ?? []) : [],
      flightOptions: extras.flightOptions,
      hotelOptions: extras.hotelOptions,
      weather: extras.weather,
      calendarBlocks: extras.calendarBlocks,
      disruptions: trip ? (db.disruptions.get(trip.id) ?? []) : [],
      notifications: db.notifications.get(session.user_id) ?? [],
      expenses,
      combinedTrips,
      trip,
      chaosMode: extras.chaosMode,
    };
  },
};
