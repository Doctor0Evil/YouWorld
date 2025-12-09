package overlay

import (
	"testing"
	"time"
)

func TestOverlayOrdering(t *testing.T) {
	b := NewBuffer()
	// Create events with same presentation but different priority and sequence
	e1 := OverlayEvent{EventID: "e1", PresentationTsMs: 1000, Priority: PriorityNormal, Sequence: 5}
	e2 := OverlayEvent{EventID: "e2", PresentationTsMs: 1000, Priority: PriorityHigh, Sequence: 2}
	e3 := OverlayEvent{EventID: "e3", PresentationTsMs: 1000, Priority: PriorityHigh, Sequence: 10}
	e4 := OverlayEvent{EventID: "e4", PresentationTsMs: 500, Priority: PriorityNormal, Sequence: 1}

	b.Add(e1)
	b.Add(e2)
	b.Add(e3)
	b.Add(e4)

	// Expect ordering: e4 (500), then e2 (1000, high, seq 2), then e3 (1000, high, seq 10), then e1
	orderIDs := []string{"e4", "e2", "e3", "e1"}
	b.reorder()
	if b.Len() != 4 { t.Fatalf("expected buffer len 4 got %d", b.Len()) }
	for i, e := range b.events {
		if e.EventID != orderIDs[i] {
			t.Fatalf("expected event %s at pos %d, got %s", orderIDs[i], i, e.EventID)
		}
	}
}

func TestOverlayBufferLatency(t *testing.T) {
	b := NewBuffer()
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	// Add events: one in the past (too late), one ready within buffer, one in future beyond buffer
	past := OverlayEvent{EventID: "past", PresentationTsMs: nowMs - 500}
	ready := OverlayEvent{EventID: "ready", PresentationTsMs: nowMs + 100}
	future := OverlayEvent{EventID: "future", PresentationTsMs: nowMs + 2000}

	b.Add(past)
	b.Add(ready)
	b.Add(future)

	// bufferWindow 250ms, lateness 200ms
	results := b.PopReady(nowMs, 250, 200)
	if len(results) != 1 {
		t.Fatalf("expected 1 ready event, got %d", len(results))
	}
	if results[0].EventID != "ready" {
		t.Fatalf("expected ready event, got %s", results[0].EventID)
	}
	if b.Len() != 1 {
		t.Fatalf("expected 1 remaining event (future), got %d", b.Len())
	}
}
