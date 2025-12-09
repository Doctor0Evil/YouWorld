package overlay

import (
	"encoding/json"
	"fmt"
	"time"
)

const WireVersionV1 byte = 0x01

// BatchMarshaller converts local OverlayEvent batches into a wire payload bytes
// default implementation uses JSON (fallback); when Protobuf stubs are generated, replace with Protobuf marshaller.

type BatchMarshaller interface {
	Marshal(events []OverlayEvent) ([]byte, error)
}

// JSONBatchMarshaller is a simple JSON serializer with the wire header
type JSONBatchMarshaller struct{}

func (m *JSONBatchMarshaller) Marshal(events []OverlayEvent) ([]byte, error) {
	start := time.Now()
	b, err := json.Marshal(events)
	if err != nil { return nil, err }
	frame := make([]byte, 1+len(b))
	frame[0] = WireVersionV1
	copy(frame[1:], b)
	if metricsSink != nil {
		metricsSink("json", time.Since(start))
	}
	return frame, nil
}

// Default marshaller constructor is provided in a build-tagged file to allow
// switching to a ProtoBatchMarshaller when the 'protogen' build tag is enabled.

// NOTE: ProtoBatchMarshaller is implemented in 'framer_protogen.go' and enabled
// via the build tag 'protogen'. The default marshaller here is JSON and is
// used when the protogen tag or generated stubs are not available.

// FrameBatch: validates using provided validator, then marshals
func FrameBatch(events []OverlayEvent, validator *ALNValidator, marshaller BatchMarshaller) ([]byte, error) {
	if validator != nil {
		if err := validator.ValidateBatch(events); err != nil {
			return nil, fmt.Errorf("validation failed: %w", err)
		}
	}
	if marshaller == nil {
		marshaller = NewDefaultMarshaller()
	}
	return marshaller.Marshal(events)
}

// Metrics sink for marshalling operations. Allows debug logging or hooking to Prometheus/OTEL.
var metricsSink func(kind string, dur time.Duration)

// SetMarshallerMetricsSink sets a callback to receive marshaller metrics (kind: json|proto, duration)
func SetMarshallerMetricsSink(f func(kind string, dur time.Duration)) {
	metricsSink = f
}
