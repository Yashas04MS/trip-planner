export type AgentRole =
  | 'concierge'
  | 'planner'
  | 'researcher'
  | 'booker'
  | 'scheduler'
  | 'followup';

export type PlanStepStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'adapting'
  | 'awaiting_approval'
  | 'skipped';

export type ToolCallStatus = 'running' | 'ok' | 'error';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'consumed';

export type TripStatus =
  | 'planning'
  | 'booked'
  | 'changed'
  | 'completed'
  | 'cancelled';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type ChaosMode =
  | 'off'
  | 'hotel_sold_out'
  | 'flight_api_error'
  | 'calendar_error';

export type VoicePersona = 'aria' | 'jasper' | 'maya' | 'leo';

export type ExpenseCategory =
  | 'flight'
  | 'hotel'
  | 'transport'
  | 'dining'
  | 'experience'
  | 'other';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  home_city: string;
  home_airport: string;
  created_at: string;
}

export interface TravelPreferences {
  user_id: string;
  default_budget: number;
  currency: string;
  cabin: 'economy' | 'premium_economy' | 'business';
  hotel_stars: number;
  interests: string[];
  avoid: string[];
  voice_persona?: VoicePersona;
  voice_cadence?: number;
  read_prices_aloud?: boolean;
  approval_ttl_minutes?: number;
}

export interface ExpenseRecord {
  id: string;
  user_id: string;
  trip_id: string | null;
  combined_trip_id?: string | null;
  booking_id?: string | null;
  category: ExpenseCategory;
  merchant: string;
  description: string;
  amount: number;
  currency: string;
  payment_method: string;
  reimbursable: boolean;
  status: 'logged' | 'authorized' | 'reimbursed';
  spent_at: string;
  created_at: string;
}

export interface CombinedTripLeg {
  id: string;
  combined_trip_id: string;
  trip_id: string;
  ordinal: number;
  transfer_note: string;
  trip?: Trip;
}

export interface CombinedTripPlan {
  id: string;
  user_id: string;
  title: string;
  description: string;
  total_budget: number;
  total_cost: number;
  status: 'draft' | 'active' | 'completed';
  legs: CombinedTripLeg[];
  created_at: string;
}

export interface VoiceSession {
  id: string;
  user_id: string;
  channel: string;
  agent_id: string | null;
  status: 'active' | 'ended' | 'failed';
  started_at: string;
  ended_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Plan {
  id: string;
  session_id: string;
  trip_id: string | null;
  goal: string;
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed';
  created_at: string;
}

export interface PlanStep {
  id: string;
  plan_id: string;
  ordinal: number;
  key: string;
  title: string;
  agent: AgentRole;
  depends_on: string[];
  status: PlanStepStatus;
  result_summary: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface ToolCallLog {
  id: string;
  session_id: string;
  plan_step_id: string | null;
  tool: string;
  args: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: ToolCallStatus;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface FlightOffer {
  id: string;
  airline: string;
  airline_code: string;
  flight_number: string;
  origin: string;
  destination: string;
  depart_at: string;
  arrive_at: string;
  return_flight_number?: string;
  return_depart_at?: string;
  return_arrive_at?: string;
  duration_minutes: number;
  stops: number;
  cabin: string;
  price_inr: number;
  fare_class: string;
  seat_class: string;
  conflict_note?: string;
  recommended?: boolean;
  reason?: string;
}

export interface HotelOffer {
  id: string;
  name: string;
  area: string;
  city: string;
  stars: number;
  nights: number;
  price_per_night_inr: number;
  total_price_inr: number;
  rating: number;
  amenities: string[];
  availability: 'available' | 'sold_out';
  image_url?: string;
  recommended?: boolean;
  reason?: string;
}

export interface WeatherForecast {
  city: string;
  summary: string;
  source: 'open-meteo' | 'fallback';
  days: Array<{
    date: string;
    temp_min_c: number;
    temp_max_c: number;
    condition: string;
    precip_prob: number;
  }>;
}

export interface CalendarBusyBlock {
  start: string;
  end: string;
  summary: string;
}

export interface ProposedBookingPayload {
  trip_title: string;
  destination: string;
  origin: string;
  start_date: string;
  end_date: string;
  budget: number;
  outbound_flight: FlightOffer;
  hotel: HotelOffer;
  weather?: WeatherForecast;
  adaptations: string[];
  side_effects: string[];
}

export interface ApprovalRequest {
  id: string;
  session_id: string;
  trip_id: string | null;
  summary: string;
  payload: ProposedBookingPayload;
  total_cost: number;
  status: ApprovalStatus;
  resolved_via: 'ui' | 'voice' | null;
  expires_at: string;
  resolved_at: string | null;
  created_at: string;
}

export interface BookingRecord {
  id: string;
  trip_id: string;
  approval_id: string | null;
  type: 'flight' | 'hotel';
  provider: string;
  provider_ref: string;
  details: Record<string, unknown>;
  price: number;
  status: 'confirmed' | 'changed' | 'cancelled';
  idempotency_key: string;
  created_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  booking_id: string | null;
  kind: 'flight' | 'hotel' | 'activity' | 'calendar_hold';
  title: string;
  location: string;
  starts_at: string;
  ends_at: string;
  calendar_event_id: string | null;
  status: 'scheduled' | 'changed' | 'cancelled';
}

export interface ReminderItem {
  id: string;
  trip_id: string;
  user_id: string;
  remind_at: string;
  message: string;
  sent_at: string | null;
}

export interface DisruptionItem {
  id: string;
  trip_id: string;
  booking_id: string | null;
  type: string;
  detail: {
    flight_number?: string;
    original_depart?: string;
    new_depart?: string;
    delay_minutes?: number;
    reason?: string;
    alternatives?: FlightOffer[];
    resolution_note?: string;
  };
  status: 'open' | 'resolved';
  detected_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  trip_id: string | null;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  origin: string;
  start_date: string;
  end_date: string;
  budget: number;
  total_cost: number;
  status: TripStatus;
  created_at: string;
}

export interface TripDetailBundle {
  trip: Trip;
  bookings: BookingRecord[];
  itinerary: ItineraryItem[];
  reminders: ReminderItem[];
  disruptions: DisruptionItem[];
  expenses?: ExpenseRecord[];
}

export interface SessionSnapshot {
  session: VoiceSession;
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
}
