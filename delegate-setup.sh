#!/bin/sh

set -eu

# : "${HARNESS_DELEGATE_TOKEN:?Set HARNESS_DELEGATE_TOKEN to a newly generated Harness delegate token}"

DELEGATE_IMAGE="change-audit/harness-delegate:26.07.89703-docker"

docker build \
  --file delegate.Dockerfile \
  --tag "$DELEGATE_IMAGE" \
  .

docker run --detach \
  --name local-delegate \
  --restart unless-stopped \
  --cpus 2 \
  --memory 4g \
  --group-add 0 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --env DELEGATE_NAME=local-delegate \
  --env NEXT_GEN=true \
  --env DELEGATE_TYPE=DOCKER \
  --env ACCOUNT_ID=SCAtL6FxRQ2hX9-kLRGAzw \
  --env DELEGATE_TOKEN=NzIxZmU1YWRmZjYzODUwMDVkNmNhNjZhMDBjZjdhOWI= \
  --env DELEGATE_TAGS=local-delegate \
  --env MANAGER_HOST_AND_PORT=https://app.harness.io \
  "$DELEGATE_IMAGE"

