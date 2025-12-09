# Protobuf schemas for YouWorld

This folder contains the definitions for overlays and playlists used by the YouWorld overlay and playlist infrastructure.

Files:
- `overlay.proto` - definitions for OverlayEvent, OverlayEventBatch, ClientHello, ServerWelcome, ConfigUpdate, ControlFrame.
- `playlist.proto` - definitions for PlaylistItem and PlaylistCommand used by AI-chat connectors and playlist management.

Generating stubs
- Example PowerShell script at scripts/generate_stubs.ps1.
- To generate Go stubs using protoc (Windows PowerShell):

```powershell
protoc --proto_path=proto --go_out=gen --go_opt=paths=source_relative --go-grpc_out=gen --go-grpc_opt=paths=source_relative proto/overlay.proto proto/playlist.proto
```

- To generate JS stubs for the demo (commonjs binary):

```powershell
protoc --proto_path=proto --js_out=import_style=commonjs,binary:web/js proto/overlay.proto proto/playlist.proto
```

Note: The demo bundles JS stubs into `web/overlay_bundle.js` via your bundler (webpack, parcel, esbuild). The example script `scripts/generate_stubs.ps1` stitches the commands shown above.

Build and test notes:
- Some Go files and tests that rely on the generated code are guarded with the `protogen` build tag. To run those tests or build the demo that relies on generated stubs, run `go build` or `go test` with the `-tags protogen` flag and ensure `scripts/generate_stubs.ps1` has been executed (or `make gen-stubs`).
