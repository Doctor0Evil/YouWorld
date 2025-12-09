//go:build protogen
// +build protogen

package overlay

import (
    "testing"
    "time"

    "google.golang.org/protobuf/proto"
    pb "github.com/Doctor0Evil/YouWorld/gen/overlaypb"
)

func TestFrameBatch_ProtoFraming(t *testing.T) {
    v := NewDefaultValidator()
    nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
    events := []OverlayEvent{{StreamID: "s1", EventID: "e1", PresentationTsMs: nowMs + 100, Sequence: 1, SchemaVersion: "overlay-1.0.0", OverlayType: "text"}}

    frame, err := FrameBatch(events, v, &ProtoBatchMarshaller{})
    if err != nil { t.Fatalf("proto frame error: %v", err) }
    if len(frame) < 2 { t.Fatalf("frame too small: %d", len(frame)) }
    if frame[0] != WireVersionV1 { t.Fatalf("expected header 0x01, got 0x%02x", frame[0]) }
    var b pb.OverlayEventBatch
    if err := proto.Unmarshal(frame[1:], &b); err != nil { t.Fatalf("proto unmarshal error: %v", err) }
    if b.StreamId != "s1" { t.Fatalf("expected stream s1, got %s", b.StreamId) }
    if len(b.Events) != 1 || b.Events[0].EventId != "e1" { t.Fatalf("unexpected payload content: %v", b) }
}
