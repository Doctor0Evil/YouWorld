package overlay

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"time"
)

// GenerateSelfSignedCert writes a self-signed certificate and private key to the provided file paths.
func GenerateSelfSignedCert(certPath, keyPath, host string) error {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil { return err }

	now := time.Now()
	serial, err := rand.Int(rand.Reader, big.NewInt(1<<62))
	if err != nil { return err }

	tmpl := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{CommonName: host},
		NotBefore: now.Add(-time.Hour),
		NotAfter: now.Add(24 * time.Hour),
		KeyUsage: x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &tmpl, &tmpl, &priv.PublicKey, priv)
	if err != nil { return err }

	certOut, err := os.Create(certPath)
	if err != nil { return err }
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil { return err }

	keyBytes, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil { return err }
	keyOut, err := os.Create(keyPath)
	if err != nil { return err }
	defer keyOut.Close()
	if err := pem.Encode(keyOut, &pem.Block{Type: "PRIVATE KEY", Bytes: keyBytes}); err != nil { return err }
	return nil
}
