export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  framework?: string;
  features: string[];
  resources: {
    cpu: number;
    memory: number;
  };
}

export const templates: Template[] = [
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'Express.js API with TypeScript, authentication, and OpenAPI docs',
    category: 'backend',
    language: 'TypeScript',
    framework: 'Express.js',
    features: ['JWT Auth', 'OpenAPI', 'Validation', 'Error Handling', 'Logging'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'graphql-api',
    name: 'GraphQL API',
    description: 'Apollo Server with TypeScript, subscriptions, and DataLoader',
    category: 'backend',
    language: 'TypeScript',
    framework: 'Apollo Server',
    features: ['GraphQL', 'Subscriptions', 'DataLoader', 'Type Safety', 'Playground'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'grpc-service',
    name: 'gRPC Service',
    description: 'High-performance gRPC service with Protocol Buffers',
    category: 'backend',
    language: 'Go',
    framework: 'gRPC',
    features: ['Protocol Buffers', 'Streaming', 'TLS', 'Service Discovery', 'Load Balancing'],
    resources: { cpu: 0.25, memory: 0.5 },
  },
  {
    id: 'webapp-nextjs',
    name: 'Next.js App',
    description: 'Full-stack React application with SSR/SSG and API routes',
    category: 'frontend',
    language: 'TypeScript',
    framework: 'Next.js',
    features: ['React', 'SSR/SSG', 'API Routes', 'Tailwind CSS', 'SEO'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'webapp-vue',
    name: 'Vue.js App',
    description: 'Vue 3 application with Vite, Pinia, and Vue Router',
    category: 'frontend',
    language: 'TypeScript',
    framework: 'Vue.js',
    features: ['Vue 3', 'Vite', 'Pinia', 'Vue Router', 'Composition API'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'worker-service',
    name: 'Worker Service',
    description: 'Background job processor with queue management',
    category: 'backend',
    language: 'TypeScript',
    framework: 'Bull',
    features: ['Job Queue', 'Scheduling', 'Retries', 'Monitoring', 'Dead Letter Queue'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'websocket-server',
    name: 'WebSocket Server',
    description: 'Real-time WebSocket server with Socket.io',
    category: 'backend',
    language: 'TypeScript',
    framework: 'Socket.io',
    features: ['WebSockets', 'Rooms', 'Namespaces', 'Authentication', 'Scaling'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'microservice-python',
    name: 'Python Microservice',
    description: 'FastAPI microservice with async support',
    category: 'backend',
    language: 'Python',
    framework: 'FastAPI',
    features: ['Async', 'Type Hints', 'OpenAPI', 'Pydantic', 'Testing'],
    resources: { cpu: 0.5, memory: 1 },
  },
  {
    id: 'serverless-function',
    name: 'Serverless Function',
    description: 'Serverless function with AWS Lambda compatibility',
    category: 'serverless',
    language: 'TypeScript',
    framework: 'Serverless Framework',
    features: ['Lambda', 'API Gateway', 'DynamoDB', 'S3', 'CloudWatch'],
    resources: { cpu: 0.25, memory: 0.5 },
  },
  {
    id: 'static-site',
    name: 'Static Site',
    description: 'Static site with Hugo and automatic deployments',
    category: 'frontend',
    language: 'Markdown',
    framework: 'Hugo',
    features: ['Markdown', 'Themes', 'SEO', 'CDN', 'GitHub Actions'],
    resources: { cpu: 0.1, memory: 0.25 },
  },
];

export function getTemplateById(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): Template[] {
  return templates.filter(t => t.category === category);
}

export function getTemplatesByLanguage(language: string): Template[] {
  return templates.filter(t => t.language === language);
}