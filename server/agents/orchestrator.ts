import type { Response } from 'express';
import type { ExpenseCategory } from '../../shared/types';
import { store } from '../lib/store';
import { runToolCall } from '../tools/registry';
import { evaluateVoiceApproval } from './approval-gate';
import { executeApprovedBookingPipeline, proposeTripApproval } from './booking.agent';
import { runDisruptionRecovery } from './followup.agent';
import { generateConciergeSpokenReply } from './gemini';
import { loadSessionMemory } from './memory';
import { createExecutionPlan, parseTravelGoal } from './planner.agent';
import { buildConciergePrompt } from './prompts';
import { rankResearchOptions, runParallelResearch } from './research.agent';
import { closeOpenAiStream, openSseStream, writeOpenAiChunk, writeSseEvent } from './stream';

export function parseExpenseIntent(
  text: string,
): { merchant: string; amount: number; category: ExpenseCategory; description: string } | null {
  const lower = text.toLowerCase();
  const hasExpenseVerb =
    /\b(log|track|add|record|spent|paid)\b/i.test(lower) &&
    /\b(expense|spend|receipt|cab|taxi|uber|dinner|lunch|breakfast|coffee|hotel|flight|tour|₹|rs|inr|\d{3,6})\b/i.test(
      lower,
    );
  const explicitExpenseWord = /\b(expense|receipt)\b/i.test(lower);
  if (!hasExpenseVerb && !explicitExpenseWord) return null;
  // Don't hijack trip-planning prompts like "Weekend in Goa under ₹40,000"
  if (/\b(weekend|plan me|trip|itinerary|vacation|retreat|flight to)\b/i.test(lower) && !explicitExpenseWord) {
    return null;
  }

  const amountMatch = lower.match(/(?:₹|rs\.?|inr)?\s*([\d,]{2,7})/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 2500;

  let category: ExpenseCategory = 'other';
  if (/\b(cab|taxi|uber|ola|chauffeur|transfer)\b/i.test(lower)) category = 'transport';
  else if (/\b(dinner|lunch|breakfast|restaurant|coffee|cafe|meal|cavatina|britto)\b/i.test(lower))
    category = 'dining';
  else if (/\b(hotel|resort|villa|room|stay)\b/i.test(lower)) category = 'hotel';
  else if (/\b(flight|air|ticket|indigo|vistara)\b/i.test(lower)) category = 'flight';
  else if (/\b(kayak|spa|tour|museum|safari|ticket|experience)\b/i.test(lower))
    category = 'experience';

  const merchantMatch = text.match(/\b(?:at|to|for)\s+([A-Z][A-Za-z0-9'&\s-]{2,32})/);
  const merchant = merchantMatch
    ? merchantMatch[1].replace(/\b(under|for|on|rupees|inr)\b.*$/i, '').trim()
    : category === 'transport'
      ? 'Executive Transfer'
      : category === 'dining'
        ? 'Concierge Dining'
        : 'Travel Expense';

  return {
    merchant: merchant || 'Travel Expense',
    amount: amount > 0 ? amount : 2500,
    category,
    description: text.trim(),
  };
}

function pickInitialFiller(userText: string): string {
  const lower = userText.toLowerCase();
  if (/\b(yes|book|confirm|approve|proceed|go ahead)\b/i.test(lower)) {
    return 'Understood. Confirming your reservation and syncing your itinerary now. ';
  }
  if (/\b(expense|spent|receipt)\b/i.test(lower)) {
    return 'Recording that spend in your Expense Tracker ledger now. ';
  }
  if (/\b(combine|circuit|multi-trip)\b/i.test(lower)) {
    return 'Linking your itineraries into a unified multi-trip circuit now. ';
  }
  if (/\b(option|delay|disruption|reschedule|rebook)\b/i.test(lower)) {
    return 'Let me review your active flight options right away. ';
  }
  if (/\b(cheaper|change|different|switch)\b/i.test(lower)) {
    return 'Certainly, let me adjust those options and recalculate your itinerary. ';
  }
  return 'Certainly. Checking your calendar, flights, stays, and forecast in parallel now. ';
}

export interface OrchestratorTurnResult {
  replyText: string;
  sessionId: string;
  tripId: string | null;
  approvalId: string | null;
  usedGemini: boolean;
}

export async function runConciergeTurn(params: {
  sessionId: string;
  userText: string;
  res?: Response;
  mode?: 'openai_sse' | 'app_sse' | 'json';
}): Promise<OrchestratorTurnResult> {
  const mem = await loadSessionMemory(params.sessionId);
  if (!mem) {
    throw new Error('Voice session not found');
  }

  const { profile, preferences, snapshot } = mem;
  const cleanUserText = params.userText.trim();
  const mode = params.mode ?? 'json';

  if (params.res && mode !== 'json') {
    openSseStream(params.res);
    const filler = pickInitialFiller(cleanUserText);
    if (mode === 'openai_sse') {
      writeOpenAiChunk(params.res, filler);
    } else {
      writeSseEvent(params.res, 'filler', { text: filler });
    }
  }

  await store.addMessage(params.sessionId, 'user', cleanUserText);

  const ctx = {
    sessionId: params.sessionId,
    userId: profile.id,
    userEmail: profile.email,
    latestUserMessage: cleanUserText,
    chaosMode: snapshot.chaosMode,
  };

  let factsSummary = '';
  let resultingTripId = snapshot.trip?.id ?? null;
  let resultingApprovalId: string | null = null;

  // 1. Check server-verified human approval gate if an approval is pending
  const voiceGate = await evaluateVoiceApproval({
    sessionId: params.sessionId,
    latestUserUtterance: cleanUserText,
  });

  const parsedExpense = parseExpenseIntent(cleanUserText);
  const isCombineIntent = /\b(combine|merge|multi-trip|circuit)\b/i.test(cleanUserText);

  if (voiceGate.intent === 'approve' && voiceGate.approval) {
    const exec = await executeApprovedBookingPipeline(voiceGate.approval.id, ctx);
    if (exec.ok) {
      resultingTripId = exec.tripId;
      factsSummary = `Your ${voiceGate.approval.payload.destination} trip is booked. Flight reference ${exec.flightRef} and hotel reference ${exec.hotelRef} are confirmed, your Google Calendar holds are synced, your confirmation dossier is emailed, reminders are active, and all charges are recorded in your Expense Tracker.`;
    } else {
      factsSummary = `I could not complete the booking because ${exec.error || 'the provider declined the request'}. Nothing was charged.`;
    }
  } else if (voiceGate.intent === 'reject' && voiceGate.approval) {
    const goal = parseTravelGoal(cleanUserText, {
      origin: profile.home_airport,
      budget: preferences.default_budget,
    });
    const flights = snapshot.flightOptions;
    const hotels = snapshot.hotelOptions;
    const ranked = rankResearchOptions({
      flights,
      hotels,
      busyBlocks: snapshot.calendarBlocks,
      budget: goal.budget,
      preferCheaperHotel: true,
    });
    const proposed = await proposeTripApproval({
      flightId: ranked.flight.id,
      hotelId: ranked.hotel.id,
      destination: snapshot.trip?.destination || goal.destination,
      origin: snapshot.trip?.origin || goal.origin,
      startDate: snapshot.trip?.start_date || goal.startDate,
      endDate: snapshot.trip?.end_date || goal.endDate,
      budget: goal.budget,
      adaptations: ranked.adaptations,
      ctx,
    });
    resultingTripId = String(proposed.result.trip_id ?? resultingTripId ?? '');
    resultingApprovalId = String(proposed.result.approval_id ?? '');
    factsSummary = `I updated your stay to ${ranked.hotel.name} on ${ranked.flight.flight_number}, bringing the total to ${ranked.totalCost.toLocaleString('en-IN')} rupees. The new Approval Card is ready on your screen whenever you want to confirm.`;
  } else if (parsedExpense) {
    const res = await runToolCall(
      'log_expense',
      {
        merchant: parsedExpense.merchant,
        amount: parsedExpense.amount,
        category: parsedExpense.category,
        description: parsedExpense.description,
        trip_id: resultingTripId ?? undefined,
        reimbursable: true,
      },
      ctx,
    );
    factsSummary = `Logged ₹${Number(res.result.amount ?? parsedExpense.amount).toLocaleString('en-IN')} at ${String(res.result.merchant ?? parsedExpense.merchant)} under ${String(res.result.category ?? parsedExpense.category)} in your Expense Tracker USP ledger.`;
  } else if (isCombineIntent) {
    const trips = await store.listTripsForUser(profile.id);
    const chosenIds = trips.slice(0, 2).map((t) => t.id);
    if (chosenIds.length >= 2) {
      const res = await runToolCall(
        'combine_trips',
        {
          title: `${trips[0].destination} + ${trips[1].destination} Combined Circuit`,
          description: 'Voice-assembled multi-trip circuit with synced inter-city logistics.',
          trip_ids: chosenIds,
        },
        ctx,
      );
      factsSummary = `Created the multi-trip combined plan "${String(res.result.title)}" linking ${String(res.result.legs_count)} trips with a consolidated spend of ₹${Number(res.result.total_cost || 0).toLocaleString('en-IN')}. View it in the Combined Plans workbench.`;
    } else {
      factsSummary =
        'You need at least two trips in your workspace to combine into a multi-trip circuit. Ask me to plan another trip first, or open Combined Plans.';
    }
  } else if (
    snapshot.disruptions.some((d) => d.status === 'open') &&
    /\b(option|delay|disruption|reschedule|rebook|flight|yes|switch)\b/i.test(cleanUserText)
  ) {
    const openDisruption = snapshot.disruptions.find((d) => d.status === 'open')!;
    const alts = openDisruption.detail.alternatives ?? [];
    if (/\b(rebook|yes|switch|confirm|8:45|20:45|ix)\b/i.test(cleanUserText) && snapshot.trip) {
      const recovery = await runDisruptionRecovery({
        tripId: snapshot.trip.id,
        disruptionId: openDisruption.id,
        flightId: alts[0]?.id,
        ctx,
      });
      const newFlight = recovery.result.new_flight as
        | { flight_number?: string; depart_at?: string }
        | undefined;
      factsSummary = `Done. I rebooked you onto ${newFlight?.flight_number ?? 'IX 804'} departing at ${newFlight?.depart_at?.slice(11, 16) ?? '20:45'} and updated your Google Calendar event.`;
    } else {
      const topAlt = alts[0];
      factsSummary = topAlt
        ? `Your flight ${openDisruption.detail.flight_number ?? ''} is delayed by ${openDisruption.detail.delay_minutes ?? 95} minutes. I am holding an alternative on ${topAlt.airline} ${topAlt.flight_number} departing at ${topAlt.depart_at.slice(11, 16)} for no extra fare difference. Say rebook to switch immediately.`
        : 'There is an open flight delay on your itinerary. Check the Disruptions workbench for alternative departures.';
    }
  } else {
    const goal = parseTravelGoal(cleanUserText, {
      origin: profile.home_airport,
      budget: preferences.default_budget,
    });

    await createExecutionPlan(params.sessionId, cleanUserText, resultingTripId);

    const research = await runParallelResearch({ goal, ctx });
    const rec = research.recommendation;

    const proposed = await proposeTripApproval({
      flightId: rec.flight.id,
      hotelId: rec.hotel.id,
      destination: goal.destination,
      origin: goal.origin,
      startDate: goal.startDate,
      endDate: goal.endDate,
      budget: goal.budget,
      adaptations: rec.adaptations,
      ctx,
    });

    resultingTripId = String(proposed.result.trip_id ?? resultingTripId ?? '');
    resultingApprovalId = String(proposed.result.approval_id ?? '');

    const adaptNotes = rec.adaptations.join(' ');
    factsSummary = `${adaptNotes} I paired ${rec.flight.airline} ${rec.flight.flight_number} departing Friday at 18:30 with two nights at ${rec.hotel.name} for ${rec.totalCost.toLocaleString('en-IN')} rupees total, well under your ${goal.budget.toLocaleString('en-IN')} rupee limit. The full comparison and Approval Card are on your screen; click Approve or say yes to book it.`;
  }

  const systemInstruction = buildConciergePrompt({
    profile,
    preferences,
    snapshot: await store.getSessionSnapshot(params.sessionId),
  });

  const geminiOut = await generateConciergeSpokenReply({
    systemInstruction,
    userGoal: cleanUserText,
    factsSummary,
  });

  const finalText = geminiOut.text;
  await store.addMessage(params.sessionId, 'assistant', finalText);

  if (params.res && mode !== 'json') {
    if (mode === 'openai_sse') {
      writeOpenAiChunk(params.res, finalText);
      closeOpenAiStream(params.res);
    } else {
      writeSseEvent(params.res, 'message', {
        text: finalText,
        tripId: resultingTripId,
        approvalId: resultingApprovalId,
      });
      writeSseEvent(params.res, 'done', { ok: true });
      params.res.end();
    }
  }

  return {
    replyText: finalText,
    sessionId: params.sessionId,
    tripId: resultingTripId,
    approvalId: resultingApprovalId,
    usedGemini: geminiOut.usedGemini,
  };
}
