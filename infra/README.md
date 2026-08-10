# Azure Container Registry infrastructure

This resource-group-scoped Bicep deployment creates:

- A private Azure Container Registry using the low-cost `Basic` SKU.
- A deterministic, globally unique registry name.

Anonymous pulls are disabled. Authenticate with Microsoft Entra ID through the
Azure CLI where possible. For this student environment, the registry administrator
account is enabled so the local Harness
delegate can push images without permission to create an Entra application.

After deploying the registry, retrieve its generated credentials without writing
them to the repository:

```bash
az acr credential show \
  --name changeauditm47b6whvnosgi \
  --query '{username:username,password:passwords[0].value}'
```

Create account-level Harness text secrets named `acr_username` and `acr_password`
from those values. The CI pipeline references them only in the main-only ACR push
stage. Treat the administrator password as a privileged credential and rotate it
if it is exposed.

## Prerequisites

- An active Azure subscription, including Azure for Students.
- An existing `rg-change-audit-dev` resource group.
- Azure CLI with Bicep support.
- Permission to create resource groups and container registries.

Sign in and select the student subscription:

```bash
az login
az account list --output table
az account set --subscription "SUBSCRIPTION_NAME_OR_ID"
az account show --output table
```

The development configuration uses `Sweden Central`, which is permitted by the
Azure for Students subscription policy.

## Validate and preview

Run these commands from the repository root:

```bash
az bicep build --file infra/main.bicep

az deployment group what-if \
  --name change-audit-infrastructure-preview \
  --resource-group rg-change-audit-dev \
  --parameters infra/main.dev.bicepparam
```

## Deploy

The Harness assignment pipeline prompts for an Azure Policy-approved registry
region and uses Azure device-code authentication. Open the
URL and enter the code printed in the Harness execution log when prompted. The
plan and apply steps use separate short-lived Azure CLI containers, so each step
requests its own login.

```bash
az deployment group create \
  --name change-audit-infrastructure \
  --resource-group rg-change-audit-dev \
  --parameters infra/main.dev.bicepparam
```

Read the generated registry name and login server from the deployment outputs:

```bash
az deployment group show \
  --name change-audit-infrastructure \
  --resource-group rg-change-audit-dev \
  --query properties.outputs \
  --output table
```

## Push an image manually

```bash
ACR_NAME="$(az deployment group show \
  --name change-audit-infrastructure \
  --resource-group rg-change-audit-dev \
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
