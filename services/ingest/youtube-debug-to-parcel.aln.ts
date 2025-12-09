import crypto from "node:crypto";

export interface YouWorldAttentionParcel {
  parcel_id: string;
  city_block_id: string;
  source: "youtube-debug";
  timestamp_ms: number;
  subject_hash: string;
  session_hash: string;
  channel: string;
  engagement: {
    watch_seconds: number;
    playback_state: "playing" | "paused" | "buffering" | "seeking" | "ended";
    volume_level: number;
    is_muted?: boolean;
    quality_label?: string;
    rate?: number;
  };
  client: {
    platform: string;
    user_agent: string;
    ip_hash?: string;
  };
  debug?: Record<string, unknown>;
  labels?: Record<string, string>;
}

export interface YouTubeDebugPayload {
  // Use a loose type: real integration should mirror YouTube debug JSON.
  [key: string]: any;
}

function nonReversibleHash(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function youtubeDebugToAttentionParcel(
  debugPayload: YouTubeDebugPayload,
  opts: {
    cityBlockId: string;
    subjectStableKey: string;
    sessionStableKey: string;
    ipAddress?: string;
    channel?: string;
    nowMs?: number;
  }
): YouWorldAttentionParcel {
  const now = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();

  const watchSeconds =
    typeof debugPayload.watchTime === "number"
      ? debugPayload.watchTime
      : typeof debugPayload.watchTimeSeconds === "number"
      ? debugPayload.watchTimeSeconds
      : 0;

  const playbackStateRaw: string =
    debugPayload.playbackState || debugPayload.playerState || "paused";

  const playbackStateMap: Record<string, YouWorldAttentionParcel["engagement"]["playback_state"]> =
    {
      playing: "playing",
      PLAYING: "playing",
      paused: "paused",
      PAUSED: "paused",
      buffering: "buffering",
      BUFFERING: "buffering",
      seeking: "seeking",
      SEEKING: "seeking",
      ended: "ended",
      ENDED: "ended",
    };

  const playbackState = playbackStateMap[playbackStateRaw] ?? "paused";

  const volumeLevel =
    typeof debugPayload.volume === "number"
      ? Math.max(0, Math.min(1, debugPayload.volume / 100))
      : typeof debugPayload.volume_level === "number"
      ? Math.max(0, Math.min(1, debugPayload.volume_level))
      : 1;

  const isMuted =
    typeof debugPayload.muted === "boolean"
      ? debugPayload.muted
      : debugPayload.volume === 0;

  const qualityLabel: string | undefined =
    typeof debugPayload.quality === "string"
      ? debugPayload.quality
      : typeof debugPayload.quality_label === "string"
      ? debugPayload.quality_label
      : undefined;

  const rate: number | undefined =
    typeof debugPayload.playbackRate === "number"
      ? debugPayload.playbackRate
      : typeof debugPayload.rate === "number"
      ? debugPayload.rate
      : undefined;

  const platform: string =
    debugPayload.platform || debugPayload.clientName || "web";

  const userAgent: string =
    debugPayload.userAgent || debugPayload.user_agent || "";

  const channel =
    opts.channel ||
    (typeof debugPayload.contentType === "string"
      ? `youtube:${debugPayload.contentType}`
      : "youtube:watch");

  const parcelId = crypto.randomUUID();

  const subjectHash = nonReversibleHash(opts.subjectStableKey);
  const sessionHash = nonReversibleHash(opts.sessionStableKey);
  const ipHash = typeof opts.ipAddress === "string" ? nonReversibleHash(opts.ipAddress) : undefined;

  const debugRedacted: Record<string, unknown> = { ...debugPayload };
  delete (debugRedacted as any).userId;
  delete (debugRedacted as any).user_id;
  delete (debugRedacted as any).email;
  delete (debugRedacted as any).ip;
  delete (debugRedacted as any).ipAddress;

  const labels: Record<string, string> = {};
  if (typeof debugPayload.videoId === "string") {
    labels.video_id = debugPayload.videoId;
  }
  if (typeof debugPayload.channelId === "string") {
    labels.channel_id = debugPayload.channelId;
  }

  return {
    parcel_id: parcelId,
    city_block_id: opts.cityBlockId,
    source: "youtube-debug",
    timestamp_ms: now,
    subject_hash: subjectHash,
    session_hash: sessionHash,
    channel,
    engagement: {
      watch_seconds: watchSeconds,
      playback_state: playbackState,
      volume_level: volumeLevel,
      is_muted: isMuted,
      quality_label: qualityLabel,
      rate,
    },
    client: {
      platform,
      user_agent: userAgent,
      ip_hash: ipHash,
    },
    debug: debugRedacted,
    labels: Object.keys(labels).length > 0 ? labels : undefined,
  };
}
