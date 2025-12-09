package overlay

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	wt "github.com/quic-go/webtransport-go"
	"encoding/json"
	"io"
	"bytes"
)

// Simple overlay server that accepts websocket connections and broadcasts OverlayEventBatch to clients

type Server struct {
	addr string
	upgrader websocket.Upgrader
	clients map[*websocket.Conn]struct{}
	mu sync.Mutex
	buffer *Buffer
	closeCh chan struct{}
	wtServer *wt.Server
}

func NewServer(addr string) *Server {
	return &Server{
		addr: addr,
		upgrader: websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }},
		clients: make(map[*websocket.Conn]struct{}),
		buffer: NewBuffer(),
		closeCh: make(chan struct{}),
		wtServer: &wt.Server{},
	}
}

func (s *Server) Run() error {
	// default to a plain HTTP server for WS only
	mux := http.NewServeMux()
	mux.HandleFunc("/overlay/ws", s.handleWS)
	mux.HandleFunc("/overlay/wt", s.handleWT)
	srv := &http.Server{Addr: s.addr, Handler: mux}
	log.Printf("overlay server starting on %s", s.addr)
	go s.broadcastLoop()
	return srv.ListenAndServe()
}

// RunWebTransport runs a WebTransport HTTP/3 server with provided TLS cert and key
func (s *Server) RunWebTransport(certFile, keyFile string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/overlay/ws", s.handleWS)
	mux.HandleFunc("/overlay/wt", s.handleWT)
	// TLS config is provided via ListenAndServeTLS
	wtSrv := wt.Server{H3: http3.Server{Addr: s.addr, Handler: mux}}
	log.Printf("overlay webtransport server starting on %s (http3)", s.addr)
	go s.broadcastLoop()
	return wtSrv.ListenAndServeTLS(certFile, keyFile)
}

func (s *Server) Stop(ctx context.Context) error {
	close(s.closeCh)
	return nil
}

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	c, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}
	defer c.Close()

	s.mu.Lock()
	s.clients[c] = struct{}{}
	s.mu.Unlock()

	// Simple read loop to accept JSON messages representing overlay events (for demo)
	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}
		// Try to unmarshal JSON array of events
		var events []OverlayEvent
		if err := json.Unmarshal(msg, &events); err != nil {
			// ignore or log invalid input
			log.Printf("invalid overlay json: %v", err)
			continue
		}
		// Validate and frame
		frame, err := FrameBatch(events, NewDefaultValidator(), NewDefaultMarshaller())
		if err != nil {
			log.Printf("validation/frame error: %v", err)
			continue
		}
		// Enqueue: for demo we add to buffer rather than write direct
		// For now we directly add events to buffer; real server might store the framed bytes
		for _, e := range events { s.buffer.Add(e) }
		// Also broadcast the framed bytes (for simple clients expecting framed message), but our WS demo expects JSON array
		// For now we broadcast the JSON to keep the web demo working
		// TODO: change to broadcast framed bytes for Protobuf clients
	}

	s.mu.Lock()
	delete(s.clients, c)
	s.mu.Unlock()
}

func (s *Server) broadcastLoop() {
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// simulate broadcasting ready events
			nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
				ready := s.buffer.PopReady(nowMs, 250, 200)
				if len(ready) == 0 { continue }
				// Build framed payload (validation already done) and broadcast
				frame, _ := FrameBatch(ready, NewDefaultValidator(), NewDefaultMarshaller())
				s.broadcast(ready)
				s.broadcastFrame(frame)
		case <-s.closeCh:
			return
		}
	}
}

func (s *Server) broadcast(events []OverlayEvent) {
	s.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(s.clients))
	for c := range s.clients { conns = append(conns, c) }
	s.mu.Unlock()

	for _, c := range conns {
		err := c.WriteJSON(events)
		if err != nil {
			fmt.Printf("client write error: %v", err)
			// drop client silently
			s.mu.Lock()
			delete(s.clients, c)
			s.mu.Unlock()
			c.Close()
		}
	}
}

// broadcastFrame writes a binary framed payload to websocket clients
func (s *Server) broadcastFrame(frame []byte) {
	s.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(s.clients))
	for c := range s.clients { conns = append(conns, c) }
	s.mu.Unlock()
	for _, c := range conns {
		if err := c.WriteMessage(websocket.BinaryMessage, frame); err != nil {
			log.Printf("client write binary error: %v", err)
			s.mu.Lock()
			delete(s.clients, c)
			s.mu.Unlock()
			c.Close()
		}
	}
}

// minimal WebTransport handler — upgrades and opens a uni-stream and writes JSON ticks
func (s *Server) handleWT(w http.ResponseWriter, r *http.Request) {
	sess, err := wt.Accept(w, r)
	if err != nil {
		// Not a WebTransport session or unsupported
		http.Error(w, "upgrade to webtransport failed", http.StatusBadRequest)
		return
	}
	go func() {
		ctx := context.Background()
		stream, err := sess.OpenUniStream(ctx)
		if err != nil {
			log.Printf("open uni stream failed: %v", err)
			return
		}
		defer stream.Close()

		// Simple write loop: serialize framed bytes and write to uni stream
		ticker := time.NewTicker(50 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
				ready := s.buffer.PopReady(nowMs, 250, 200)
				if len(ready) == 0 { continue }
				// Frame the ready events
				frame, err := FrameBatch(ready, NewDefaultValidator(), NewDefaultMarshaller())
				if err != nil {
					log.Printf("framing error: %v", err)
					continue
				}
				// Write as raw framed bytes (1 byte header + payload)
				if _, err := stream.Write(frame); err != nil {
					log.Printf("webtransport write error: %v", err)
					return
				}
			case <-s.closeCh:
				return
			}
		}
	}()
	// Accept incoming client streams (client can send JSON batches) and validate
	go func() {
		ctx := context.Background()
		for {
			inStream, err := sess.AcceptStream(ctx)
			if err != nil {
				log.Printf("wt accept stream error: %v", err)
				return
			}
			go func(str io.ReadCloser) {
				defer str.Close()
				buf := new(bytes.Buffer)
				if _, err := io.Copy(buf, str); err != nil {
					log.Printf("read client wt stream err: %v", err)
					return
				}
				var events []OverlayEvent
				if err := json.Unmarshal(buf.Bytes(), &events); err != nil {
					log.Printf("invalid wt json: %v", err)
					return
				}
				if _, err := FrameBatch(events, NewDefaultValidator(), NewDefaultMarshaller()); err != nil {
					log.Printf("wt validation failed: %v", err)
					return
				}
				for _, e := range events { s.buffer.Add(e) }
			}(inStream)
		}
	}()
}
