package overlay

import "encoding/json"

func MarshalEventArray(events []OverlayEvent) ([]byte, error) {
	return json.Marshal(events)
}
