import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyApprovalUtterance,
  consumeApprovedGate,
  evaluateVoiceApproval,
} from './approval-gate';
import { parseExpenseIntent } from './orchestrator';
import { parseTravelGoal } from './planner.agent';
import { rankResearchOptions } from './research.agent';
import { buildMockFlights, buildMockHotels } from '../providers/mock-travel';
import { DEMO_USER_ID, store } from '../lib/store';

test('classifyApprovalUtterance handles affirmative, negative, and neutral speech', () => {
  assert.equal(classifyApprovalUtterance('Yes, book it'), 'approve');
  assert.equal(classifyApprovalUtterance('Go ahead and confirm'), 'approve');
  assert.equal(classifyApprovalUtterance('No, cancel that'), 'reject');
  assert.equal(classifyApprovalUtterance('Yes, actually make it a cheaper hotel'), 'reject');
  assert.equal(classifyApprovalUtterance('What is the weather in Goa?'), 'none');
});

test('parseTravelGoal extracts Goa weekend, 40000 INR budget, and Friday 4pm standup', () => {
  const goal = parseTravelGoal(
    'Plan me a weekend in Goa next week, under forty thousand rupees. I have a standup on Friday at four.',
    { origin: 'BLR', budget: 50000 },
  );
  assert.equal(goal.destination, 'Goa');
  assert.equal(goal.origin, 'BLR');
  assert.equal(goal.budget, 40000);
  assert.equal(goal.standupConflictTime, '16:00');
  assert.equal(goal.preferCheaperHotel, false);
});

test('rankResearchOptions skips sold-out first choice and resolves Friday standup flight conflict', () => {
  const flights = buildMockFlights({
    origin: 'BLR',
    destination: 'GOI',
    depart_date: '2026-11-27',
    return_date: '2026-11-29',
  });
  const hotels = buildMockHotels({
    city: 'Goa',
    check_in: '2026-11-27',
    check_out: '2026-11-29',
  });

  const ranked = rankResearchOptions({
    flights,
    hotels,
    busyBlocks: [
      {
        start: '2026-11-27T16:00:00+05:30',
        end: '2026-11-27T16:45:00+05:30',
        summary: 'Team Standup (Friday 4:00 PM)',
      },
    ],
    budget: 40000,
  });

  assert.equal(ranked.flight.flight_number, 'AI 519');
  assert.equal(ranked.hotel.availability, 'available');
  assert.equal(ranked.hotel.id, 'ht-ahilya-assagao');
  assert.equal(ranked.withinBudget, true);
  assert.ok(ranked.totalCost <= 40000);
  assert.ok(ranked.adaptations.some((a) => a.toLowerCase().includes('sold out')));
  assert.ok(ranked.adaptations.some((a) => a.toLowerCase().includes('standup')));

  const cheaper = rankResearchOptions({
    flights,
    hotels,
    busyBlocks: [],
    budget: 40000,
    preferCheaperHotel: true,
  });
  assert.equal(cheaper.hotel.id, 'ht-palolem-olive');
});

test('voice approval gate ignores approval phrase when no approval is pending and enforces single-use consumption', async () => {
  const session = await store.createVoiceSession(DEMO_USER_ID, 'test-channel');

  const idleCheck = await evaluateVoiceApproval({
    sessionId: session.id,
    latestUserUtterance: 'yes, book it',
  });
  assert.equal(idleCheck.intent, 'none');
  assert.equal(idleCheck.approval, null);

  const flights = buildMockFlights({
    origin: 'BLR',
    destination: 'GOI',
    depart_date: '2026-11-27',
    return_date: '2026-11-29',
  });
  const hotels = buildMockHotels({
    city: 'Goa',
    check_in: '2026-11-27',
    check_out: '2026-11-29',
  });

  const pending = await store.createApproval({
    session_id: session.id,
    trip_id: null,
    summary: 'Test approval',
    total_cost: 36600,
    payload: {
      trip_title: 'Goa Weekend Escape',
      destination: 'Goa',
      origin: 'BLR',
      start_date: '2026-11-27',
      end_date: '2026-11-29',
      budget: 40000,
      outbound_flight: flights[1],
      hotel: hotels[1],
      adaptations: [],
      side_effects: [],
    },
  });

  const voiceApproved = await evaluateVoiceApproval({
    sessionId: session.id,
    latestUserUtterance: 'yes, book it',
  });
  assert.equal(voiceApproved.intent, 'approve');
  assert.equal(voiceApproved.approval?.status, 'approved');
  assert.equal(voiceApproved.approval?.resolved_via, 'voice');

  const consumed = await consumeApprovedGate(pending.id);
  assert.equal(consumed.status, 'consumed');

  await assert.rejects(() => consumeApprovedGate(pending.id));
});

test('parseExpenseIntent parses spend commands cleanly while ignoring trip planning queries', () => {
  const cab = parseExpenseIntent('Log a cab expense of ₹1,850 at Uber Premier');
  assert.ok(cab);
  assert.equal(cab.amount, 1850);
  assert.equal(cab.category, 'transport');

  const dining = parseExpenseIntent('Spent 4200 on dinner at Cavatina Cuchina');
  assert.ok(dining);
  assert.equal(dining.amount, 4200);
  assert.equal(dining.category, 'dining');

  const tripPrompt = parseExpenseIntent('Plan me a weekend in Goa under ₹40,000');
  assert.equal(tripPrompt, null);
});

test('addBooking auto-logs an ExpenseRecord into Expense Tracker USP without duplicates', async () => {
  const before = (await store.listExpensesForUser(DEMO_USER_ID)).length;
  const trip = await store.createOrUpdateTrip(DEMO_USER_ID, null, {
    title: 'Unit Test Expense Trip',
    destination: 'Goa',
    origin: 'BLR',
    start_date: '2026-12-04',
    end_date: '2026-12-06',
    budget: 35000,
    total_cost: 9200,
    status: 'booked',
  });

  const booking = await store.addBooking(null, {
    trip_id: trip.id,
    approval_id: null,
    type: 'flight',
    provider: 'IndiGo',
    provider_ref: 'TEST-PNR-1',
    details: { airline: 'IndiGo', flight_number: '6E 501', origin: 'BLR', destination: 'GOI' },
    price: 9200,
    status: 'confirmed',
    idempotency_key: `unit-exp-${Date.now()}`,
  });

  const after = await store.listExpensesForUser(DEMO_USER_ID);
  assert.equal(after.length, before + 1);
  const autoExp = after.find((e) => e.booking_id === booking.id);
  assert.ok(autoExp);
  assert.equal(autoExp.amount, 9200);
  assert.equal(autoExp.category, 'flight');
  assert.equal(autoExp.status, 'authorized');
});

test('createCombinedTrip aggregates legs and total cost across multiple trips', async () => {
  const t1 = await store.createOrUpdateTrip(DEMO_USER_ID, null, {
    title: 'Circuit Leg One',
    destination: 'Jaipur',
    origin: 'BLR',
    start_date: '2026-12-10',
    end_date: '2026-12-12',
    budget: 45000,
    total_cost: 38000,
    status: 'planning',
  });
  const t2 = await store.createOrUpdateTrip(DEMO_USER_ID, null, {
    title: 'Circuit Leg Two',
    destination: 'Udaipur',
    origin: 'JAI',
    start_date: '2026-12-12',
    end_date: '2026-12-15',
    budget: 55000,
    total_cost: 49500,
    status: 'planning',
  });

  const combined = await store.createCombinedTrip(DEMO_USER_ID, {
    title: 'Rajasthan Winter Circuit',
    description: 'Jaipur + Udaipur combined itinerary',
    tripIds: [t1.id, t2.id],
    totalBudget: 100000,
  });

  assert.equal(combined.legs.length, 2);
  assert.equal(combined.legs[0].ordinal, 1);
  assert.equal(combined.legs[1].ordinal, 2);
  assert.equal(combined.total_cost, 87500);
  assert.equal(combined.total_budget, 100000);
});

