import agoraToken from 'agora-token';
import { env } from '../config/env';

const { RtcRole, RtcTokenBuilder } = agoraToken;

export function buildAgoraRtcToken(
  channelName: string,
  uid: number,
  ttlSeconds = 3600,
): string {
  if (!env.AGORA_APP_ID || !env.AGORA_APP_CERTIFICATE) {
    return '';
  }
  const now = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = now + ttlSeconds;
  return RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpiredTs,
    privilegeExpiredTs,
  );
}
