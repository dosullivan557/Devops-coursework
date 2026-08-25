/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  preset: "ts-jest",
  testEnvironment: "node",
};

module.exports = config;
