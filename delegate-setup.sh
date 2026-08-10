docker run -d --cpus=1 --memory=2g \  
  -e DELEGATE_NAME=local-delegate \
  -e NEXT_GEN="true" \
  -e DELEGATE_TYPE="DOCKER" \
  -e ACCOUNT_ID=SCAtL6FxRQ2hX9-kLRGAzw \
  -e DELEGATE_TOKEN=NzIxZmU1YWRmZjYzODUwMDVkNmNhNjZhMDBjZjdhOWI= \
  -e DELEGATE_TAGS="" \
  -e MANAGER_HOST_AND_PORT=https://app.harness.io us-docker.pkg.dev/gar-prod-setup/harness-public/harness/delegate:26.07.89703



