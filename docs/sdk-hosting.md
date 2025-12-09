# YouWorld SDK Hosting and Verification

This document provides best-practice steps for hosting YouWorld SDK binaries (Windows/macOS/Linux), publishing checksums and signatures, and distributing them securely.

## 1) Platforms & Packaging
- Provide platform-specific archives: `youworld-sdk-win64.zip`, `youworld-sdk-macos.tar.gz`, `youworld-sdk-linux.tar.gz`.
- Use semantic versioned folder paths: `/sdk/<semver>/...` and a `latest.json` for discovery.

## 2) Hosting recommendations
- Use an HTTPS-only object store (S3, GCS, Azure Blob) with a CDN in front of it.
- Version artifacts per path and use long cache TTLs for immutable files to avoid re-downloads.
- Use the GitHub Releases section or object-store signed URLs for direct downloads.

## 3) Checksums & signing
1. Generate SHA256 sums on your CI runner:

```bash
sha256sum youworld-sdk-win64.zip > CHECKSUMS.txt
sha256sum youworld-sdk-macos.tar.gz >> CHECKSUMS.txt
sha256sum youworld-sdk-linux.tar.gz >> CHECKSUMS.txt
```

2. Create a detached signature for `CHECKSUMS.txt` using an OpenPGP key:

```bash
gpg --output CHECKSUMS.txt.sig --detach-sign CHECKSUMS.txt
```

3. Publish the artifacts and the signed checksum file next to the SDK artifacts.

## 4) Verification (developer-side)
1. Download `CHECKSUMS.txt` and `CHECKSUMS.txt.sig` and import the project public key:

```bash
# Import the public key once
gpg --import youworld-pubkey.asc

# Verify the signature
gpg --verify CHECKSUMS.txt.sig CHECKSUMS.txt

# Verify downloaded artifact
sha256sum -c CHECKSUMS.txt
```

## 5) Signing installers (Windows)
- Use a code-signing certificate (EV code-signing) and `osslsigncode` or Microsoft signtool to sign the executable.
- Include signature metadata and the signer identity in the release notes.

## 6) CI integration
- Add CI steps that build artifacts, compute checksums, sign `CHECKSUMS.txt`, and publish to bucket/release.
- Store the signer key in a secure secrets manager and protect the signing step.

## 7) Distribution & Security
- Rotate keys periodically and publish revocation instructions.
- Provide minimal verification commands in README for each OS to ensure a proper install.

## 8) Example README snippet
```
# Verify the YouWorld SDK download
wget https://downloads.youworld.example.com/sdk/1.2.3/youworld-sdk-win64.zip
wget https://downloads.youworld.example.com/sdk/1.2.3/CHECKSUMS.txt
wget https://downloads.youworld.example.com/sdk/1.2.3/CHECKSUMS.txt.sig

# Import public key and verify
gpg --import youworld-pubkey.asc
gpg --verify CHECKSUMS.txt.sig CHECKSUMS.txt
sha256sum -c CHECKSUMS.txt
```

Follow this process for each release. This ensures distributed artifacts are verifiable and tamper-resistant.