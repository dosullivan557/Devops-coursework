# Infrastructure as Code Pipeline

```mermaid
flowchart LR
    A[Select source branch] --> B[Validate Bicep]
    B --> C[Run what-if]
    C --> D{Approve deployment?}
    D -->|Yes| E[Deploy Bicep]
    D -->|No| F[Stop pipeline]
```
