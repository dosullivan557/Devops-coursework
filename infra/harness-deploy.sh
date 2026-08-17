#!/bin/sh

set -eu

OPERATION="${1:-}"
TEMPLATE_FILE="infra/main.bicep"
DEPLOYMENT_NAME="change-audit-infrastructure"

: "${AZURE_TENANT_ID:?AZURE_TENANT_ID is required}"
: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${AZURE_RESOURCE_LOCATION:?AZURE_RESOURCE_LOCATION is required}"
: "${DATABASE_ADMIN_PASSWORD:?DATABASE_ADMIN_PASSWORD is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required}"

az login \
  --use-device-code \
  --tenant "$AZURE_TENANT_ID" \
  --output none

az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az bicep install
az bicep version
az bicep build --file "$TEMPLATE_FILE" --stdout >/dev/null

case "$OPERATION" in
  plan)
    az deployment group validate \
      --name "$DEPLOYMENT_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --template-file "$TEMPLATE_FILE" \
      --parameters location="$AZURE_RESOURCE_LOCATION" \
      --parameters databaseAdministratorPassword="$DATABASE_ADMIN_PASSWORD" \
      --parameters authSecret="$AUTH_SECRET" \
      --output table

    az deployment group what-if \
      --name "$DEPLOYMENT_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --template-file "$TEMPLATE_FILE" \
      --parameters location="$AZURE_RESOURCE_LOCATION" \
      --parameters databaseAdministratorPassword="$DATABASE_ADMIN_PASSWORD" \
      --parameters authSecret="$AUTH_SECRET"
    ;;
  apply)
    az deployment group create \
      --name "$DEPLOYMENT_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --template-file "$TEMPLATE_FILE" \
      --parameters location="$AZURE_RESOURCE_LOCATION" \
      --parameters databaseAdministratorPassword="$DATABASE_ADMIN_PASSWORD" \
      --parameters authSecret="$AUTH_SECRET" \
      --query properties.outputs \
      --output json
    ;;
  *)
    echo "Usage: $0 plan|apply" >&2
    exit 2
    ;;
esac
