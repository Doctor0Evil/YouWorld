//go:build protogen
// +build protogen

package overlay

import (
    "testing"
)

func TestNewDefaultMarshaller_IsProto(t *testing.T) {
    m := NewDefaultMarshaller()
    if _, ok := m.(*ProtoBatchMarshaller); !ok {
        t.Fatalf("expected ProtoBatchMarshaller as default when protogen enabled; got %T", m)
    }
}
