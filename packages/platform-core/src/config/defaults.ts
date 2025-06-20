import type {
  ServiceConfig,
  GeneratorOptions,
  PlatformConfig,
  ServiceType,
  ProgrammingLanguage,
  Framework,
} from '../types/index.js';

export const DEFAULT_SERVICE_VERSION = '0.1.0';

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  outputPath: './output',
  force: false,
  dryRun: false,
  verbose: false,
  templateOverrides: {},
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  version: '1.0.0',
  templatesPath: './templates',
  outputPath: './services',
  generators: [
    {
      name: 'service',
      enabled: true,
    },
    {
      name: 'api',
      enabled: true,
    },
    {
      name: 'infrastructure',
      enabled: true,
    },
  ],
  plugins: [],
};

export const DEFAULT_FRAMEWORKS: Record<ProgrammingLanguage, Framework[]> = {
  [ProgrammingLanguage.TypeScript]: [
    Framework.Express,
    Framework.NestJS,
    Framework.NextJS,
  ],
  [ProgrammingLanguage.JavaScript]: [
    Framework.Express,
    Framework.React,
    Framework.Vue,
  ],
  [ProgrammingLanguage.Python]: [
    Framework.FastAPI,
    Framework.Django,
    Framework.Flask,
  ],
  [ProgrammingLanguage.Go]: [
    Framework.Gin,
    Framework.Echo,
    Framework.Fiber,
  ],
  [ProgrammingLanguage.Java]: [],
  [ProgrammingLanguage.Rust]: [],
};

export const DEFAULT_SERVICE_FEATURES = [
  {
    name: 'healthCheck',
    enabled: true,
    config: {
      path: '/health',
    },
  },
  {
    name: 'logging',
    enabled: true,
    config: {
      level: 'info',
      format: 'json',
    },
  },
  {
    name: 'errorHandling',
    enabled: true,
    config: {},
  },
  {
    name: 'validation',
    enabled: true,
    config: {},
  },
];

export const DEFAULT_API_FEATURES = [
  {
    name: 'cors',
    enabled: true,
    config: {
      origin: '*',
      credentials: true,
    },
  },
  {
    name: 'rateLimiting',
    enabled: false,
    config: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
  },
  {
    name: 'compression',
    enabled: true,
    config: {},
  },
];

export const DEFAULT_DOCKER_BASE_IMAGES: Record<ProgrammingLanguage, string> = {
  [ProgrammingLanguage.TypeScript]: 'node:18-alpine',
  [ProgrammingLanguage.JavaScript]: 'node:18-alpine',
  [ProgrammingLanguage.Python]: 'python:3.11-slim',
  [ProgrammingLanguage.Go]: 'golang:1.21-alpine',
  [ProgrammingLanguage.Java]: 'openjdk:17-slim',
  [ProgrammingLanguage.Rust]: 'rust:1.75-slim',
};

export const DEFAULT_PACKAGE_MANAGERS: Record<ProgrammingLanguage, string> = {
  [ProgrammingLanguage.TypeScript]: 'npm',
  [ProgrammingLanguage.JavaScript]: 'npm',
  [ProgrammingLanguage.Python]: 'pip',
  [ProgrammingLanguage.Go]: 'go mod',
  [ProgrammingLanguage.Java]: 'maven',
  [ProgrammingLanguage.Rust]: 'cargo',
};

export const DEFAULT_TEST_FRAMEWORKS: Record<ProgrammingLanguage, string> = {
  [ProgrammingLanguage.TypeScript]: 'vitest',
  [ProgrammingLanguage.JavaScript]: 'jest',
  [ProgrammingLanguage.Python]: 'pytest',
  [ProgrammingLanguage.Go]: 'testing',
  [ProgrammingLanguage.Java]: 'junit',
  [ProgrammingLanguage.Rust]: 'cargo test',
};

export const DEFAULT_PORTS: Record<ServiceType, number> = {
  [ServiceType.API]: 3000,
  [ServiceType.WebApp]: 3000,
  [ServiceType.Microservice]: 8080,
  [ServiceType.Library]: 0,
  [ServiceType.CLI]: 0,
  [ServiceType.Worker]: 0,
  [ServiceType.Function]: 0,
};

export function getDefaultFramework(
  language: ProgrammingLanguage,
  serviceType: ServiceType,
): Framework | undefined {
  const frameworks = DEFAULT_FRAMEWORKS[language];
  if (!frameworks || frameworks.length === 0) {
    return undefined;
  }

  // Select appropriate framework based on service type
  switch (serviceType) {
    case ServiceType.API:
    case ServiceType.Microservice:
      return frameworks.find(f => 
        [Framework.Express, Framework.FastAPI, Framework.Gin].includes(f)
      ) || frameworks[0];
    
    case ServiceType.WebApp:
      return frameworks.find(f => 
        [Framework.NextJS, Framework.React, Framework.Vue].includes(f)
      ) || frameworks[0];
    
    default:
      return frameworks[0];
  }
}

export function createDefaultServiceConfig(
  name: string,
  type: ServiceType,
  language: ProgrammingLanguage,
): Partial<ServiceConfig> {
  return {
    name,
    version: DEFAULT_SERVICE_VERSION,
    type,
    language,
    framework: getDefaultFramework(language, type),
    features: [...DEFAULT_SERVICE_FEATURES],
  };
}