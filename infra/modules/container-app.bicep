@description('Azure region for the Container Apps resources.')
param location string

@description('Name of the Container App.')
param containerAppName string

@description('Name of the Container Apps managed environment.')
param managedEnvironmentName string

@description('Name of the Azure Container Registry.')
param registryName string

@description('Login server of the Azure Container Registry.')
param registryLoginServer string

@description('Container image repository in ACR.')
param imageRepository string = 'change-audit'

@description('Initial container image tag. The image must exist before the first deployment.')
param imageTag string

@description('PostgreSQL server host name.')
param databaseHost string

@description('PostgreSQL administrator username.')
param databaseAdministratorLogin string

@secure()
@description('PostgreSQL administrator password.')
param databaseAdministratorPassword string

@description('PostgreSQL application database name.')
param databaseName string

@secure()
@description('Secret used to sign application authentication tokens.')
param authSecret string

@description('Tags applied to the Container Apps resources.')
param tags object = {}

var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: registryName
}

resource imagePullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: '${containerAppName}-pull'
  location: location
  tags: tags
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, imagePullIdentity.id, acrPullRoleDefinitionId)
  scope: registry
  properties: {
    principalId: imagePullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleDefinitionId
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: managedEnvironmentName
  location: location
  tags: tags
  properties: {}
}

resource containerApp 'Microsoft.App/containerApps@2025-01-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${imagePullIdentity.id}': {}
    }
  }
  properties: {
    environmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registryLoginServer
          identity: imagePullIdentity.id
        }
      ]
      secrets: [
        {
          name: 'database-config'
          // This JSON value is derived from a secure parameter; Bicep's string()
          // conversion does not preserve the secure-type annotation.
          #disable-next-line use-secure-value-for-secure-inputs
          value: string({
            host: databaseHost
            port: 5432
            username: databaseAdministratorLogin
            password: databaseAdministratorPassword
            database: databaseName
          })
        }
        {
          name: 'auth-secret'
          value: authSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: containerAppName
          image: '${registryLoginServer}/${imageRepository}:${imageTag}'
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-config'
            }
            {
              name: 'AUTH_SECRET'
              secretRef: 'auth-secret'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

output containerAppId string = containerApp.id
output containerAppName string = containerApp.name
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output managedEnvironmentId string = managedEnvironment.id
