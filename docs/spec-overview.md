# YouWorld Overlay & Playlist Transport Spec

This document summarizes the transport and schema choices used by the overlay and playlist features of YouWorld.

* Wire/frame: 1 byte wire version header followed by a binary Protobuf/FlatBuffers payload.
* Protobuf messages: `OverlayEvent`, `OverlayEventBatch`, `ClientHello`, `ServerWelcome`.
* Ordering: presentation_ts_ms ascending, priority desc, sequence asc. Buffer window: 250ms; lateness threshold: 200ms.
* Versioning: Two-tier (wire_version: enum, schema_version: string). Server downgrades or sends CONFIG_UPDATE as needed.
* Transport: WebTransport (HTTP/3/QUIC) recommended. WebSocket (TLS) fallback.
* Serialization: Protobuf preferred for owned endpoints; MessagePack/CBOR for heterogenous environments.

For full details and protocols, see `proto/overlay.proto` and `proto/playlist.proto`.
