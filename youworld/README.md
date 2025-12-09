# YouWorld Developer Resources

This folder contains developer resources for YouWorld: schema definitions, wasm example apps, ingestion functions, WebXR examples, and API docs.

- `stack/schemas/YouWorldAttentionParcel.aln.json` — ALN-compatible schema for AttentionParcel events.
- `apps/city-mood-visualizer/` — minimal Rust WASM example that exposes `CityMoodApp` to the JS host.
- `services/ingest/youtube-debug-to-parcel.aln.ts` — TypeScript ingest conversion function from YouTube debug payload to `YouWorld.AttentionParcel`.
- `examples/webxr/` — WebXR and Three.js examples showing how to register a scene and use hit-test / reticle flow.
- `api/youworld-openapi.yaml` — OpenAPI definition for common REST endpoints.
- `docs/sdk-hosting.md` — Guidance for hosting SDKs and publishing checksums/signatures.

Compile & test notes:
- Rust/wasm build for app:
  1) `rustup target add wasm32-unknown-unknown`
  2) `cargo build --target wasm32-unknown-unknown` or use `wasm-pack build --target web`
- TypeScript/ingest function can be used as a simple library; add `tsconfig.json` and `npm` tooling if you want to build and test.

These resources are a starting point for integration and can be adapted to your runtime and SDK distribution patterns. See `docs/sdk-hosting.md` for secure artifact hosting and signing guidance.

Advanced derived signals & AR wiring
- `deriveYouWorldSignals(debugPayload, watchSeconds, volumeLevel, isMuted)` computes:
  - `completion_ratio` — normalized watch completion (0..1).
  - `engagement_score` — normalized engagement combining completion and audible volume.
  - `device_lane` — one of `DESKTOP_HD`, `MOBILE`, `TV`, `LOWPOWER`, `UNKNOWN`.
  - `bandwidth_bracket` — `LOW`, `MEDIUM`, or `HIGH` based on `lbw`.
  - `ar_complexity_budget` — `LOW`/`MEDIUM`/`HIGH` derived conservatively from bandwidth and device.

WebXR & WASM integration:
- Apply `ar_complexity_budget` to Three.js scenes using `applyArComplexityToScene(scene, budget)` to scale visual density.
- Use `applyParcelToCityMood(cityMoodApp, parcel)` or call `cityMoodApp.set_derived(completion, engagement, complexity, timestamp)` to drive the CityMoodApp WASM widget.
 - Use `applyParcelToCityMood(cityMoodApp, parcel)` or call `cityMoodApp.set_derived(completion, engagement, complexity, timestamp)` to drive the CityMoodApp WASM widget.
 - For an end-to-end demo: call `applyParcelToCityMoodAndScene(cityMoodApp, parcel, scene)` to update WASM state and the Three.js scene in one call.
 - Use `updateSceneFromCityMood(scene, cityMoodApp, parcel)` to map mood/quality/load into visual tweaks such as color, visibility and hero emphasis.

Extra QoE / cohort signals:
- `quality_bracket` — `SD`/`HD`/`UHD` classification to estimate device rendering capability.
- `device_cohort` — `DESKTOP_PRO`/`DESKTOP_LITE`/`MOBILE_HIGH`/`MOBILE_LOW`/`TV`/`OTHER` used to route content variants.
- `qoe_score` — computed quality-of-experience score (0..1) for display and routing.
- `rebuffer_burst` — boolean flag indicating recent rebuffer bursts and guiding QoE decisions.

Local WebXR demo (quick start):

- Serve the `examples/webxr/public` directory from any static file server. For example:

  - Using Python 3: `python -m http.server --directory examples/webxr/public 8080`
  - Using Node: `npx http-server examples/webxr/public -p 8080`

- Open `http://localhost:8080` in a browser that supports WebXR (Chrome/Edge with flags enabled or WebXR DevTools). The demo will attempt to load the WASM `city-mood-visualizer` if `apps/city-mood-visualizer/pkg` is present; otherwise a JS fallback is used.

- Click "Start YouWorld AR" and then "Apply Random Parcel" to exercise the demo: the scene will update color/visibility based on the derived metrics, and the mood score will update in the top control bar.

Future improvements:
- Add a small TS-driven test harness to replay example parcels and assert scene changes (visibility/scale) using an offscreen Three.js renderer.


