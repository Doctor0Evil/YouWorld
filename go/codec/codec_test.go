//go:build protogen
// +build protogen

package codec

import (
	"testing"
	overlaypb "github.com/Doctor0Evil/YouWorld/gen/overlaypb"
)

func sampleBatch() *overlaypb.OverlayEventBatch {
	return &overlaypb.OverlayEventBatch{
		StreamId: "test-stream",
		Events: []*overlaypb.OverlayEvent{
			{
				StreamId: "test-stream",
				EventId:  "e1",
				EventTsMs: 1,
				PresentationTsMs: 1000,
				Sequence: 1,
			},
		},
	}
}

func TestOverlayBatchToCBOR(t *testing.T) {
	_, err := OverlayBatchToCBOR(sampleBatch())
	if err != nil {
		t.Fatalf("OverlayBatchToCBOR failed: %v", err)
	}
}

func TestOverlayBatchToMsgPack(t *testing.T) {
	_, err := OverlayBatchToMsgPack(sampleBatch())
	if err != nil {
		t.Fatalf("OverlayBatchToMsgPack failed: %v", err)
	}
}
