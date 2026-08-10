using './main.bicep'

param location = 'swedencentral'
param registryPrefix = 'changeaudit'
param environment = 'dev'
param databaseAdministratorPassword = readEnvironmentVariable('DATABASE_ADMIN_PASSWORD')
