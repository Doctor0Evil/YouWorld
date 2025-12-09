# Run all Go tests with race detection and coverage, then print coverage
Write-Host "Generating stubs for tests"
scripts\generate_stubs.ps1
Write-Host "Tidying Go modules"
go mod tidy
Write-Host "Running go test with race and coverage"
$env:GOMODCACHE=$null

go test ./... -race -coverprofile=coverage.out
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running protogen tests (requires generated stubs and protogen build tag)"
go test -tags protogen ./... -race -coverprofile=coverage-protogen.out
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Coverage report"
go tool cover -func=coverage.out
