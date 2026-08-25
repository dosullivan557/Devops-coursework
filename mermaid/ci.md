# CI

```mermaid
flowchart LR
flowchart LR
    A["Developer Pushes Code"] --> B["Git Repository"]
    B --> C["CI Pipeline Triggered"]
    C --> D["Install Dependencies"]
    D --> E1["Run Unit Tests"] & E2["Run Formatting"] & E3["Run Linting"]
    E1 --> G["Application Dry Run"]
    E2 --> G
    E3 --> G

    G --> H{"Input Set"}
    H -- Pull Request --> I["Allow Merge"]
    H -- Branch is main --> J["Containerise Application"]
    J --> K["Push Containerised application To ACR"]
    K --> L["Deploy Application to ACA"]    
```
