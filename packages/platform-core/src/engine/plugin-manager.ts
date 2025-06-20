import path from 'path';

import type { PluginConfig, Logger } from '../types/index.js';
import { PlatformError } from '../types/index.js';

export interface Plugin {
  name: string;
  version: string;
  hooks?: PluginHooks;
  initialize?(context: PluginContext): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface PluginHooks {
  preGenerate?(context: HookContext): Promise<void>;
  postGenerate?(context: HookContext): Promise<void>;
  preValidate?(context: HookContext): Promise<void>;
  postValidate?(context: HookContext): Promise<void>;
}

export interface PluginContext {
  logger: Logger;
  config: Record<string, unknown>;
}

export interface HookContext {
  config: any;
  options: any;
  [key: string]: unknown;
}

export interface PluginManagerOptions {
  logger: Logger;
}

export class PluginManager {
  private readonly logger: Logger;
  private readonly plugins: Map<string, Plugin> = new Map();

  constructor(options: PluginManagerOptions) {
    this.logger = options.logger;
  }

  async loadPlugin(config: PluginConfig): Promise<void> {
    try {
      this.logger.debug(`Loading plugin: ${config.name} from ${config.path}`);

      // Resolve plugin path
      const pluginPath = path.isAbsolute(config.path)
        ? config.path
        : path.resolve(process.cwd(), config.path);

      // Dynamic import of plugin
      const pluginModule = await import(pluginPath);
      
      // Get the plugin instance
      const plugin: Plugin = pluginModule.default || pluginModule;

      // Validate plugin
      if (!plugin.name || !plugin.version) {
        throw new Error('Plugin must have name and version properties');
      }

      // Initialize plugin if it has an initialize method
      if (plugin.initialize) {
        await plugin.initialize({
          logger: this.logger,
          config: config.options || {},
        });
      }

      // Register plugin
      this.plugins.set(plugin.name, plugin);
      
      this.logger.info(`Plugin loaded: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      throw new PlatformError(
        `Failed to load plugin: ${config.name}`,
        'PLUGIN_LOAD_ERROR',
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  async executeHook(hookName: keyof PluginHooks, context: HookContext): Promise<void> {
    const plugins = Array.from(this.plugins.values());
    
    for (const plugin of plugins) {
      if (plugin.hooks && plugin.hooks[hookName]) {
        try {
          this.logger.debug(`Executing hook ${hookName} for plugin ${plugin.name}`);
          await plugin.hooks[hookName]!(context);
        } catch (error) {
          this.logger.error(
            `Plugin ${plugin.name} failed during hook ${hookName}`,
            error,
          );
          // Decide whether to continue or fail based on plugin configuration
          throw new PlatformError(
            `Plugin ${plugin.name} failed during hook ${hookName}`,
            'PLUGIN_HOOK_ERROR',
            { 
              plugin: plugin.name,
              hook: hookName,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }
    }
  }

  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  async shutdown(): Promise<void> {
    this.logger.debug('Shutting down plugins');
    
    // Shutdown all plugins in reverse order
    const plugins = Array.from(this.plugins.values()).reverse();
    
    for (const plugin of plugins) {
      if (plugin.shutdown) {
        try {
          await plugin.shutdown();
          this.logger.debug(`Plugin ${plugin.name} shutdown complete`);
        } catch (error) {
          this.logger.error(`Failed to shutdown plugin ${plugin.name}`, error);
        }
      }
    }
    
    this.plugins.clear();
  }
}