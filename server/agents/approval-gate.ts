import type { ApprovalRequest } from '../../shared/types';
import { ApprovalRequiredError } from '../lib/errors';
import { store } from '../lib/store';

export type VoiceIntent = 'approve' | 'reject' | 'none';

const APPROVE_PATTERNS = [
  /\b(yes|yeah|yep|yup|sure|okay|ok|alright|go ahead|book it|confirm|approve|do it|proceed|lock it in|sounds good)\b/i,
];

const NEGATIVE_PATTERNS = [
  /\b(no|nope|cancel|don't|do not|stop|reject|change|cheaper|different|wait|hold on|not yet)\b/i,
];

/**
 * Pure server-side classifier for spoken/text approval turns.
 * Negative/change phrases take precedence over affirmative phrases so
 * "yes, actually make it cheaper" is never misclassified as approval.
 */
export function classifyApprovalUtterance(utterance: string): VoiceIntent {
  const clean = utterance.trim();
  if (!clean) return 'none';
  if (NEGATIVE_PATTERNS.some((re) => re.test(clean))) {
    return 'reject';
  }
  if (APPROVE_PATTERNS.some((re) => re.test(clean))) {
    return 'approve';
  }
  return 'none';
}

export async function resolveApprovalFromUi(params: {
  approvalId: string;
  userId: string;
  decision: 'approve' | 'reject';
}): Promise<ApprovalRequest> {
  const approval = await store.getApproval(params.approvalId);
  if (!approval) {
    throw new Error('Approval request not found');
  }
  const session = await store.getSession(approval.session_id);
  if (!session || session.user_id !== params.userId) {
    throw new Error('Forbidden: approval belongs to another user');
  }
  if (approval.status !== 'pending') {
    throw new Error(`Approval is already ${approval.status}`);
  }
  if (Date.parse(approval.expires_at) < Date.now()) {
    await store.setApprovalStatus(approval.id, 'expired', null);
    throw new Error('Approval request has expired');
  }

  const nextStatus = params.decision === 'approve' ? 'approved' : 'rejected';
  const updated = await store.setApprovalStatus(approval.id, nextStatus, 'ui');
  if (!updated) {
    throw new Error('Failed to update approval');
  }
  return updated;
}

export async function evaluateVoiceApproval(params: {
  sessionId: string;
  latestUserUtterance: string;
}): Promise<{
  intent: VoiceIntent;
  approval: ApprovalRequest | null;
}> {
  const pending = await store.getPendingApprovalForSession(params.sessionId);
  if (!pending) {
    // Safety invariant: voice approval phrases do NOTHING when no approval is pending
    return { intent: 'none', approval: null };
  }

  const intent = classifyApprovalUtterance(params.latestUserUtterance);
  if (intent === 'approve') {
    const updated = await store.setApprovalStatus(pending.id, 'approved', 'voice');
    return { intent: 'approve', approval: updated };
  }
  if (intent === 'reject') {
    const updated = await store.setApprovalStatus(pending.id, 'rejected', 'voice');
    return { intent: 'reject', approval: updated };
  }
  return { intent: 'none', approval: pending };
}

export async function consumeApprovedGate(
  approvalId: string,
): Promise<ApprovalRequest> {
  const approval = await store.getApproval(approvalId);
  if (!approval) {
    throw new ApprovalRequiredError('Approval record not found', approvalId);
  }
  if (approval.status === 'expired' || Date.parse(approval.expires_at) < Date.now()) {
    await store.setApprovalStatus(approval.id, 'expired', null);
    throw new ApprovalRequiredError('Approval expired; please re-propose booking', approval.id);
  }
  if (approval.status !== 'approved') {
    throw new ApprovalRequiredError(
      `Booking requires approved status (current: ${approval.status})`,
      approval.id,
    );
  }
  const consumed = await store.setApprovalStatus(approval.id, 'consumed', null);
  return consumed ?? approval;
}
