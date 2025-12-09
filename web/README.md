# YouWorld Overlay Demo

This demo shows a minimal WebSocket-based overlay client that receives `OverlayEventBatch` messages (Protobuf) and renders simple overlay bubbles.

Requirements
- Generated JS Protobuf stubs for `youworld.overlay` (from `proto/overlay.proto`).
- A WebSocket overlay server endpoint that speaks the one-byte wire version + Protobuf message frames (see spec).

Build & Run
1. Generate JS stubs (protoc / plugin for js/ts) and bundle `overlay_client.js` and Protobuf stubs into `overlay_bundle.js`.
2. Serve `web/index.html` via a local HTTP server.

Notes
- The demo uses a 250ms buffer and drops events older than a 200ms lateness threshold to keep overlays consistent.
- For production, use WebTransport where possible and secure the WebSocket endpoint with TLS, token auth, and QUIC for low latency.
