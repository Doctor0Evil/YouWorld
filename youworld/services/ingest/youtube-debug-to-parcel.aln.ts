// TypeScript ALN-compatible ingestion: YouTube debug JSON -> YouWorld.AttentionParcel

export type YtDebug = Record<string, any>;

export interface AttentionParcel {
  kind: "YouWorld.AttentionParcel";
  parcel_id: string;
  source: "YOUTUBE_DEBUG";
  timestamp_ms: number;
  client: any;
  media: any;
  network: any;
  derived: any;
  privacy: any;
}

function hashAnon(input: string): string {
  // This function should be replaced by a real ALN runtime hash or HMAC.
  // For local testing, we'll use a deterministic placeholder based on SHA-256.
  const crypto = (globalThis as any).crypto || (globalThis as any).msCrypto;
  // Fallback simple hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619) >>> 0;
  }
  return `p-${h.toString(16)}`;
}

export function fromYouTubeDebug(raw: YtDebug): AttentionParcel {
  const now = raw.timestamp ?? Date.now();
  const len = parseFloat(String(raw.len ?? raw.vd ?? 0)) || 0;
  const vct = parseFloat(String(raw.vct ?? raw.cmt ?? 0)) || 0;
  const completion = len > 0 ? Math.max(0, Math.min(1, vct / len)) : 0;

  const volume = raw.vvol ? parseFloat(String(raw.vvol)) : (raw.volume ? parseFloat(String(raw.volume)) / 100.0 : 0);
  const muted = raw.muted === "1" || raw.muted === 1 || raw.muted === true;

  const bandwidth = raw.lbw ? parseFloat(String(raw.lbw)) : 0;
  const rtt = raw.lhd ? parseFloat(String(raw.lhd)) : 0;

  const engagement = completion * 0.6 + (muted ? 0.0 : 0.2) + (volume > 0.3 ? 0.2 : 0.0);
  const mood_scalar = Math.max(0, Math.min(1, engagement));

  const resolution = raw.optimal_format ?? raw.debug_playbackQuality ?? "";
  const device_lane = raw.cplatform === "DESKTOP" && /1080p|hd1080/i.test(String(resolution)) ? "DESKTOP_HD" : raw.cplatform === "DESKTOP" ? "DESKTOP_SD" : "MOBILE";

  const bandwidth_bracket = bandwidth > 10000000 ? "HIGH" : bandwidth > 3000000 ? "MEDIUM" : "LOW";
  const gpu_bracket = /Radeon|RTX|GTX|ARC|VEGA/i.test(String(raw.gpu || "")) ? "DISCRETE_OR_STRONG" : "INTEGRATED_OR_UNKNOWN";
  const city_block_id = `YW-BLOCK-${device_lane}-${bandwidth_bracket}`;

  const parcel: AttentionParcel = {
    kind: "YouWorld.AttentionParcel",
    parcel_id: hashAnon(`${raw.debug_videoId || raw.docid}-${now}`),
    source: "YOUTUBE_DEBUG",
    timestamp_ms: now,
    client: {
      ns: raw.ns ?? "yt",
      c: raw.c ?? "WEB",
      cver: raw.cver ?? "",
      platform: raw.cplatform ?? "",
      os: raw.cos ?? "",
      os_ver: raw.cosver ?? "",
      browser: raw.cbr ?? "",
      browser_ver: raw.cbrver ?? "",
      gpu: raw.gpu ?? "",
      viewport: {
        w: parseInt(String(raw.vw ?? 0), 10) || 0,
        h: parseInt(String(raw.vh ?? 0), 10) || 0
      },
      country: raw.cr ?? "",
      lang: raw.hl ?? ""
    },
    media: {
      docid: raw.docid ?? "",
      debug_video_id: raw.debug_videoId ?? "",
      playback_quality: raw.debug_playbackQuality ?? "",
      len_sec: len,
      current_time_sec: vct,
      buffered_start_sec: (() => {
        try { return parseFloat((raw.vpl || "0-0").split("-")[0]) } catch { return 0 }
      })(),
      buffered_end_sec: (() => {
        try { return parseFloat((raw.vpl || "0-0").split("-")[1]) } catch { return 0 }
      })(),
      volume,
      muted,
      state: parseInt(String(raw.state ?? 0), 10) || 0,
      playlist_id: raw.list ?? "",
      referrer: raw.referrer ?? "",
      feature: raw.feature ?? "",
      sourceid: raw.sourceid ?? ""
    },
    network: {
      last_bandwidth_bps: bandwidth,
      last_rtt_sec: rtt,
      user_qual: parseInt(String(raw.user_qual ?? 0), 10) || 0,
      optimal_format: String(resolution)
    },
    derived: {
      completion_ratio: completion,
      engagement_score: engagement,
      mood_scalar,
      device_lane,
      gpu_bracket,
      bandwidth_bracket,
      city_block_id
    },
    privacy: {
      user_hash: hashAnon(`uid:${raw.of ?? ""}`),
      session_hash: hashAnon(`sid:${raw.cpn ?? ""}`),
      anonymized: true
    }
  };

  return parcel;
}
