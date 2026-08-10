# Architecture

```mermaid
flowchart LR
    User[User / Browser]

    subgraph Azure
        Environment[Azure Container Apps Environment]

        ACA[Azure Container App<br/>Next.js]

        PostgreSQL[(Azure Database for PostgreSQL)]
        KeyVault[Azure Key Vault]
        AppInsights[Application Insights]
        ACR[(Azure Container Registry)]
    end

    User --> Environment
    Environment --> ACA

    ACA --> PostgreSQL
    ACA --> KeyVault
    ACA --> AppInsights

    ACR --> ACA
```
