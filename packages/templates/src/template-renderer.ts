import { promises as fs } from 'fs';
import Handlebars from 'handlebars';
import ejs from 'ejs';
import { camelCase, pascalCase, kebabCase, snakeCase } from 'change-case';
import pluralize from 'pluralize';

import type { TemplateEngine } from '@devex/platform-core';
import { TemplateError } from '@devex/platform-core';

export type TemplateEngineType = 'handlebars' | 'ejs';

export interface TemplateRendererOptions {
  engine?: TemplateEngineType;
  helpers?: Record<string, (...args: any[]) => any>;
  partials?: Record<string, string>;
}

export class TemplateRenderer implements TemplateEngine {
  private readonly handlebars: typeof Handlebars;
  private readonly engine: TemplateEngineType;

  constructor(options: TemplateRendererOptions = {}) {
    this.engine = options.engine || 'handlebars';
    this.handlebars = Handlebars.create();
    
    this.registerDefaultHelpers();
    
    if (options.helpers) {
      for (const [name, helper] of Object.entries(options.helpers)) {
        this.registerHelper(name, helper);
      }
    }
    
    if (options.partials) {
      for (const [name, partial] of Object.entries(options.partials)) {
        this.registerPartial(name, partial);
      }
    }
  }

  render(template: string, data: Record<string, unknown>): string {
    try {
      if (this.engine === 'ejs') {
        return ejs.render(template, data);
      } else {
        const compiled = this.handlebars.compile(template);
        return compiled(data);
      }
    } catch (error) {
      throw new TemplateError(
        `Failed to render template: ${error instanceof Error ? error.message : String(error)}`,
        { template: template.substring(0, 200) },
      );
    }
  }

  async renderFile(templatePath: string, data: Record<string, unknown>): Promise<string> {
    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      
      if (this.engine === 'ejs') {
        return ejs.renderFile(templatePath, data);
      } else {
        return this.render(template, data);
      }
    } catch (error) {
      throw new TemplateError(
        `Failed to render template file: ${templatePath}`,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  registerHelper(name: string, helper: (...args: any[]) => any): void {
    if (this.engine === 'handlebars') {
      this.handlebars.registerHelper(name, helper);
    }
    // EJS doesn't have a direct helper registration, but we can add to global options
  }

  registerPartial(name: string, partial: string): void {
    if (this.engine === 'handlebars') {
      this.handlebars.registerPartial(name, partial);
    }
  }

  private registerDefaultHelpers(): void {
    if (this.engine !== 'handlebars') return;

    // Case conversion helpers
    this.handlebars.registerHelper('camelCase', (str: string) => camelCase(str));
    this.handlebars.registerHelper('pascalCase', (str: string) => pascalCase(str));
    this.handlebars.registerHelper('kebabCase', (str: string) => kebabCase(str));
    this.handlebars.registerHelper('snakeCase', (str: string) => snakeCase(str));
    this.handlebars.registerHelper('constantCase', (str: string) => 
      snakeCase(str).toUpperCase()
    );
    this.handlebars.registerHelper('dotCase', (str: string) => 
      kebabCase(str).replace(/-/g, '.')
    );
    this.handlebars.registerHelper('pathCase', (str: string) => 
      kebabCase(str).replace(/-/g, '/')
    );

    // String manipulation helpers
    this.handlebars.registerHelper('upperCase', (str: string) => str.toUpperCase());
    this.handlebars.registerHelper('lowerCase', (str: string) => str.toLowerCase());
    this.handlebars.registerHelper('capitalize', (str: string) => 
      str.charAt(0).toUpperCase() + str.slice(1)
    );
    this.handlebars.registerHelper('pluralize', (str: string) => pluralize.plural(str));
    this.handlebars.registerHelper('singularize', (str: string) => pluralize.singular(str));

    // Comparison helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);

    // Logical helpers
    this.handlebars.registerHelper('and', (...args: any[]) => {
      const values = args.slice(0, -1);
      return values.every(Boolean);
    });
    this.handlebars.registerHelper('or', (...args: any[]) => {
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });
    this.handlebars.registerHelper('not', (value: any) => !value);

    // Array helpers
    this.handlebars.registerHelper('includes', (array: any[], value: any) => 
      Array.isArray(array) && array.includes(value)
    );
    this.handlebars.registerHelper('join', (array: any[], separator: string = ',') => 
      Array.isArray(array) ? array.join(separator) : ''
    );
    this.handlebars.registerHelper('length', (array: any[]) => 
      Array.isArray(array) ? array.length : 0
    );
    this.handlebars.registerHelper('first', (array: any[]) => 
      Array.isArray(array) && array.length > 0 ? array[0] : undefined
    );
    this.handlebars.registerHelper('last', (array: any[]) => 
      Array.isArray(array) && array.length > 0 ? array[array.length - 1] : undefined
    );

    // Object helpers
    this.handlebars.registerHelper('json', (obj: any, spaces: number = 2) => 
      JSON.stringify(obj, null, spaces)
    );
    this.handlebars.registerHelper('keys', (obj: any) => Object.keys(obj || {}));
    this.handlebars.registerHelper('values', (obj: any) => Object.values(obj || {}));
    this.handlebars.registerHelper('entries', (obj: any) => Object.entries(obj || {}));

    // Date helpers
    this.handlebars.registerHelper('now', () => new Date().toISOString());
    this.handlebars.registerHelper('year', () => new Date().getFullYear());
    this.handlebars.registerHelper('date', (format?: string) => {
      const date = new Date();
      switch (format) {
        case 'iso': return date.toISOString();
        case 'date': return date.toDateString();
        case 'time': return date.toTimeString();
        case 'year': return date.getFullYear();
        case 'month': return date.getMonth() + 1;
        case 'day': return date.getDate();
        default: return date.toString();
      }
    });

    // Block helpers
    this.handlebars.registerHelper('repeat', (n: number, options: any) => {
      let result = '';
      for (let i = 0; i < n; i++) {
        result += options.fn({ index: i, first: i === 0, last: i === n - 1 });
      }
      return result;
    });

    this.handlebars.registerHelper('switch', function(this: any, value: any, options: any) {
      this._switch_value_ = value;
      this._switch_break_ = false;
      const html = options.fn(this);
      delete this._switch_value_;
      delete this._switch_break_;
      return html;
    });

    this.handlebars.registerHelper('case', function(this: any, value: any, options: any) {
      if (this._switch_break_) return '';
      if (value === this._switch_value_) {
        this._switch_break_ = true;
        return options.fn(this);
      }
    });

    this.handlebars.registerHelper('default', function(this: any, options: any) {
      if (this._switch_break_) return '';
      return options.fn(this);
    });

    // Conditional helpers
    this.handlebars.registerHelper('if_eq', (a: any, b: any, options: any) => {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    this.handlebars.registerHelper('if_ne', (a: any, b: any, options: any) => {
      return a !== b ? options.fn(this) : options.inverse(this);
    });

    this.handlebars.registerHelper('if_includes', (array: any[], value: any, options: any) => {
      const includes = Array.isArray(array) && array.includes(value);
      return includes ? options.fn(this) : options.inverse(this);
    });

    // Development helpers
    this.handlebars.registerHelper('debug', (value: any) => {
      console.log('Template Debug:', value);
      return '';
    });

    this.handlebars.registerHelper('inspect', (value: any) => {
      return JSON.stringify(value, null, 2);
    });
  }
}