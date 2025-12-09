//go:build protogen
// +build protogen

package codec

import (
	"encoding/json"

	"github.com/fxamacker/cbor/v2"
	"github.com/vmihailenco/msgpack/v5"
	overlaypb "github.com/Doctor0Evil/YouWorld/gen/overlaypb"
	"google.golang.org/protobuf/encoding/protojson"
)

// OverlayBatchToCBOR converts a protobuf OverlayEventBatch to CBOR.
func OverlayBatchToCBOR(batch *overlaypb.OverlayEventBatch) ([]byte, error) {
	js, err := protojson.Marshal(batch)
	if err != nil {
		return nil, err
	}
	var m map[string]interface{}
	if err := json.Unmarshal(js, &m); err != nil {
		return nil, err
	}
	return cbor.Marshal(m)
}

// OverlayBatchToMsgPack converts a protobuf OverlayEventBatch to MessagePack.
func OverlayBatchToMsgPack(batch *overlaypb.OverlayEventBatch) ([]byte, error) {
	js, err := protojson.Marshal(batch)
	if err != nil {
		return nil, err
	}
	var m map[string]interface{}
	if err := json.Unmarshal(js, &m); err != nil {
		return nil, err
	}
	return msgpack.Marshal(m)
}
