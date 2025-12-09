package overlay

// OverlayEvent is a local representation of an overlay event for internal logic and tests
// This mirrors the core fields from proto/overlay.proto but doesn't depend on generated stubs yet
// so unit tests and local server code can run without code generation.

type Priority int32

const (
	PriorityUnspecified Priority = 0
	PriorityLow Priority = 1
	PriorityNormal Priority = 2
	PriorityHigh Priority = 3
	PriorityCritical Priority = 4
)

type OverlayEvent struct {
	StreamID           string
	EventID            string
	EventTsMs          uint64
	PresentationTsMs   uint64
	Sequence           uint64
	Priority           Priority
	OverlayType        string
	Payload            []byte
	PayloadRef         string
	SchemaVersion      string
}
