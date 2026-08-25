#!/bin/sh

set -eu

# : "${HARNESS_DELEGATE_TOKEN:?Set HARNESS_DELEGATE_TOKEN to a newly generated Harness delegate token}"

DELEGATE_IMAGE="change-audit/harness-delegate:26.07.89703-docker"
RUNNER_VERSION="0.1.27"
RUNNER_DIR="${HARNESS_RUNNER_DIR:-$PWD/.harness-runner}"

case "$(uname -m)" in
  x86_64)
    RUNNER_ARCH="amd64"
    RUNNER_SHA256="95fd775ec42c9d166d8be56379fd36f28e67ae15a2f9e177bc1ba9d9ce00c518"
    ;;
  arm64|aarch64)
    RUNNER_ARCH="arm64"
    RUNNER_SHA256="6b93e309fb59c432e3ffb33ddf37c74d3fa26d75d053c30d76128288766b4ffa"
    ;;
  *)
    echo "Unsupported runner architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

RUNNER_NAME="harness-docker-runner-linux-${RUNNER_ARCH}"
RUNNER_BINARY="$RUNNER_DIR/$RUNNER_NAME"
RUNNER_IMAGE="change-audit/harness-docker-runner:${RUNNER_VERSION}-${RUNNER_ARCH}"

if [ ! -x "$RUNNER_BINARY" ]; then
  mkdir -p "$RUNNER_DIR"
  curl --fail --location --show-error \
    --output "$RUNNER_BINARY" \
    "https://github.com/harness/harness-docker-runner/releases/download/v${RUNNER_VERSION}/${RUNNER_NAME}"
  printf '%s  %s\n' "$RUNNER_SHA256" "$RUNNER_BINARY" | sha256sum --check
  chmod 755 "$RUNNER_BINARY"
fi

printf '%s  %s\n' "$RUNNER_SHA256" "$RUNNER_BINARY" | sha256sum --check

docker rm --force local-harness-runner local-delegate >/dev/null 2>&1 || true

docker build \
  --file runner.Dockerfile \
  --build-arg "RUNNER_NAME=$RUNNER_NAME" \
  --tag "$RUNNER_IMAGE" \
  .

docker run --detach \
  --name local-harness-runner \
  --network host \
  --restart unless-stopped \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  "$RUNNER_IMAGE"

attempts=0
until docker exec local-harness-runner curl --fail --silent http://127.0.0.1:3000/healthz >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "Harness Docker Runner failed to become healthy" >&2
    docker logs local-harness-runner >&2
    exit 1
  fi
  sleep 1
done

docker build \
  --file delegate.Dockerfile \
  --tag "$DELEGATE_IMAGE" \
  .

docker run --detach \
  --name local-delegate \
  --network host \
  --restart unless-stopped \
  --cpus 2 \
  --memory 2g \
  --group-add 0 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --env DELEGATE_NAME=local-delegate \
  --env NEXT_GEN=true \
  --env DELEGATE_TYPE=DOCKER \
  --env ACCOUNT_ID=SCAtL6FxRQ2hX9-kLRGAzw \
  --env DELEGATE_TOKEN=NzIxZmU1YWRmZjYzODUwMDVkNmNhNjZhMDBjZjdhOWI= \
  --env DELEGATE_TAGS=local-delegate,linux-amd64,linux-arm64 \
  --env RUNNER_URL=http://127.0.0.1:3000 \
  --env MANAGER_HOST_AND_PORT=https://app.harness.io \
  "$DELEGATE_IMAGE"
