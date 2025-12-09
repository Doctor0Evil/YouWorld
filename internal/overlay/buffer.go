package overlay

import (
	"sort"
)

// Buffer stores incoming OverlayEvents and provides ordering and readiness logic
// It is intentionally simple for testing and as a clear algorithm for integration.

type Buffer struct {
	events []OverlayEvent
}

func NewBuffer() *Buffer {
	return &Buffer{events: make([]OverlayEvent, 0, 128)}
}

// Add adds an event to the buffer
func (b *Buffer) Add(evt OverlayEvent) {
	b.events = append(b.events, evt)
}

// reorder sorts the buffer according to presentation_ts_ms, priority, sequence
func (b *Buffer) reorder() {
	sort.Slice(b.events, func(i, j int) bool {
		a := b.events[i]
		bEvent := b.events[j]
		if a.PresentationTsMs != bEvent.PresentationTsMs {
			return a.PresentationTsMs < bEvent.PresentationTsMs
		}
		if a.Priority != bEvent.Priority {
			return a.Priority > bEvent.Priority
		}
		return a.Sequence < bEvent.Sequence
	})
}

// PopReady returns and removes events that should be applied now given the current time
// tNowMs is the current wall clock (server) ms value; bufferWindowMs is how much ahead to schedule;
// latenessThresholdMs is used to drop events that have already expired in the past.
func (b *Buffer) PopReady(tNowMs uint64, bufferWindowMs uint64, latenessThresholdMs uint64) []OverlayEvent {
	b.reorder()
	ready := make([]OverlayEvent, 0)
	remaining := make([]OverlayEvent, 0, len(b.events))

	for _, evt := range b.events {
		if evt.PresentationTsMs < tNowMs-latenessThresholdMs {
			// drop too-late events entirely
			continue
		}
		if evt.PresentationTsMs <= tNowMs+bufferWindowMs {
			ready = append(ready, evt)
		} else {
			remaining = append(remaining, evt)
		}
	}
	b.events = remaining
	return ready
}

// Len returns the current buffered event count
func (b *Buffer) Len() int { return len(b.events) }
