package main

import (
	"github.com/Doctor0Evil/YouWorld/internal/overlay"
)

// generateSelfSignedCert delegates to internal overlay package's helper.
func generateSelfSignedCert(certPath, keyPath, host string) error {
	return overlay.GenerateSelfSignedCert(certPath, keyPath, host)
}
