import { applyArComplexityToScene, updateSceneFromCityMood } from "../youworld-ar-scene.js";

/**
 * Bridge between YouWorld AttentionParcel labels and CityMoodApp WASM.
 * Expects a wasm-bindgen generated JS wrapper for city-mood-visualizer.
 */
export function applyParcelToCityMood(cityMoodApp, parcel) {
  if (!parcel || !parcel.labels) return;

  const engagementScore = parseFloat(parcel.labels.engagement_score || "0");
  const deviceLane = parcel.labels.device_lane || "UNKNOWN";

  // Map engagement to "positive"/"negative" events
  const now = Date.now();
  if (engagementScore >= 0.7) {
    cityMoodApp.on_event("positive", engagementScore, now);
  } else if (engagementScore <= 0.3) {
    cityMoodApp.on_event("negative", 1 - engagementScore, now);
  }

  // Optionally, bias city mood based on device lane
  if (deviceLane === "DESKTOP_HD") {
    cityMoodApp.on_event("positive", 0.1, now);
  } else if (deviceLane === "LOWPOWER") {
    cityMoodApp.on_event("negative", 0.05, now);
  }

  // Apply derived metrics directly to CITY WASM if supported
  if (typeof cityMoodApp.set_derived === "function") {
    const completion = parseFloat(parcel.labels.completion_ratio || "0.0");
    cityMoodApp.set_derived(completion, engagementScore, parcel.labels.ar_complexity_budget || "MEDIUM", now);
  }
}

/**
 * Apply a YouWorld parcel to CityMoodApp and AR scene.
 */
export function applyParcelToCityMoodAndScene(cityMoodApp, parcel, scene) {
  if (!parcel || !parcel.labels) return;

  const labels = parcel.labels;
  const completion = parseFloat(labels.completion_ratio || "0");
  const engagement = parseFloat(labels.engagement_score || "0");
  const complexity = labels.ar_complexity_budget || "MEDIUM";

  const now = Date.now();

  if (typeof cityMoodApp.set_derived === "function") {
    cityMoodApp.set_derived(completion, engagement, complexity, now);
  } else {
    if (engagement >= 0.7) {
      cityMoodApp.on_event("positive", engagement, now);
    } else if (engagement <= 0.3) {
      cityMoodApp.on_event("negative", 1 - engagement, now);
    }
  }

  if (scene) {
    applyArComplexityToScene(scene, complexity);
    updateSceneFromCityMood(scene, cityMoodApp, parcel);
  }
}
