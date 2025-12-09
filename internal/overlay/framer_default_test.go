package overlay

import (
    "testing"
)

func TestNewDefaultMarshaller_IsJSON(t *testing.T) {
    m := NewDefaultMarshaller()
    if _, ok := m.(*JSONBatchMarshaller); !ok {
        t.Fatalf("expected JSONBatchMarshaller as default when protogen not enabled; got %T", m)
    }
}
