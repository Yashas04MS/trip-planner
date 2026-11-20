import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

export interface AgoraRtcHandle {
  client: IAgoraRTCClient;
  micTrack: IMicrophoneAudioTrack;
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

export async function joinAgoraVoiceChannel(params: {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  onUserVolume: (level: number) => void;
  onAgentVolume: (level: number) => void;
}): Promise<AgoraRtcHandle> {
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
  });

  client.enableAudioVolumeIndicator();
  client.on('volume-indicator', (volumes) => {
    for (const v of volumes) {
      if (v.uid === 0 || String(v.uid) === '0') {
        params.onAgentVolume(v.level);
      } else if (v.uid === params.uid) {
        params.onUserVolume(v.level);
      }
    }
  });

  await client.join(params.appId, params.channel, params.token || null, params.uid);
  const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([micTrack]);

  return {
    client,
    micTrack,
    async setMuted(muted: boolean) {
      await micTrack.setEnabled(!muted);
    },
    async leave() {
      micTrack.stop();
      micTrack.close();
      await client.leave();
    },
  };
}
