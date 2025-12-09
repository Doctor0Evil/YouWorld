# CI run script for Windows PowerShell
# 1) Generate stubs
# 2) Run tests
# 3) Build docker image

Write-Host "CI: generate stubs"
scripts\generate_stubs.ps1

Write-Host "CI: run tests (default)"
scripts\run_tests.ps1

Write-Host "CI: run protogen tests (test-protogen)"
make test-protogen

Write-Host "CI: build docker overlay-server image"
make docker
Write-Host "CI: vet (with protogen)"
go vet ./... || Write-Host "go vet failed (non-fatal)"

Write-Host "CI: done"
