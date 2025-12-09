//go:build protogen
// +build protogen

package main

import (
  "context"
  "crypto/tls"
  "log"
  "time"

  overlaypb "github.com/Doctor0Evil/YouWorld/gen/overlaypb"
  "google.golang.org/protobuf/proto"

  webtransport "github.com/quic-go/webtransport-go"
)

func main() {
  ctx := context.Background()

  dialer := webtransport.Dialer{
    TLSClientConfig: &tls.Config{
      InsecureSkipVerify: true,
    },
  }

  session, err := dialer.Dial(ctx, "https://overlay.example.com/v1/wt", nil)
  if err != nil {
    log.Fatal(err)
  }
  defer session.CloseWithError(0, "bye")

  stream, err := session.OpenStreamSync(ctx)
  if err != nil {
    log.Fatal(err)
  }
  defer stream.Close()

  hello := &overlaypb.ClientHello{
    WireVersion: overlaypb.WireVersion_WIRE_VERSION_V1,
    SupportedCodecs: []overlaypb.Codec{overlaypb.Codec_CODEC_PROTOBUF},
    SupportedOverlaySchemas: []string{"overlay-1.0.0"},
    SupportedPlaylistSchemas: []string{"playlist-1.0.0"},
    ClientId: "go-webtransport-client",
    SessionId: "demo-session",
    UserAgent: "youworld-go-webtransport-demo",
  }

  payload, err := proto.Marshal(hello)
  if err != nil {
    log.Fatal(err)
  }

  frame := append([]byte{0x01}, payload...)
  if _, err := stream.Write(frame); err != nil {
    log.Fatal(err)
  }

  buf := make([]byte, 65536)
  n, err := stream.Read(buf)
  if err != nil {
    log.Fatal(err)
  }

  log.Printf("received %d bytes from server", n)

  time.Sleep(1 * time.Second)
}
