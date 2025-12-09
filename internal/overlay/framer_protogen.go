//go:build protogen
// +build protogen

package overlay

import (
    "fmt"
    "strings"
    "time"

    "google.golang.org/protobuf/proto"
    pb "github.com/Doctor0Evil/YouWorld/gen/overlaypb"
)

// ProtoBatchMarshaller will use generated proto stubs; maps local types to proto messages
type ProtoBatchMarshaller struct{}

func (m *ProtoBatchMarshaller) Marshal(events []OverlayEvent) ([]byte, error) {
    start := time.Now()
    if len(events) == 0 { return nil, fmt.Errorf("empty batch") }
    // Build proto batch with identical StreamID (first event's stream used as batch key)
    batch := &pb.OverlayEventBatch{ StreamId: events[0].StreamID }
    batch.Events = make([]*pb.OverlayEvent, 0, len(events))
    for _, e := range events {
        pbEv := &pb.OverlayEvent{
            StreamId: e.StreamID,
            EventId: e.EventID,
            EventTsMs: e.EventTsMs,
            PresentationTsMs: e.PresentationTsMs,
            Sequence: e.Sequence,
            Priority: pb.Priority(e.Priority),
            Payload: e.Payload,
            PayloadRef: e.PayloadRef,
            SchemaVersion: e.SchemaVersion,
        }
        // Map overlay type string to proto OverlayType enum in a case-insensitive manner
        switch strings.ToLower(e.OverlayType) {
        case "text", "txt":
            pbEv.OverlayType = pb.OverlayType_OVERLAY_TYPE_TEXT
        case "reaction", "react":
            pbEv.OverlayType = pb.OverlayType_OVERLAY_TYPE_REACTION
        case "card", "cards":
            pbEv.OverlayType = pb.OverlayType_OVERLAY_TYPE_CARD
        case "system":
            pbEv.OverlayType = pb.OverlayType_OVERLAY_TYPE_SYSTEM
        default:
            pbEv.OverlayType = pb.OverlayType_OVERLAY_TYPE_UNSPECIFIED
        }
        batch.Events = append(batch.Events, pbEv)
    }
    b, err := proto.Marshal(batch)
    if err != nil { return nil, err }
    frame := make([]byte, 1+len(b))
    frame[0] = WireVersionV1
    copy(frame[1:], b)
    if metricsSink != nil {
        metricsSink("proto", time.Since(start))
    }
    return frame, nil
}

func NewDefaultMarshaller() BatchMarshaller {
    return &ProtoBatchMarshaller{}
}
