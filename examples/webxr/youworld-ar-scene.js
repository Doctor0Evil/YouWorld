async function activateXRWithYouWorldScene() {
  if (!navigator.xr) throw new Error("WebXR not supported");

  const xrSession = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"] });
  const glCanvas = document.createElement("canvas");
  const gl = glCanvas.getContext("webgl", { xrCompatible: true });

  const xrRefSpace = await xrSession.requestReferenceSpace("local");
  xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });

  const youWorldSceneId = "city-block-42";
  const youWorldWidget = await YouWorld.loadWidget({
    sceneId: youWorldSceneId,
    mode: "AR_PANEL"
  });

  const onXRFrame = (time, frame) => {
    xrSession.requestAnimationFrame(onXRFrame);
    const pose = frame.getViewerPose(xrRefSpace);
    if (!pose) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, xrSession.renderState.baseLayer.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const view of pose.views) {
      const viewport = xrSession.renderState.baseLayer.getViewport(view);
      gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
      youWorldWidget.renderView(view, xrRefSpace, time);
    }
  };

  xrSession.requestAnimationFrame(onXRFrame);
}

// Advanced: apply AR complexity budget from YouWorld parcels
export function applyArComplexityToScene(scene, arComplexityBudget) {
  // Example policy:
  // LOW: few objects, simple materials
  // MEDIUM: more objects, basic lighting
  // HIGH: rich lighting, particle systems, extra meshes
  const level = arComplexityBudget || "MEDIUM";

  // App-specific policy hook; keep this deterministic and side-effect-free
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!obj.userData.baseIntensity) {
      obj.userData.baseIntensity = 1.0;
    }
    const base = obj.userData.baseIntensity;
    if (level === "LOW") {
      obj.visible = true;
      obj.scale.setScalar(0.7 * base);
    } else if (level === "MEDIUM") {
      obj.visible = true;
      obj.scale.setScalar(1.0 * base);
    } else {
      obj.visible = true;
      obj.scale.setScalar(1.3 * base);
    }
  });
}

// Map mood/load/QoE into simple visual tweaks for a Three.js scene
export function updateSceneFromCityMood(scene, cityMoodApp, lastParcel) {
  const mood = cityMoodApp.mood_score();
  const load = cityMoodApp.load_score();
  const quality = cityMoodApp.quality_score();

  const qoe = lastParcel && lastParcel.labels && lastParcel.labels.qoe_score
    ? parseFloat(lastParcel.labels.qoe_score)
    : quality;

  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const mat = obj.material;
    if (mat && mat.color) {
      // Mood: blend between cool (low mood) and warm (high mood)
      const warm = mood;
      const cool = 1.0 - mood;
      mat.color.setRGB(0.2 + warm * 0.8, 0.2 + warm * 0.5, 0.3 + cool * 0.7);
    }

    // Load: aggressively cull lower-priority meshes at high load
    if (obj.userData.priority === "low" && load > 0.7) {
      obj.visible = false;
    } else {
      obj.visible = true;
    }

    // QoE: if high, slightly boost scale for hero objects
    if (obj.userData.hero && qoe >= 0.7) {
      obj.scale.setScalar(1.2);
    }
  });
}

// Create a lightweight stub CityMoodApp with the wasm-like interface if wasm not present
function createJsCityMoodStub() {
  return {
    mood_score() { return 0.5; },
    quality_score() { return 0.5; },
    load_score() { return 0.0; },
    set_derived(completion, engagement, complexity) {
      // simple no-op or re-map
      const mood = (engagement * 0.7 + completion * 0.3);
      this._mood = mood;
      this._load = complexity === 'HIGH' ? 0.9 : complexity === 'MEDIUM' ? 0.5 : 0.2;
      this._quality = complexity === 'HIGH' ? 1.0 : complexity === 'MEDIUM' ? 0.7 : 0.4;
    },
    on_event(kind, value, ts) { /* noop */ },
    frame(now) { return this.mood_score(); }
  };
}

// Bootstrapping function that tries to load the wasm module and sets up a simple scene
export async function bootstrapYouWorldAR(youWorldSdk) {
  // Minimal three.js-like initialization if Three.js isn't available
  let THREE = null;
  try {
    // prefer CDN-free import if project bundles ThreeJS
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.152.0/build/three.module.js');
  } catch (err) {
    // If CI doesn't allow remote imports, the demo will fallback to a minimal object structure
    console.warn("Failed to import Three.js from CDN; demo may be limited.", err);
  }

  const canvas = document.getElementById('youworld-ar-canvas');
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (canvas) {
    canvas.width = width;
    canvas.height = height;
  }

  let cityMoodApp = null;
  try {
    // Try to load wasm-bindgen generated module
    const mod = await import('/apps/city-mood-visualizer/pkg/city_mood_visualizer.js');
    await mod.default();
    cityMoodApp = new mod.CityMoodApp();
    cityMoodApp.init();
  } catch (err) {
    console.debug('WASM module not found; falling back to JS stub for CityMoodApp.', err);
    cityMoodApp = createJsCityMoodStub();
  }

  // Create a minimal scene if we have Three.js
  let scene = null;
  if (THREE && typeof THREE.Scene === 'function') {
    scene = new THREE.Scene();
    // add some meshes: hero + low priority + in-between
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const hero = new THREE.Mesh(geometry, material);
    hero.userData.hero = true;
    hero.userData.priority = 'high';
    hero.position.set(0, 0, -2);
    scene.add(hero);
    const low = new THREE.Mesh(geometry, material);
    low.userData.priority = 'low';
    low.position.set(1.5, 0, -3);
    scene.add(low);
    const mid = new THREE.Mesh(geometry, material);
    mid.userData.priority = 'medium';
    mid.position.set(-1.2, 0, -2.5);
    scene.add(mid);
  }

  // Create and apply a synthetic parcel and route it to the scene every 3 seconds
  const sampleParcel = {
    labels: {
      completion_ratio: '0.78',
      engagement_score: '0.61',
      ar_complexity_budget: 'MEDIUM',
      device_lane: 'DESKTOP_HD',
      bandwidth_bracket: 'MEDIUM',
      qoe_score: '0.72',
      quality_bracket: 'HD',
      device_cohort: 'DESKTOP_PRO',
      rebuffer_burst: '0'
    }
  };

  function applyParcel(parcel) {
    const labels = parcel && parcel.labels ? parcel.labels : {};
    const completion = parseFloat(labels.completion_ratio || '0');
    const engagementScore = parseFloat(labels.engagement_score || '0');
    const complexity = labels.ar_complexity_budget || 'MEDIUM';
    if (cityMoodApp && typeof cityMoodApp.set_derived === 'function') {
      cityMoodApp.set_derived(completion, engagementScore, complexity, Date.now());
    }
    if (scene) {
      applyArComplexityToScene(scene, complexity);
      updateSceneFromCityMood(scene, cityMoodApp, parcel);
    }
  }

  // Apply initial parcel
  applyParcel(sampleParcel);
  // Periodically update with a randomized parcel change to show dynamics
  setInterval(() => {
    // emulate small changes to engagement and complexity
    const e = 0.3 + Math.random() * 0.7;
    const c = Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.5 ? 'MEDIUM' : 'LOW';
    sampleParcel.labels.engagement_score = e.toFixed(3);
    sampleParcel.labels.ar_complexity_budget = c;
    sampleParcel.labels.completion_ratio = (0.2 + Math.random() * 0.8).toFixed(3);
    sampleParcel.labels.qoe_score = (0.5 + Math.random() * 0.5).toFixed(3);
    applyParcel(sampleParcel);
  }, 3000);

  // If the SDK needs a hook, call registerScene
  if (youWorldSdk && typeof youWorldSdk.registerScene === 'function') {
    youWorldSdk.registerScene({ sceneId: 'demo-city-block', timestamp: Date.now() });
  }

  return { scene, cityMoodApp };
}
