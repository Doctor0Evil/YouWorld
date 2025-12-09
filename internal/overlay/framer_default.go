//go:build !protogen
// +build !protogen

package overlay

// Default JSON marshaller when not building with protogen tag
func NewDefaultMarshaller() BatchMarshaller {
    return &JSONBatchMarshaller{}
}
