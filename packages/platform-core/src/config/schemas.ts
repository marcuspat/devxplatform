import { z } from 'zod';

import {
  ServiceType,
  ProgrammingLanguage,
  Framework,
  DatabaseType,
  ApiType,
  AuthType,
  DocType,
  VersioningStrategy,
  CICDProvider,
  LoggingProvider,
  MetricsProvider,
  TracingProvider,
} from '../types/index.js';
import { 
  createEnumValidator,
  semverValidator,
  identifierValidator,
} from '../utils/validation-utils.js';

// Enum validators
const serviceTypeSchema = createEnumValidator(Object.values(ServiceType));
const programmingLanguageSchema = createEnumValidator(Object.values(ProgrammingLanguage));
const frameworkSchema = createEnumValidator(Object.values(Framework));
const databaseTypeSchema = createEnumValidator(Object.values(DatabaseType));
const apiTypeSchema = createEnumValidator(Object.values(ApiType));
const authTypeSchema = createEnumValidator(Object.values(AuthType));
const docTypeSchema = createEnumValidator(Object.values(DocType));
const versioningStrategySchema = createEnumValidator(Object.values(VersioningStrategy));
const cicdProviderSchema = createEnumValidator(Object.values(CICDProvider));
const loggingProviderSchema = createEnumValidator(Object.values(LoggingProvider));
const metricsProviderSchema = createEnumValidator(Object.values(MetricsProvider));
const tracingProviderSchema = createEnumValidator(Object.values(TracingProvider));

// Database configuration schema
const databaseConfigSchema = z.object({
  type: databaseTypeSchema,
  name: identifierValidator,
  migrations: z.boolean().optional(),
  orm: z.string().optional(),
});

// API configuration schema
const apiConfigSchema = z.object({
  type: apiTypeSchema,
  authentication: z.array(authTypeSchema).optional(),
  documentation: docTypeSchema.optional(),
  versioning: versioningStrategySchema.optional(),
});

// Container configuration schema
const containerConfigSchema = z.object({
  docker: z.boolean(),
  baseImage: z.string().optional(),
  multiStage: z.boolean().optional(),
});

// Orchestration configuration schema
const orchestrationConfigSchema = z.object({
  kubernetes: z.boolean(),
  helm: z.boolean().optional(),
  namespace: z.string().optional(),
});

// CI/CD configuration schema
const cicdConfigSchema = z.object({
  provider: cicdProviderSchema,
  stages: z.array(z.string()).optional(),
});

// Monitoring configuration schema
const monitoringConfigSchema = z.object({
  logging: loggingProviderSchema.optional(),
  metrics: metricsProviderSchema.optional(),
  tracing: tracingProviderSchema.optional(),
});

// Infrastructure configuration schema
const infrastructureConfigSchema = z.object({
  containerization: containerConfigSchema.optional(),
  orchestration: orchestrationConfigSchema.optional(),
  cicd: cicdConfigSchema.optional(),
  monitoring: monitoringConfigSchema.optional(),
});

// Service feature schema
const serviceFeatureSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  config: z.record(z.unknown()).optional(),
});

// Main service configuration schema
export const serviceConfigSchema = z.object({
  name: identifierValidator,
  version: semverValidator,
  description: z.string(),
  type: serviceTypeSchema,
  language: programmingLanguageSchema,
  framework: frameworkSchema.optional(),
  database: databaseConfigSchema.optional(),
  api: apiConfigSchema.optional(),
  infrastructure: infrastructureConfigSchema.optional(),
  features: z.array(serviceFeatureSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Generator options schema
export const generatorOptionsSchema = z.object({
  outputPath: z.string(),
  force: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  verbose: z.boolean().optional(),
  templateOverrides: z.record(z.string()).optional(),
});

// Plugin configuration schema
export const pluginConfigSchema = z.object({
  name: z.string(),
  path: z.string(),
  options: z.record(z.unknown()).optional(),
});

// Generator configuration schema
export const generatorConfigSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  options: z.record(z.unknown()).optional(),
});

// Platform configuration schema
export const platformConfigSchema = z.object({
  version: semverValidator,
  templatesPath: z.string(),
  outputPath: z.string(),
  generators: z.array(generatorConfigSchema),
  plugins: z.array(pluginConfigSchema).optional(),
});

// Template file schema
export const templateFileSchema = z.object({
  path: z.string(),
  template: z.string(),
  condition: z.string().optional(),
  binary: z.boolean().optional(),
});

// Template dependency schema
export const templateDependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  dev: z.boolean().optional(),
  condition: z.string().optional(),
});

// Service template schema
export const serviceTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: serviceTypeSchema,
  supportedLanguages: z.array(programmingLanguageSchema),
  supportedFrameworks: z.array(frameworkSchema).optional(),
  files: z.array(templateFileSchema),
  dependencies: z.array(templateDependencySchema).optional(),
  scripts: z.record(z.string()).optional(),
});

// Export type inference helpers
export type ServiceConfigInput = z.input<typeof serviceConfigSchema>;
export type ServiceConfigOutput = z.output<typeof serviceConfigSchema>;
export type GeneratorOptionsInput = z.input<typeof generatorOptionsSchema>;
export type PlatformConfigInput = z.input<typeof platformConfigSchema>;