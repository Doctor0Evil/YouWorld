# YouWorld
YouWorld is an entertainment-focused, next-generation, augmented-city stack for development, deployment of web-apps, and embeddable entertainment-functions that can be used for free, by anybody, anywhere. YouWorld is a blockchain/WASM-forward centric application for entertainment purposes.

This repository includes:
- Schema definitions (protobuf + flatbuffers) for overlay events and playlists.
- A minimal browser overlay demo that renders incoming overlay events.
- A Go WebTransport demo client showing the HELLO/WELCOME negotiation.
- Conversion utilities for Protobuf -> CBOR / MessagePack.

 See `proto/`, `schema/`, `web/`, and `go/` for sources and examples.

Build and testing notes:
Some files and tests that rely on generated Protobuf types are gated behind the `protogen` build tag. To enable protobuf-based marshalling and run the associated unit and e2e tests, run `make gen-stubs` and then run tests with the `protogen` build tag:

```
scripts\generate_stubs.ps1
go test ./... -tags protogen
```

The CI script already runs `make gen-stubs` and `make test-protogen` to validate protogen-specific paths.

YouWorld developer resources are in `youworld/` subfolder. It includes schema, wasm example, ingestion service, WebXR examples, and OpenAPI spec for the REST endpoints. See `youworld/README.md` for details.

Local overlay server demo:
- `cmd/overlay-server` contains an example WebSocket overlay server (used by the demo client in `web/`).
- `internal/overlay` contains buffer logic and unit tests for ordering/latency behavior.
- Run the demo server with `go run ./cmd/overlay-server -addr :8080` and open `http://localhost:8080` after generating the JS bundle.

YouWorld dev loop
- `./scripts/verify-youworld.sh`
- `cd apps/city-mood-visualizer && cargo build --target wasm32-unknown-unknown`
- `npx swagger-cli validate api/youworld-openapi.yaml # if Node toolchain is available`
