# Overlay internal package

This package implements a minimal overlay buffer and a simple WebSocket-based overlay server used for local development and testing.

Files
- `types.go` - local OverlayEvent representation used in the buffer and server.
- `buffer.go` - Buffer implementation for ordered events, readiness checks, and dropping late events.
- `buffer_test.go` - unit tests for ordering and buffer readiness.
- `server.go` - simple WebSocket server that broadcasts ready events to connected clients.
- `ws_handler_test.go` - tests the WebSocket handler using posener/wstest.

Build/Run
- `go test ./...` to run unit tests.
- Run the server: `go run ./cmd/overlay-server -addr :8080`.

Note: The production overlay server should use the generated Protobuf types (gen/overlaypb) and implement proper wire framing with the 1-byte version header + Protobuf payload, plus authentication and policy controls. The current code is intentionally simple and avoids requiring generated stubs to run the buffer tests.
