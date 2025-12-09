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

export interface YouWorldDerivedSignals {
  completion_ratio: number;
  engagement_score: number;
  device_lane: "DESKTOP_HD" | "MOBILE" | "TV" | "LOWPOWER" | "UNKNOWN";
  bandwidth_bracket: "LOW" | "MEDIUM" | "HIGH";
  ar_complexity_budget: "LOW" | "MEDIUM" | "HIGH";
  // Extra QoE and cohort fields
  qoe_score?: number;
  quality_bracket?: "SD" | "HD" | "UHD";
  device_cohort?: "DESKTOP_PRO" | "DESKTOP_LITE" | "MOBILE_HIGH" | "MOBILE_LOW" | "TV" | "OTHER";
  rebuffer_burst?: boolean;
}

export function deriveYouWorldSignals(
  debugPayload: YouTubeDebugPayload,
  watchSeconds: number,
  volumeLevel: number,
  isMuted: boolean
): YouWorldDerivedSignals {
  const lenSeconds =
    typeof debugPayload.len === "string"
      ? parseFloat(debugPayload.len)
      : typeof debugPayload.len === "number"
      ? debugPayload.len
      : undefined;

  const completionRatio =
    lenSeconds && lenSeconds > 0
      ? Math.max(0, Math.min(1, watchSeconds / lenSeconds))
      : 0;

  const engagementScore = Math.max(
    0,
    Math.min(
      1,
      completionRatio * 0.6 + (isMuted ? 0 : volumeLevel) * 0.4
    )
  );

  const platform = String(debugPayload.cplatform || debugPayload.c || "").toUpperCase();
  const width = typeof debugPayload.vw === "number" ? debugPayload.vw : 0;
  const height = typeof debugPayload.vh === "number" ? debugPayload.vh : 0;
  const gpu = String(debugPayload.gpu || "").toUpperCase();

  let deviceLane: YouWorldDerivedSignals["device_lane"] = "UNKNOWN";
  if (platform === "DESKTOP") {
    deviceLane = width >= 1280 && /RADEON|GEFORCE|RTX|GTX/.test(gpu) ? "DESKTOP_HD" : "LOWPOWER";
  } else if (platform === "MOBILE") {
    deviceLane = "MOBILE";
  } else if (platform === "TV") {
    deviceLane = "TV";
  }

  const lastBw =
    typeof debugPayload.lbw === "string"
      ? parseFloat(debugPayload.lbw)
      : typeof debugPayload.lbw === "number"
      ? debugPayload.lbw
      : 0;

  let bandwidthBracket: YouWorldDerivedSignals["bandwidth_bracket"] = "LOW";
  if (lastBw >= 8_000_000) bandwidthBracket = "HIGH";
  else if (lastBw >= 3_000_000) bandwidthBracket = "MEDIUM";

  let arComplexity: YouWorldDerivedSignals["ar_complexity_budget"] = "LOW";
  if (bandwidthBracket === "HIGH" && deviceLane === "DESKTOP_HD") {
    arComplexity = "HIGH";
  } else if (bandwidthBracket !== "LOW") {
    arComplexity = "MEDIUM";
  }

  return {
    completion_ratio: completionRatio,
    engagement_score: engagementScore,
    device_lane: deviceLane,
    bandwidth_bracket: bandwidthBracket,
    ar_complexity_budget: arComplexity,
    // these will be filled below when we wire the extra helpers
  };
}

// Extra enrichment helpers

export type QualityBracket = "SD" | "HD" | "UHD";
export type DeviceCohort = "DESKTOP_PRO" | "DESKTOP_LITE" | "MOBILE_HIGH" | "MOBILE_LOW" | "TV" | "OTHER";

export function classifyQuality(debugPayload: YouTubeDebugPayload): QualityBracket {
  const q = String(
    debugPayload.debug_playbackQuality ||
      debugPayload.debug_videoQuality ||
      debugPayload.optimal_format ||
      ""
  ).toLowerCase();

  if (q.includes("2160") || q.includes("1440") || q.includes("4k")) return "UHD";
  if (q.includes("720") || q.includes("1080") || q.includes("hd")) return "HD";
  return "SD";
}

export function classifyDeviceCohort(debugPayload: YouTubeDebugPayload): DeviceCohort {
  const platform = String(debugPayload.cplatform || debugPayload.c || "").toUpperCase();
  const gpu = String(debugPayload.gpu || "").toUpperCase();
  const width = typeof debugPayload.vw === "number" ? debugPayload.vw : 0;

  if (platform === "TV") return "TV";
  if (platform === "DESKTOP") {
    if (/RADEON|GEFORCE|RTX|GTX/.test(gpu) && width >= 1280) return "DESKTOP_PRO";
    return "DESKTOP_LITE";
  }
  if (platform === "MOBILE") {
    return width >= 720 ? "MOBILE_HIGH" : "MOBILE_LOW";
  }
  return "OTHER";
}

export function computeQoeScore(
  completionRatio: number,
  engagementScore: number,
  quality: QualityBracket,
  bandwidthBracket: "LOW" | "MEDIUM" | "HIGH"
): number {
  const qualityWeight = quality === "UHD" ? 1.0 : quality === "HD" ? 0.8 : 0.6;
  const bandwidthWeight = bandwidthBracket === "HIGH" ? 1.0 : bandwidthBracket === "MEDIUM" ? 0.8 : 0.5;
  const base = (completionRatio * 0.5 + engagementScore * 0.5);
  return Math.max(0, Math.min(1, base * 0.7 + qualityWeight * 0.2 + bandwidthWeight * 0.1));
}

export function detectRebufferBurst(debugPayload: YouTubeDebugPayload): boolean {
  // Simple heuristic using YouTube latency/buffer stats
  const lhd = typeof debugPayload.lhd === "string"
    ? parseFloat(debugPayload.lhd)
    : typeof debugPayload.lhd === "number"
    ? debugPayload.lhd
    : 0;

  const latency = typeof debugPayload.rt === "string"
    ? parseFloat(debugPayload.rt)
    : typeof debugPayload.rt === "number"
    ? debugPayload.rt
    : 0;

  return lhd > 1.0 || latency > 30.0;
}


    // Extra QoE and device cohort enrichment
    const qualityBracket = classifyQuality(debugPayload);
    const deviceCohort = classifyDeviceCohort(debugPayload);
    const qoeScore = computeQoeScore(
      completionRatio,
      engagementScore,
      qualityBracket,
      bandwidthBracket
    );
    const hasRebufferBurst = detectRebufferBurst(debugPayload);
function nonReversibleHash(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function youtubeDebugToAttentionParcel(
  debugPayload: YouTubeDebugPayload,
  opts: {
      qoe_score: qoeScore,
      quality_bracket: qualityBracket,
      device_cohort: deviceCohort,
      rebuffer_burst: hasRebufferBurst,
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

  // Derive AR routing and city mood signals
  const derived = deriveYouWorldSignals(debugPayload, watchSeconds, volumeLevel, isMuted);

  labels.completion_ratio = derived.completion_ratio.toFixed(3);
  labels.engagement_score = derived.engagement_score.toFixed(3);
  labels.device_lane = derived.device_lane;
  labels.bandwidth_bracket = derived.bandwidth_bracket;
  labels.ar_complexity_budget = derived.ar_complexity_budget;
  // QoE / device / rebuffer enrichment
  if (typeof derived.qoe_score === "number") {
    labels.qoe_score = derived.qoe_score.toFixed(3);
  }
  if (typeof derived.quality_bracket === "string") {
    labels.quality_bracket = derived.quality_bracket;
  }
  if (typeof derived.device_cohort === "string") {
    labels.device_cohort = derived.device_cohort;
  }
  if (derived.rebuffer_burst) {
    labels.rebuffer_burst = "1";
  }

  debugRedacted["derived_completion_ratio"] = derived.completion_ratio;
  debugRedacted["derived_engagement_score"] = derived.engagement_score;
  debugRedacted["derived_device_lane"] = derived.device_lane;
  debugRedacted["derived_bandwidth_bracket"] = derived.bandwidth_bracket;
  debugRedacted["derived_ar_complexity_budget"] = derived.ar_complexity_budget;
  debugRedacted["qoe_score"] = (derived as any).qoe_score;
  debugRedacted["quality_bracket"] = (derived as any).quality_bracket;
  debugRedacted["device_cohort"] = (derived as any).device_cohort;
  debugRedacted["rebuffer_burst"] = (derived as any).rebuffer_burst;

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
