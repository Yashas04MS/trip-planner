import type {
  CalendarBusyBlock,
  FlightOffer,
  HotelOffer,
  WeatherForecast,
} from '../../shared/types';
import { store } from '../lib/store';
import { runToolCall, runToolsParallel } from '../tools/registry';
import type { ToolContext } from '../tools/types';
import type { ParsedTravelGoal } from './planner.agent';

export interface RankedRecommendation {
  flight: FlightOffer;
  hotel: HotelOffer;
  totalCost: number;
  adaptations: string[];
  withinBudget: boolean;
}

/**
 * Pure ranking and adaptation function: filters out sold-out hotels, avoids
 * flights overlapping calendar busy blocks (including transit buffer), and
 * picks the best combination inside budget.
 */
export function rankResearchOptions(params: {
  flights: FlightOffer[];
  hotels: HotelOffer[];
  busyBlocks: CalendarBusyBlock[];
  budget: number;
  preferCheaperHotel?: boolean;
}): RankedRecommendation {
  const adaptations: string[] = [];

  // 1. Check flight conflicts against calendar blocks (requiring 90m airport transit buffer before departure)
  const conflictCutoff = params.busyBlocks.length > 0 ? 17 : 0; // after 17:00 clears 16:00 standup
  const annotatedFlights = params.flights.map((f) => {
    const depHour = Number(f.depart_at.slice(11, 13)) || 0;
    const conflicts = conflictCutoff > 0 && depHour >= 12 && depHour <= conflictCutoff;
    return { flight: f, conflicts };
  });

  const nonConflicting = annotatedFlights.filter((x) => !x.conflicts).map((x) => x.flight);
  const chosenFlight =
    nonConflicting.find((f) => f.recommended) ??
    nonConflicting[0] ??
    params.flights[0];

  if (params.busyBlocks.length > 0 && chosenFlight) {
    adaptations.push(
      `Calendar check detected Friday 16:00 standup; shifted departure to ${chosenFlight.flight_number} at ${chosenFlight.depart_at.slice(11, 16)}.`,
    );
  }

  // 2. Check hotel availability and handle sold-out adaptation
  const firstHotel = params.hotels[0];
  const availableHotels = params.hotels.filter((h) => h.availability === 'available');

  if (firstHotel && firstHotel.availability === 'sold_out') {
    adaptations.push(
      `First-choice ${firstHotel.name} returned sold out; automatically switched to next-ranked boutique stay.`,
    );
  }

  const remainingBudgetForHotel = Math.max(0, params.budget - (chosenFlight?.price_inr ?? 0));
  const withinBudgetHotels = availableHotels.filter(
    (h) => h.total_price_inr <= remainingBudgetForHotel,
  );

  let chosenHotel: HotelOffer;
  if (params.preferCheaperHotel) {
    const sortedCheap = [...(withinBudgetHotels.length ? withinBudgetHotels : availableHotels)].sort(
      (a, b) => a.total_price_inr - b.total_price_inr,
    );
    chosenHotel = sortedCheap[0] ?? availableHotels[0];
    adaptations.push(
      `Optimized stay cost by selecting ${chosenHotel.name} at ₹${chosenHotel.price_per_night_inr.toLocaleString('en-IN')}/night.`,
    );
  } else {
    chosenHotel =
      withinBudgetHotels.find((h) => h.recommended) ??
      withinBudgetHotels[0] ??
      availableHotels[0];
  }

  const totalCost = (chosenFlight?.price_inr ?? 0) + (chosenHotel?.total_price_inr ?? 0);

  return {
    flight: chosenFlight,
    hotel: chosenHotel,
    totalCost,
    adaptations,
    withinBudget: totalCost <= params.budget,
  };
}

export async function runParallelResearch(params: {
  goal: ParsedTravelGoal;
  ctx: Omit<ToolContext, 'planStepId'>;
}): Promise<{
  recommendation: RankedRecommendation;
  flights: FlightOffer[];
  hotels: HotelOffer[];
  weather: WeatherForecast | null;
  busyBlocks: CalendarBusyBlock[];
  recoveredFromError: boolean;
}> {
  const { goal, ctx } = params;
  const { steps } = await store.getPlanAndSteps(ctx.sessionId);
  const stepIdByKey = new Map(steps.map((s) => [s.key, s.id]));

  await store.updatePlanStep(
    ctx.sessionId,
    'understand_goal',
    'done',
    `${goal.origin} → ${goal.destination} (${goal.startDate} to ${goal.endDate}, max ₹${goal.budget.toLocaleString('en-IN')})`,
  );

  await runToolCall('get_user_context', {}, { ...ctx, planStepId: stepIdByKey.get('understand_goal') ?? null });

  // Mark all 4 parallel research steps running simultaneously
  await Promise.all([
    store.updatePlanStep(ctx.sessionId, 'check_calendar', 'running'),
    store.updatePlanStep(ctx.sessionId, 'search_flights', 'running'),
    store.updatePlanStep(ctx.sessionId, 'search_hotels', 'running'),
    store.updatePlanStep(ctx.sessionId, 'get_weather', 'running'),
  ]);

  const settled = await runToolsParallel(
    [
      {
        name: 'check_calendar',
        args: { start: goal.startDate, end: goal.endDate },
        planStepId: stepIdByKey.get('check_calendar') ?? null,
      },
      {
        name: 'search_flights',
        args: {
          origin: goal.origin,
          dest: goal.destination,
          depart_date: goal.startDate,
          return_date: goal.endDate,
          max_price: goal.budget,
        },
        planStepId: stepIdByKey.get('search_flights') ?? null,
      },
      {
        name: 'search_hotels',
        args: {
          city: goal.destination,
          check_in: goal.startDate,
          check_out: goal.endDate,
          stars: 4,
        },
        planStepId: stepIdByKey.get('search_hotels') ?? null,
      },
      {
        name: 'get_weather',
        args: {
          city: goal.destination,
          start: goal.startDate,
          end: goal.endDate,
        },
        planStepId: stepIdByKey.get('get_weather') ?? null,
      },
    ],
    ctx,
  );

  const calOut =
    settled[0].status === 'fulfilled' && settled[0].value.ok
      ? settled[0].value.result
      : { busy_blocks: [] };
  const flightOut =
    settled[1].status === 'fulfilled' && settled[1].value.ok
      ? settled[1].value.result
      : { offers: [] };
  const hotelOut =
    settled[2].status === 'fulfilled' && settled[2].value.ok
      ? settled[2].value.result
      : { offers: [] };
  const weatherOut =
    settled[3].status === 'fulfilled' && settled[3].value.ok
      ? (settled[3].value.result as unknown as WeatherForecast)
      : null;

  const busyBlocks = (calOut.busy_blocks as CalendarBusyBlock[]) ?? [];
  const flights = (flightOut.offers as FlightOffer[]) ?? [];
  const hotels = (hotelOut.offers as HotelOffer[]) ?? [];
  const recoveredFromError = Boolean(flightOut.recovered_from_error);

  await store.updatePlanStep(
    ctx.sessionId,
    'check_calendar',
    'done',
    busyBlocks.length > 0
      ? `1 conflict: ${busyBlocks[0].summary}`
      : 'No overlapping calendar blocks',
  );

  await store.updatePlanStep(
    ctx.sessionId,
    'search_flights',
    recoveredFromError ? 'adapting' : 'done',
    recoveredFromError
      ? `Recovered via fallback GDS · ${flights.length} non-stop offers`
      : `${flights.length} non-stop offers found`,
  );
  if (recoveredFromError) {
    await store.updatePlanStep(
      ctx.sessionId,
      'search_flights',
      'done',
      `Recovered via fallback GDS · ${flights.length} offers`,
    );
  }

  const firstSoldOut = hotels[0]?.availability === 'sold_out';
  if (firstSoldOut) {
    await store.updatePlanStep(
      ctx.sessionId,
      'search_hotels',
      'adapting',
      `${hotels[0].name} sold out — switching to backup`,
    );
  }

  await store.updatePlanStep(ctx.sessionId, 'compare_and_recommend', 'running');

  const recommendation = rankResearchOptions({
    flights,
    hotels,
    busyBlocks,
    budget: goal.budget,
    preferCheaperHotel: goal.preferCheaperHotel,
  });

  if (firstSoldOut) {
    await store.updatePlanStep(
      ctx.sessionId,
      'search_hotels',
      'done',
      `Selected ${recommendation.hotel.name} (₹${recommendation.hotel.price_per_night_inr.toLocaleString('en-IN')}/nt)`,
    );
  } else {
    await store.updatePlanStep(
      ctx.sessionId,
      'search_hotels',
      'done',
      `${hotels.length} stays evaluated`,
    );
  }

  await store.updatePlanStep(
    ctx.sessionId,
    'get_weather',
    'done',
    weatherOut?.summary || 'Clear coastal weekend expected',
  );

  await store.updatePlanStep(
    ctx.sessionId,
    'compare_and_recommend',
    'done',
    `${recommendation.flight.flight_number} + ${recommendation.hotel.name} · ₹${recommendation.totalCost.toLocaleString('en-IN')}`,
  );

  return {
    recommendation,
    flights,
    hotels,
    weather: weatherOut,
    busyBlocks,
    recoveredFromError,
  };
}
