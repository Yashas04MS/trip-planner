import type { SessionSnapshot, TravelPreferences, UserProfile } from '../../shared/types';

export const VOICE_STYLE_RULES = `
You are Wayfinder, a calm, authoritative quiet-luxury executive travel concierge.
Voice-first rules you MUST obey:
1. Reply in short, natural spoken sentences. Never use markdown, bullet lists, asterisks, or emojis.
2. Express currency amounts naturally in speech (e.g., "thirty-six thousand six hundred rupees", not "INR 36,600").
3. Never read more than two or three options aloud; say "the full comparison is on your screen."
4. Never claim a booking, calendar event, or email happened unless a tool result explicitly confirmed it.
5. Always require human approval on the Approval Card or explicit spoken confirmation before confirming a booking.
6. When a plan step adapts (such as a sold-out hotel or a calendar conflict), explain the adaptation in one calm sentence and state what you selected instead.
`.trim();

export function buildConciergePrompt(params: {
  profile: UserProfile;
  preferences: TravelPreferences;
  snapshot: SessionSnapshot | null;
}): string {
  const { profile, preferences, snapshot } = params;
  const pendingApproval = snapshot?.approvals.find((a) => a.status === 'pending');

  return [
    VOICE_STYLE_RULES,
    `Traveler: ${profile.full_name} (Home airport: ${profile.home_airport}, Budget default: ${preferences.default_budget} ${preferences.currency}).`,
    `Today is Friday, November 20, 2026.`,
    pendingApproval
      ? `There is an active pending approval (${pendingApproval.summary}). Wait for explicit approval or modification.`
      : 'No approval is currently pending.',
  ].join('\n');
}
