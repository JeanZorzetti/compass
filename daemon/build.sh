#!/usr/bin/env bash
# Cross-compile compass para Windows, macOS e Linux.
# Uso: ./build.sh

set -e

mkdir -p dist
LDFLAGS="-s -w"

build() {
    local os=$1
    local arch=$2
    local ext=$3
    local out="dist/compass-${os}-${arch}${ext}"
    echo "  building ${out}..."
    GOOS=$os GOARCH=$arch go build -ldflags="$LDFLAGS" -o "$out" .
}

echo "cross-compiling compass..."
build windows amd64 .exe
build darwin  amd64 ""
build darwin  arm64 ""
build linux   amd64 ""
build linux   arm64 ""

echo ""
echo "binários gerados em dist/:"
ls -lh dist/
