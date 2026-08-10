# Azure Container Registry infrastructure

This Bicep deployment creates:

- A resource group for the Change Audit application.
- A private Azure Container Registry using the low-cost `Basic` SKU.
- A deterministic, globally unique registry name.

The registry administrator account and anonymous pulls are disabled. Authenticate
with Microsoft Entra ID through the Azure CLI or use a workload identity from CI.

## Prerequisites

- An active Azure subscription, including Azure for Students.
- Azure CLI with Bicep support.
- Permission to create resource groups and container registries.

Sign in and select the student subscription:

```bash
az login
az account list --output table
az account set --subscription "SUBSCRIPTION_NAME_OR_ID"
az account show --output table
```

If `UK South` is unavailable under your subscription policy, change `location` in
`main.dev.bicepparam` to an allowed region.

## Validate and preview

Run these commands from the repository root:

```bash
az bicep build --file infra/main.bicep

az deployment sub what-if \
  --name change-audit-infrastructure-preview \
  --location uksouth \
  --template-file infra/main.bicep \
  --parameters infra/main.dev.bicepparam
```

## Deploy

```bash
az deployment sub create \
  --name change-audit-infrastructure \
  --location uksouth \
  --template-file infra/main.bicep \
  --parameters infra/main.dev.bicepparam
```

Read the generated registry name and login server from the deployment outputs:

```bash
az deployment sub show \
  --name change-audit-infrastructure \
  --query properties.outputs \
  --output table
```

## Push an image manually

```bash
ACR_NAME="$(az deployment sub show \
  --name change-audit-infrastructure \
  --query properties.outputs.registryName.value \
  --output tsv)"

az acr login --name "$ACR_NAME"
docker tag change-audit:local "$ACR_NAME.azurecr.io/change-audit:local"
docker push "$ACR_NAME.azurecr.io/change-audit:local"
```

Azure Container Registry is a billable resource. Delete the development resource
group when it is no longer needed:

```bash
az group delete --name rg-change-audit-dev
```
