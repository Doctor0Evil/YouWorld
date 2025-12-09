PROTO_PATH := proto
WEB_JS := web/gen
GEN_GO := gen

.PHONY: all gen-stubs build test docker

all: test

gen-stubs:
	protoc --proto_path=$(PROTO_PATH) --go_out=$(GEN_GO) --go_opt=paths=source_relative --go-grpc_out=$(GEN_GO) --go-grpc_opt=paths=source_relative $(PROTO_PATH)/overlay.proto $(PROTO_PATH)/playlist.proto
	protoc --proto_path=$(PROTO_PATH) --js_out=import_style=commonjs,binary:$(WEB_JS) $(PROTO_PATH)/overlay.proto $(PROTO_PATH)/playlist.proto
	flatc -g -o gen/flat schema/overlay.fbs schema/playlist.fbs

build:
	go build ./...

test: gen-stubs
	go test ./... -race -coverprofile=coverage.out
	go tool cover -func=coverage.out

test-protogen: gen-stubs
	go test -tags protogen ./... -race -coverprofile=coverage-protogen.out
	go tool cover -func=coverage-protogen.out

docker:
	docker build -f Dockerfile.overlay-server -t youworld/overlay-server:local .
