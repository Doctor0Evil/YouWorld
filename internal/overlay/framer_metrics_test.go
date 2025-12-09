package overlay

import (
    "testing"
    "time"
)

func TestSetMarshallerMetricsSink_JSON(t *testing.T) {
    var called bool
    SetMarshallerMetricsSink(func(kind string, dur time.Duration) {
        called = true
        if kind != "json" {
            t.Fatalf("expected kind json, got %s", kind)
        }
        if dur <= 0 {
            t.Fatalf("expected positive duration, got %v", dur)
        }
    })
    defer SetMarshallerMetricsSink(nil)

    now := uint64(time.Now().UnixNano() / int64(time.Millisecond))
    events := []OverlayEvent{{StreamID: "s1", EventID: "e1", PresentationTsMs: now + 1, Sequence: 1, SchemaVersion: "overlay-1.0.0"}}
    _, err := FrameBatch(events, NewDefaultValidator(), &JSONBatchMarshaller{})
    if err != nil {
        t.Fatalf("framebatch json failed: %v", err)
    }
    if !called { t.Fatalf("metrics sink not called for JSON marshaller") }
}
