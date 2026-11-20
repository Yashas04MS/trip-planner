import type { Plan, PlanStep } from '../../shared/types';
import { store } from '../lib/store';

export interface ParsedTravelGoal {
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  budget: number;
  preferCheaperHotel: boolean;
  standupConflictTime: string | null;
}

export function parseTravelGoal(
  text: string,
  defaults: { origin: string; budget: number },
): ParsedTravelGoal {
  const lower = text.toLowerCase();

  let destination = 'Goa';
  if (lower.includes('udaipur')) destination = 'Udaipur';
  else if (lower.includes('jaipur')) destination = 'Jaipur';
  else if (lower.includes('mumbai')) destination = 'Mumbai';
  else if (lower.includes('delhi')) destination = 'Delhi';
  else if (lower.includes('goa')) destination = 'Goa';

  let budget = defaults.budget || 40000;
  const numMatch = lower.match(/(?:under|below|max|budget)\s*(?:rs\.?|inr|₹)?\s*(\d{2,6})/);
  if (numMatch) {
    budget = Number(numMatch[1]);
  } else if (lower.includes('forty thousand') || lower.includes('40k') || lower.includes('40,000')) {
    budget = 40000;
  } else if (lower.includes('thirty thousand') || lower.includes('30k') || lower.includes('30,000')) {
    budget = 30000;
  } else if (lower.includes('fifty thousand') || lower.includes('50k') || lower.includes('50,000')) {
    budget = 50000;
  }

  const preferCheaperHotel =
    lower.includes('cheaper') || lower.includes('less expensive') || lower.includes('lower cost');

  const hasStandup =
    lower.includes('standup') || lower.includes('meeting') || lower.includes('4') || lower.includes('four');

  return {
    destination,
    origin: defaults.origin || 'BLR',
    startDate: '2026-11-27',
    endDate: '2026-11-29',
    budget,
    preferCheaperHotel,
    standupConflictTime: hasStandup ? '16:00' : null,
  };
}

export const DEMO_DAG_TEMPLATE: Array<{
  ordinal: number;
  key: string;
  title: string;
  agent: PlanStep['agent'];
  depends_on: string[];
}> = [
  {
    ordinal: 1,
    key: 'understand_goal',
    title: 'Parse itinerary constraints & budget',
    agent: 'planner',
    depends_on: [],
  },
  {
    ordinal: 2,
    key: 'check_calendar',
    title: 'Check calendar busy blocks',
    agent: 'researcher',
    depends_on: ['understand_goal'],
  },
  {
    ordinal: 3,
    key: 'search_flights',
    title: 'Search non-stop flights',
    agent: 'researcher',
    depends_on: ['understand_goal'],
  },
  {
    ordinal: 4,
    key: 'search_hotels',
    title: 'Search boutique 4-star stays',
    agent: 'researcher',
    depends_on: ['understand_goal'],
  },
  {
    ordinal: 5,
    key: 'get_weather',
    title: 'Fetch destination forecast',
    agent: 'researcher',
    depends_on: ['understand_goal'],
  },
  {
    ordinal: 6,
    key: 'compare_and_recommend',
    title: 'Rank options & resolve conflicts',
    agent: 'researcher',
    depends_on: ['check_calendar', 'search_flights', 'search_hotels', 'get_weather'],
  },
  {
    ordinal: 7,
    key: 'get_approval',
    title: 'Await human authorization',
    agent: 'booker',
    depends_on: ['compare_and_recommend'],
  },
  {
    ordinal: 8,
    key: 'book',
    title: 'Issue flight & hotel bookings',
    agent: 'booker',
    depends_on: ['get_approval'],
  },
  {
    ordinal: 9,
    key: 'create_calendar_events',
    title: 'Sync Google Calendar holds',
    agent: 'scheduler',
    depends_on: ['book'],
  },
  {
    ordinal: 10,
    key: 'send_confirmation',
    title: 'Dispatch confirmation dossier',
    agent: 'followup',
    depends_on: ['book'],
  },
  {
    ordinal: 11,
    key: 'schedule_reminders',
    title: 'Schedule check-in & departure alerts',
    agent: 'followup',
    depends_on: ['book'],
  },
  {
    ordinal: 12,
    key: 'verify_and_summarise',
    title: 'Verify records & brief traveler',
    agent: 'concierge',
    depends_on: ['create_calendar_events', 'send_confirmation', 'schedule_reminders'],
  },
];

export async function createExecutionPlan(
  sessionId: string,
  goalText: string,
  tripId: string | null,
): Promise<{ plan: Plan; steps: PlanStep[] }> {
  const created = await store.createOrReplacePlan(
    sessionId,
    goalText,
    tripId,
    DEMO_DAG_TEMPLATE,
  );
  await store.updatePlanStep(sessionId, 'understand_goal', 'running');
  return created;
}
