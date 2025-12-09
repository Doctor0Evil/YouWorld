# Starts the web demo and optionally runs the Go WebTransport demo

Push-Location ..\web
Write-Host "Starting static server on http://localhost:8080"
# If Python is not available, use any static server; this is intended for dev/demo env
Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'http.server', '8080'
Pop-Location

# Build the Go WebTransport demo
Push-Location ..\go
Write-Host "Building Go WebTransport demo..."
if (Test-Path go.mod -PathType Leaf) {
    go build -o webtransport_demo.exe webtransport_demo.go
    Write-Host "Build complete. Run .\webtransport_demo.exe to connect to overlay endpoint."
} else {
    Write-Host "No go.mod found in go/; skipping build." 
}
Pop-Location
