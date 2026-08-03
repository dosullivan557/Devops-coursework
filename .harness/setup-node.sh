#!/usr/bin/env bash

set -euo pipefail

NODE_VERSION="22.14.0"
NODE_HOME="${HARNESS_NODE_HOME:-$PWD/.harness/.node}"

if [[ ! -x "$NODE_HOME/bin/node" ]]; then
  case "$(uname -m)" in
    x86_64) NODE_ARCH="x64" ;;
    arm64|aarch64) NODE_ARCH="arm64" ;;
    *)
      echo "Unsupported runner architecture: $(uname -m)" >&2
      return 1 2>/dev/null || exit 1
      ;;
  esac

  NODE_PACKAGE="node-v${NODE_VERSION}-linux-${NODE_ARCH}"
  NODE_ARCHIVE="${NODE_PACKAGE}.tar.xz"
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}"

  mkdir -p "$NODE_HOME"
  curl --fail --location --silent --show-error "$NODE_URL" \
    | tar -xJ --strip-components=1 -C "$NODE_HOME"
fi

export PATH="$NODE_HOME/bin:$PATH"

node --version
npm --version
