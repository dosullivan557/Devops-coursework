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

@description('PostgreSQL administrator username.')
param databaseAdministratorLogin string = 'changeauditadmin'

@secure()
@description('PostgreSQL administrator password. Supply this at deployment time; never commit it.')
param databaseAdministratorPassword string

@description('PostgreSQL database used by the application.')
param databaseName string = 'change_audit'

var registryName = '${toLower(registryPrefix)}${uniqueString(resourceGroup().id)}'
var databaseServerName = '${toLower(registryPrefix)}-db-${uniqueString(resourceGroup().id)}'
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

module postgresql './modules/postgresql.bicep' = {
  name: 'postgresql'
  params: {
    location: location
    serverName: databaseServerName
    administratorLogin: databaseAdministratorLogin
    administratorPassword: databaseAdministratorPassword
    databaseName: databaseName
    tags: tags
  }
}

output resourceGroupName string = resourceGroup().name
output registryId string = containerRegistry.outputs.registryId
output registryName string = containerRegistry.outputs.registryName
output registryLoginServer string = containerRegistry.outputs.loginServer
output databaseServerId string = postgresql.outputs.serverId
output databaseHost string = postgresql.outputs.fullyQualifiedDomainName
output databaseName string = postgresql.outputs.databaseName
output databaseAdministratorLogin string = databaseAdministratorLogin
