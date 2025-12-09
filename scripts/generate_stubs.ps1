# PowerShell script to generate protobuf and FlatBuffers stubs for the YouWorld repo
# Requires: protoc with the relevant plugins installed (protoc-gen-go, protoc-gen-go-grpc, and ts plugin if used), and flatc (FlatBuffers compiler)

$protoPath = Join-Path $PSScriptRoot "..\proto"
$genGo = Join-Path $PSScriptRoot "..\gen"
$webJs = Join-Path $PSScriptRoot "..\web\js"

Write-Host "Generating Go stubs..."
if (-not (Get-Command protoc -ErrorAction SilentlyContinue)) {
	Write-Error "protoc not found in PATH; please install protoc and the go plugin (protoc-gen-go)."
	exit 1
}
protoc --proto_path=$protoPath --go_out=$genGo --go_opt=paths=source_relative --go-grpc_out=$genGo --go-grpc_opt=paths=source_relative "$protoPath\overlay.proto" "$protoPath\playlist.proto"

Write-Host "Generating JS stubs (commonjs); adjust plugin and output path as needed..."
protoc --proto_path=$protoPath --js_out=import_style=commonjs,binary:$webJs "$protoPath\overlay.proto" "$protoPath\playlist.proto"

Write-Host "Generating FlatBuffers..."
if (-not (Get-Command flatc -ErrorAction SilentlyContinue)) {
	Write-Error "flatc (FlatBuffers compiler) not found in PATH; please install it to generate fbs stubs."
	exit 1
}
flatc -g -o "$PSScriptRoot\..\gen\flat" "$PSScriptRoot\..\schema\overlay.fbs" "$PSScriptRoot\..\schema\playlist.fbs"

Write-Host "Done."
