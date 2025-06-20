import Conf from 'conf';
import { join } from 'path';

interface ConfigSchema {
  api: {
    url?: string;
    timeout?: number;
  };
  auth: {
    token?: string;
    user?: {
      email: string;
      name: string;
      role: string;
      team: string;
    };
  };
  defaults: {
    environment?: string;
    region?: string;
  };
  output: {
    format?: 'table' | 'json' | 'yaml';
    colors?: boolean;
  };
  telemetry: {
    enabled?: boolean;
  };
  [key: string]: any;
}

const schema = {
  api: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      timeout: { type: 'number', minimum: 1000 },
    },
  },
  auth: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      user: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string' },
          team: { type: 'string' },
        },
      },
    },
  },
  defaults: {
    type: 'object',
    properties: {
      environment: { type: 'string', enum: ['development', 'staging', 'production'] },
      region: { type: 'string' },
    },
  },
  output: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['table', 'json', 'yaml'] },
      colors: { type: 'boolean' },
    },
  },
  telemetry: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
    },
  },
};

export const config = new Conf<ConfigSchema>({
  projectName: 'devex-cli',
  defaults: {
    api: {
      timeout: 30000,
    },
    defaults: {
      environment: 'development',
    },
    output: {
      format: 'table',
      colors: true,
    },
    telemetry: {
      enabled: true,
    },
  },
  schema: schema as any,
});