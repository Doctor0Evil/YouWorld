#!/usr/bin/env bash
set -euo pipefail

echo "[youworld] Verifying AttentionParcel schema JSON..."
if node -e "JSON.parse(require('fs').readFileSync('youworld/stack/schemas/YouWorldAttentionParcel.aln.json','utf8'))" 2>/dev/null; then
  echo "Schema JSON parsed OK"
else
  echo "Failed to parse youworld/stack/schemas/YouWorldAttentionParcel.aln.json"; exit 1;
fi

echo "[youworld] Validating OpenAPI (if swagger-cli available)..."
if command -v npx >/dev/null 2>&1; then
  if npx --yes swagger-cli validate api/youworld-openapi.yaml; then
    echo "OpenAPI validated OK"
  else
    echo "swagger-cli validate failed"; exit 1;
  fi
else
  echo "npx not found; skipping OpenAPI validation."
fi

echo "[youworld] Compiling TypeScript ingest (if Node toolchain present)..."
if command -v npx >/dev/null 2>&1 && [ -f services/ingest/tsconfig.json ]; then
  echo "[youworld] Ensuring npm deps for ingest..."
  if [ -f services/ingest/package.json ] && [ ! -d services/ingest/node_modules ]; then
    (cd services/ingest && (npm ci || npm install))
  fi
  echo "[youworld] Running tsc via npx..."
  (cd services/ingest && npx --yes tsc)
  echo "TypeScript compiled OK"
else
  echo "TypeScript toolchain or config missing; skipping TS compile."
fi

echo "[youworld] Verification complete."
