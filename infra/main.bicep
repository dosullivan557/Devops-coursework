targetScope = 'resourceGroup'

@description('Azure region used for the resource group and container registry.')
param location string = 'swedencentral'

@description('Lowercase alphanumeric prefix for the registry name. A deterministic suffix is added for global uniqueness.')
@minLength(5)
@maxLength(30)
param registryPrefix string = 'changeaudit'

@description('Environment name applied to resource tags.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

var registryName = '${toLower(registryPrefix)}${uniqueString(resourceGroup().id)}'
var tags = {
  application: 'change-audit'
  environment: environment
  managedBy: 'bicep'
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'container-registry'
  params: {
    location: location
    registryName: registryName
    tags: tags
  }
}

output resourceGroupName string = resourceGroup().name
output registryId string = containerRegistry.outputs.registryId
output registryName string = containerRegistry.outputs.registryName
output registryLoginServer string = containerRegistry.outputs.loginServer
