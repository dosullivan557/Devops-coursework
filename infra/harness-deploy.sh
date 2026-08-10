#!/bin/sh

set -eu

OPERATION="${1:-}"
PARAMETERS_FILE="infra/main.dev.bicepparam"
TEMPLATE_FILE="infra/main.bicep"
DEPLOYMENT_NAME="change-audit-infrastructure"

: "${AZURE_CLIENT_ID:?AZURE_CLIENT_ID is required}"
: "${AZURE_CLIENT_SECRET:?AZURE_CLIENT_SECRET is required}"
: "${AZURE_TENANT_ID:?AZURE_TENANT_ID is required}"
: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_LOCATION:?AZURE_LOCATION is required}"

az login \
  --service-principal \
  --username "$AZURE_CLIENT_ID" \
  --password "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID" \
  --output none

az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az bicep build --file "$TEMPLATE_FILE" --stdout >/dev/null

case "$OPERATION" in
  plan)
    az deployment sub validate \
      --name "$DEPLOYMENT_NAME" \
      --location "$AZURE_LOCATION" \
      --parameters "$PARAMETERS_FILE" \
      --output table

    az deployment sub what-if \
      --name "$DEPLOYMENT_NAME" \
      --location "$AZURE_LOCATION" \
      --parameters "$PARAMETERS_FILE"
    ;;
  apply)
    az deployment sub create \
      --name "$DEPLOYMENT_NAME" \
      --location "$AZURE_LOCATION" \
      --parameters "$PARAMETERS_FILE" \
      --query properties.outputs \
      --output json
    ;;
  *)
    echo "Usage: $0 plan|apply" >&2
    exit 2
    ;;
esac
