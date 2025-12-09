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
