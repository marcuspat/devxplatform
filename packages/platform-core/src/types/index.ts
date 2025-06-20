import type { z } from 'zod';

// Service configuration types
export interface ServiceConfig {
  name: string;
  version: string;
  description: string;
  type: ServiceType;
  language: ProgrammingLanguage;
  framework?: Framework;
  database?: DatabaseConfig;
  api?: ApiConfig;
  infrastructure?: InfrastructureConfig;
  features?: ServiceFeature[];
  metadata?: Record<string, unknown>;
}

export enum ServiceType {
  API = 'api',
  WebApp = 'webapp',
  Microservice = 'microservice',
  Library = 'library',
  CLI = 'cli',
  Worker = 'worker',
  Function = 'function',
}

export enum ProgrammingLanguage {
  TypeScript = 'typescript',
  JavaScript = 'javascript',
  Python = 'python',
  Go = 'go',
  Java = 'java',
  Rust = 'rust',
}

export enum Framework {
  // Node.js frameworks
  Express = 'express',
  Fastify = 'fastify',
  NestJS = 'nestjs',
  NextJS = 'nextjs',
  
  // Frontend frameworks
  React = 'react',
  Vue = 'vue',
  Angular = 'angular',
  Svelte = 'svelte',
  
  // Python frameworks
  FastAPI = 'fastapi',
  Django = 'django',
  Flask = 'flask',
  
  // Go frameworks
  Gin = 'gin',
  Echo = 'echo',
  Fiber = 'fiber',
}

export interface DatabaseConfig {
  type: DatabaseType;
  name: string;
  migrations?: boolean;
  orm?: string;
}

export enum DatabaseType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  MongoDB = 'mongodb',
  Redis = 'redis',
  SQLite = 'sqlite',
  DynamoDB = 'dynamodb',
}

export interface ApiConfig {
  type: ApiType;
  authentication?: AuthType[];
  documentation?: DocType;
  versioning?: VersioningStrategy;
}

export enum ApiType {
  REST = 'rest',
  GraphQL = 'graphql',
  gRPC = 'grpc',
  WebSocket = 'websocket',
}

export enum AuthType {
  JWT = 'jwt',
  OAuth2 = 'oauth2',
  ApiKey = 'apikey',
  Basic = 'basic',
  SAML = 'saml',
}

export enum DocType {
  OpenAPI = 'openapi',
  GraphQLSchema = 'graphql-schema',
  AsyncAPI = 'asyncapi',
}

export enum VersioningStrategy {
  URL = 'url',
  Header = 'header',
  QueryParam = 'query-param',
}

export interface InfrastructureConfig {
  containerization?: ContainerConfig;
  orchestration?: OrchestrationConfig;
  cicd?: CICDConfig;
  monitoring?: MonitoringConfig;
}

export interface ContainerConfig {
  docker: boolean;
  baseImage?: string;
  multiStage?: boolean;
}

export interface OrchestrationConfig {
  kubernetes: boolean;
  helm?: boolean;
  namespace?: string;
}

export interface CICDConfig {
  provider: CICDProvider;
  stages?: string[];
}

export enum CICDProvider {
  GitHubActions = 'github-actions',
  GitLab = 'gitlab',
  Jenkins = 'jenkins',
  CircleCI = 'circleci',
  AzureDevOps = 'azure-devops',
}

export interface MonitoringConfig {
  logging?: LoggingProvider;
  metrics?: MetricsProvider;
  tracing?: TracingProvider;
}

export enum LoggingProvider {
  ELK = 'elk',
  CloudWatch = 'cloudwatch',
  Datadog = 'datadog',
  GrafanaLoki = 'grafana-loki',
}

export enum MetricsProvider {
  Prometheus = 'prometheus',
  CloudWatch = 'cloudwatch',
  Datadog = 'datadog',
  NewRelic = 'newrelic',
}

export enum TracingProvider {
  Jaeger = 'jaeger',
  Zipkin = 'zipkin',
  XRay = 'xray',
  Datadog = 'datadog',
}

export interface ServiceFeature {
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Generator types
export interface GeneratorOptions {
  outputPath: string;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  templateOverrides?: Record<string, string>;
}

export interface GeneratorContext {
  config: ServiceConfig;
  options: GeneratorOptions;
  templateEngine: TemplateEngine;
  logger: Logger;
  utils: GeneratorUtils;
}

export interface TemplateEngine {
  render(template: string, data: Record<string, unknown>): string;
  renderFile(templatePath: string, data: Record<string, unknown>): Promise<string>;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface GeneratorUtils {
  toCamelCase(str: string): string;
  toPascalCase(str: string): string;
  toKebabCase(str: string): string;
  toSnakeCase(str: string): string;
  pluralize(str: string): string;
  singularize(str: string): string;
}

// Platform configuration
export interface PlatformConfig {
  version: string;
  templatesPath: string;
  outputPath: string;
  generators: GeneratorConfig[];
  plugins?: PluginConfig[];
}

export interface GeneratorConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

export interface PluginConfig {
  name: string;
  path: string;
  options?: Record<string, unknown>;
}

// Template types
export interface ServiceTemplate {
  name: string;
  description: string;
  type: ServiceType;
  supportedLanguages: ProgrammingLanguage[];
  supportedFrameworks?: Framework[];
  files: TemplateFile[];
  dependencies?: TemplateDependency[];
  scripts?: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  template: string;
  condition?: string;
  binary?: boolean;
}

export interface TemplateDependency {
  name: string;
  version: string;
  dev?: boolean;
  condition?: string;
}

// Validation schemas (using zod)
export interface ValidationSchema<T = unknown> {
  schema: z.ZodSchema<T>;
  validate(data: unknown): T;
}

// Event types for extensibility
export interface PlatformEvent {
  type: EventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export enum EventType {
  GeneratorStarted = 'generator:started',
  GeneratorCompleted = 'generator:completed',
  GeneratorFailed = 'generator:failed',
  FileGenerated = 'file:generated',
  TemplateRendered = 'template:rendered',
  ValidationFailed = 'validation:failed',
}

// Error types
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class GeneratorError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GENERATOR_ERROR', details);
    this.name = 'GeneratorError';
  }
}

export class ValidationError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class TemplateError extends PlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TEMPLATE_ERROR', details);
    this.name = 'TemplateError';
  }
}