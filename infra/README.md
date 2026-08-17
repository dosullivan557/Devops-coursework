# Azure application infrastructure

This resource-group-scoped Bicep deployment creates:

- A private Azure Container Registry using the low-cost `Basic` SKU.
- A deterministic, globally unique registry name.
- An Azure Database for PostgreSQL Flexible Server using the low-cost burstable
  `Standard_B1ms` SKU.
- A `change_audit` PostgreSQL database with connections from Azure services
  allowed through the server firewall.
- An Azure Container Apps managed environment.
- A public `change-audit` Container App listening on port 3000.
- A user-assigned managed identity with `AcrPull` access to the registry.

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

Create another Harness text secret named `database_admin_password`. The IaC
pipeline passes it securely to both the plan and apply containers. Use the same
secret for every deployment so Azure does not rotate the database administrator
password unexpectedly. The value must be 8-128 characters and contain characters
from at least three of these groups: uppercase, lowercase, numbers, and
punctuation.

Create an account-level Harness text secret named `auth_secret` for signing
application authentication tokens. Generate a high-entropy value, for example:

```bash
openssl rand -base64 32
```

Keep this value stable between deployments. Changing it invalidates existing
application sessions.

## Prerequisites

- An active Azure subscription, including Azure for Students.
- An existing `rg-change-audit-dev` resource group.
- Azure CLI with Bicep support.
- Permission to create resource groups and container registries.
- Permission to create managed identities and role assignments. The deployment
  principal typically needs `Owner` or `User Access Administrator` for the
  registry-scoped `AcrPull` assignment.
- A `linux/amd64` `change-audit:latest` image in the generated registry. Override the
  `containerImageTag` parameter if a different initial tag is available.

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

Set the database administrator password in your shell. It must be 8-128
characters and contain characters from at least three of these groups: uppercase,
lowercase, numbers, and punctuation.

```bash
read -s DATABASE_ADMIN_PASSWORD
export DATABASE_ADMIN_PASSWORD
read -s AUTH_SECRET
export AUTH_SECRET
```

Run these commands from the repository root:

```bash
az bicep build --file infra/main.bicep

az deployment group what-if \
  --name change-audit-infrastructure-preview \
  --resource-group rg-change-audit-dev \
  --parameters infra/main.dev.bicepparam \
  --parameters databaseAdministratorPassword="$DATABASE_ADMIN_PASSWORD"
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
  --parameters infra/main.dev.bicepparam \
  --parameters databaseAdministratorPassword="$DATABASE_ADMIN_PASSWORD"
```

Read the generated registry name and login server from the deployment outputs:

```bash
az deployment group show \
  --name change-audit-infrastructure \
  --resource-group rg-change-audit-dev \
  --query properties.outputs \
  --output table
```

Build the application's `DATABASE_URL` from the output values without committing
the password:

```text
postgresql://changeauditadmin:PASSWORD@DATABASE_HOST:5432/change_audit?sslmode=require
```

The deployment creates the database itself, but it does not apply the application
schema. Run `init.sql` against the new database before using the application.

The Container App pulls from ACR with its managed identity. Subsequent CI
deployments only need to update the image; registry credentials remain managed by
Bicep.

## Push an image manually

```bash
ACR_NAME="$(az deployment group show \
  --name change-audit-infrastructure \
  --resource-group rg-change-audit-dev \
  --query properties.outputs.registryName.value \
  --output tsv)"

az acr login --name "$ACR_NAME"
IMAGE_VERSION="$(node -p "require('./package.json').version")"
docker tag change-audit:local "$ACR_NAME.azurecr.io/change-audit:$IMAGE_VERSION"
docker push "$ACR_NAME.azurecr.io/change-audit:$IMAGE_VERSION"
```

Azure Container Registry and PostgreSQL are billable resources. Delete the
development resource group when it is no longer needed:

```bash
az group delete --name rg-change-audit-dev
```
