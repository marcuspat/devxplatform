import { EventEmitter } from 'events';
import path from 'path';

import type {
  ServiceConfig,
  GeneratorOptions,
  PlatformConfig,
  PlatformEvent,
  EventType,
  Logger,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { validateServiceConfig } from '../config/validation.js';
import { GeneratorEngine } from './generator-engine.js';
import { PluginManager } from './plugin-manager.js';

export interface PlatformEngineOptions {
  config: PlatformConfig;
  logger?: Logger;
}

export class PlatformEngine extends EventEmitter {
  private readonly config: PlatformConfig;
  private readonly logger: Logger;
  private readonly generatorEngine: GeneratorEngine;
  private readonly pluginManager: PluginManager;

  constructor(options: PlatformEngineOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger ?? createLogger();
    
    this.generatorEngine = new GeneratorEngine({
      templatesPath: this.config.templatesPath,
      logger: this.logger,
    });
    
    this.pluginManager = new PluginManager({
      logger: this.logger,
    });
    
    this.initialize();
  }

  private initialize(): void {
    // Load plugins
    if (this.config.plugins) {
      for (const pluginConfig of this.config.plugins) {
        this.pluginManager.loadPlugin(pluginConfig);
      }
    }
    
    // Register event handlers
    this.setupEventHandlers();
    
    this.logger.info('Platform engine initialized', {
      version: this.config.version,
      templatesPath: this.config.templatesPath,
      pluginsLoaded: this.config.plugins?.length ?? 0,
    });
  }

  private setupEventHandlers(): void {
    this.on('error', (error: Error) => {
      this.logger.error('Platform engine error', error);
    });
  }

  async generateService(
    serviceConfig: ServiceConfig,
    options?: Partial<GeneratorOptions>,
  ): Promise<void> {
    try {
      // Validate service configuration
      const validatedConfig = validateServiceConfig(serviceConfig);
      
      // Merge options with defaults
      const generatorOptions: GeneratorOptions = {
        outputPath: options?.outputPath ?? path.join(this.config.outputPath, validatedConfig.name),
        force: options?.force ?? false,
        dryRun: options?.dryRun ?? false,
        verbose: options?.verbose ?? false,
        templateOverrides: options?.templateOverrides ?? {},
      };
      
      // Emit start event
      this.emitEvent('generator:started', {
        service: validatedConfig.name,
        type: validatedConfig.type,
        options: generatorOptions,
      });
      
      // Execute pre-generation plugins
      await this.pluginManager.executeHook('preGenerate', {
        config: validatedConfig,
        options: generatorOptions,
      });
      
      // Generate service
      await this.generatorEngine.generate(validatedConfig, generatorOptions);
      
      // Execute post-generation plugins
      await this.pluginManager.executeHook('postGenerate', {
        config: validatedConfig,
        options: generatorOptions,
      });
      
      // Emit completion event
      this.emitEvent('generator:completed', {
        service: validatedConfig.name,
        outputPath: generatorOptions.outputPath,
      });
      
      this.logger.info('Service generation completed', {
        service: validatedConfig.name,
        outputPath: generatorOptions.outputPath,
      });
    } catch (error) {
      // Emit failure event
      this.emitEvent('generator:failed', {
        service: serviceConfig.name,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  async validateConfig(config: ServiceConfig): Promise<boolean> {
    try {
      validateServiceConfig(config);
      return true;
    } catch (error) {
      this.logger.error('Configuration validation failed', error);
      return false;
    }
  }

  getAvailableTemplates(): string[] {
    return this.generatorEngine.getAvailableTemplates();
  }

  getLoadedPlugins(): string[] {
    return this.pluginManager.getLoadedPlugins();
  }

  private emitEvent(type: EventType, data: Record<string, unknown>): void {
    const event: PlatformEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    
    this.emit(type, event);
    
    if (this.config.generators.find(g => g.name === 'event-logger')?.enabled) {
      this.logger.debug(`Event: ${type}`, data);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down platform engine');
    
    // Cleanup plugins
    await this.pluginManager.shutdown();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}