package overlay

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleWT_NotWebTransport(t *testing.T) {
	s := NewServer(":0")
	req := httptest.NewRequest(http.MethodGet, "/overlay/wt", nil)
	w := httptest.NewRecorder()

	s.handleWT(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusNotImplemented {
		t.Fatalf("expected 400 or 501 when not upgrading to webtransport, got %d", resp.StatusCode)
	}
}
