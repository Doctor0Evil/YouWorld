package overlay

import (
	"errors"
	"regexp"
	"time"
)

var (
	ErrMissingStreamID = errors.New("missing stream_id")
	ErrMissingEventID = errors.New("missing event_id")
	ErrMissingSchema = errors.New("missing schema_version")
	ErrPresentationTs = errors.New("presentation_ts_ms must be > 0")
	ErrInvalidPayloadRef = errors.New("invalid payload_ref")
)

// ALNValidator encapsulates ALN policy constraints used for validation
type ALNValidator struct {
	MinPresentationLeadMs uint64 // minimum lead time between now and presentation ts
	MinSchemaVersion string
	PayloadRefPattern *regexp.Regexp
}

// NewDefaultValidator returns a validator with reasonable defaults for tests
func NewDefaultValidator() *ALNValidator {
	return &ALNValidator{
		MinPresentationLeadMs: 0, // allow immediate
		MinSchemaVersion: "overlay-1.0.0",
		PayloadRefPattern: regexp.MustCompile(`^[a-zA-Z0-9_:\-\/\.]+$`),
	}
}

// ValidateEvent applies schema and basic policy checks on a single event
func (v *ALNValidator) ValidateEvent(e *OverlayEvent) error {
	if e.StreamID == "" { return ErrMissingStreamID }
	if e.EventID == "" { return ErrMissingEventID }
	if e.SchemaVersion == "" { return ErrMissingSchema }
	if e.PresentationTsMs == 0 { return ErrPresentationTs }
	if e.PayloadRef != "" && !v.PayloadRefPattern.MatchString(e.PayloadRef) { return ErrInvalidPayloadRef }

	// check presentation lead time only if specified
	if v.MinPresentationLeadMs > 0 {
		nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
		if e.PresentationTsMs < nowMs - v.MinPresentationLeadMs {
			// If presentation is in the remote past beyond the allowed window, reject
			return errors.New("presentation timestamp too far in the past")
		}
	}

	return nil
}

// ValidateBatch validates each event and returns an error if any event fails validation
func (v *ALNValidator) ValidateBatch(events []OverlayEvent) error {
	for i := range events {
		e := &events[i]
		if err := v.ValidateEvent(e); err != nil {
			return err
		}
	}
	return nil
}
