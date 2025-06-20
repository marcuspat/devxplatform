import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import type { ServiceConfig, PlatformConfig } from '../types/index.js';
import { ValidationError } from '../types/index.js';
import { validateServiceConfig } from './validation.js';
import { platformConfigSchema } from './schemas.js';
import { DEFAULT_PLATFORM_CONFIG } from './defaults.js';
import { fileExists, readJson } from '../utils/file-utils.js';

export async function loadServiceConfig(configPath: string): Promise<ServiceConfig> {
  try {
    const ext = path.extname(configPath).toLowerCase();
    let config: unknown;

    switch (ext) {
      case '.json':
        config = await readJson(configPath);
        break;
      case '.yaml':
      case '.yml':
        const yamlContent = await fs.readFile(configPath, 'utf-8');
        config = yaml.load(yamlContent);
        break;
      case '.js':
      case '.mjs':
        const module = await import(configPath);
        config = module.default || module;
        break;
      case '.ts':
        throw new Error('TypeScript config files require compilation');
      default:
        throw new Error(`Unsupported config file extension: ${ext}`);
    }

    return validateServiceConfig(config);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to load service config from ${configPath}`,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}

export async function loadPlatformConfig(configPath?: string): Promise<PlatformConfig> {
  // If no config path provided, look for default locations
  if (!configPath) {
    const defaultPaths = [
      'devex.config.json',
      'devex.config.yaml',
      'devex.config.yml',
      'devex.config.js',
      'devex.config.mjs',
      '.devexrc.json',
      '.devexrc.yaml',
      '.devexrc.yml',
    ];

    for (const defaultPath of defaultPaths) {
      if (await fileExists(defaultPath)) {
        configPath = defaultPath;
        break;
      }
    }
  }

  // If still no config found, return defaults
  if (!configPath) {
    return DEFAULT_PLATFORM_CONFIG;
  }

  try {
    const ext = path.extname(configPath).toLowerCase();
    let config: unknown;

    switch (ext) {
      case '.json':
        config = await readJson(configPath);
        break;
      case '.yaml':
      case '.yml':
        const yamlContent = await fs.readFile(configPath, 'utf-8');
        config = yaml.load(yamlContent);
        break;
      case '.js':
      case '.mjs':
        const module = await import(configPath);
        config = module.default || module;
        break;
      default:
        throw new Error(`Unsupported config file extension: ${ext}`);
    }

    // Validate and merge with defaults
    const validatedConfig = platformConfigSchema.parse(config);
    return {
      ...DEFAULT_PLATFORM_CONFIG,
      ...validatedConfig,
    };
  } catch (error) {
    throw new ValidationError(
      `Failed to load platform config from ${configPath}`,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}

export async function saveServiceConfig(
  config: ServiceConfig,
  outputPath: string,
): Promise<void> {
  const ext = path.extname(outputPath).toLowerCase();

  switch (ext) {
    case '.json':
      await fs.writeFile(outputPath, JSON.stringify(config, null, 2), 'utf-8');
      break;
    case '.yaml':
    case '.yml':
      const yamlContent = yaml.dump(config, { indent: 2 });
      await fs.writeFile(outputPath, yamlContent, 'utf-8');
      break;
    default:
      throw new Error(`Unsupported output format: ${ext}`);
  }
}

export async function mergeConfigs(
  baseConfig: ServiceConfig,
  overrides: Partial<ServiceConfig>,
): Promise<ServiceConfig> {
  const merged = {
    ...baseConfig,
    ...overrides,
    features: overrides.features || baseConfig.features,
    metadata: {
      ...baseConfig.metadata,
      ...overrides.metadata,
    },
  };

  return validateServiceConfig(merged);
}

export function resolveConfigPath(configPath: string, basePath?: string): string {
  if (path.isAbsolute(configPath)) {
    return configPath;
  }

  return path.resolve(basePath || process.cwd(), configPath);
}

export async function discoverConfigs(searchPath: string): Promise<string[]> {
  const configs: string[] = [];
  const patterns = [
    '**/devex.config.{json,yaml,yml,js,mjs}',
    '**/.devexrc.{json,yaml,yml}',
    '**/service.config.{json,yaml,yml,js,mjs}',
  ];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: searchPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });
    configs.push(...matches.map(match => path.join(searchPath, match)));
  }

  return configs;
}

// Helper to resolve template variables in config
export function resolveConfigVariables(
  config: any,
  variables: Record<string, any>,
): any {
  if (typeof config === 'string') {
    // Replace ${var} patterns
    return config.replace(/\$\{(\w+)\}/g, (match, varName) => {
      return variables[varName] || match;
    });
  }

  if (Array.isArray(config)) {
    return config.map(item => resolveConfigVariables(item, variables));
  }

  if (typeof config === 'object' && config !== null) {
    const resolved: any = {};
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = resolveConfigVariables(value, variables);
    }
    return resolved;
  }

  return config;
}