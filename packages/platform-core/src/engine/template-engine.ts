import { promises as fs } from 'fs';
import Handlebars from 'handlebars';

import type { TemplateEngine as ITemplateEngine } from '../types/index.js';
import { TemplateError } from '../types/index.js';

export class TemplateEngine implements ITemplateEngine {
  private readonly handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // String manipulation helpers
    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
    });

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/\s+/g, '');
    });

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    });

    this.handlebars.registerHelper('upperCase', (str: string) => str.toUpperCase());
    this.handlebars.registerHelper('lowerCase', (str: string) => str.toLowerCase());

    // Comparison helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);

    // Logical helpers
    this.handlebars.registerHelper('and', (...args: any[]) => {
      // Remove the options hash from arguments
      const values = args.slice(0, -1);
      return values.every(Boolean);
    });

    this.handlebars.registerHelper('or', (...args: any[]) => {
      // Remove the options hash from arguments
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });

    this.handlebars.registerHelper('not', (value: any) => !value);

    // Array helpers
    this.handlebars.registerHelper('includes', (array: any[], value: any) => {
      return Array.isArray(array) && array.includes(value);
    });

    this.handlebars.registerHelper('join', (array: any[], separator: string) => {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    // Object helpers
    this.handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj, null, 2);
    });

    this.handlebars.registerHelper('keys', (obj: any) => {
      return Object.keys(obj || {});
    });

    this.handlebars.registerHelper('values', (obj: any) => {
      return Object.values(obj || {});
    });

    // Date helpers
    this.handlebars.registerHelper('date', (format?: string) => {
      const date = new Date();
      if (format === 'year') return date.getFullYear();
      if (format === 'month') return String(date.getMonth() + 1).padStart(2, '0');
      if (format === 'day') return String(date.getDate()).padStart(2, '0');
      return date.toISOString();
    });

    // Custom block helpers
    this.handlebars.registerHelper('repeat', (n: number, options: any) => {
      let result = '';
      for (let i = 0; i < n; i++) {
        result += options.fn(i);
      }
      return result;
    });

    this.handlebars.registerHelper('switch', function(this: any, value: any, options: any) {
      this._switch_value_ = value;
      const html = options.fn(this);
      delete this._switch_value_;
      return html;
    });

    this.handlebars.registerHelper('case', function(this: any, value: any, options: any) {
      if (value === this._switch_value_) {
        return options.fn(this);
      }
    });
  }

  render(template: string, data: Record<string, unknown>): string {
    try {
      const compiled = this.handlebars.compile(template);
      return compiled(data);
    } catch (error) {
      throw new TemplateError(
        `Failed to render template: ${error instanceof Error ? error.message : String(error)}`,
        { template: template.substring(0, 100) },
      );
    }
  }

  async renderFile(templatePath: string, data: Record<string, unknown>): Promise<string> {
    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      return this.render(template, data);
    } catch (error) {
      if (error instanceof TemplateError) {
        throw error;
      }
      
      throw new TemplateError(
        `Failed to render template file: ${templatePath}`,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    this.handlebars.registerHelper(name, helper);
  }

  registerPartial(name: string, partial: string): void {
    this.handlebars.registerPartial(name, partial);
  }
}