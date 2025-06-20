const http = require('http');
const url = require('url');

const templates = [
  { id: 1, name: 'REST API Template', technology: 'Node.js', description: 'Express.js REST API with TypeScript' },
  { id: 2, name: 'GraphQL API Template', technology: 'Node.js', description: 'Apollo GraphQL server with type-graphql' },
  { id: 3, name: 'FastAPI Template', technology: 'Python', description: 'Modern async Python API' },
  { id: 4, name: 'Gin API Template', technology: 'Go', description: 'High-performance Go web service' },
  { id: 5, name: 'Next.js Webapp', technology: 'React', description: 'Full-stack React application' }
];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'healthy', service: 'DevX API' }));
  } else if (parsedUrl.pathname === '/api/templates') {
    res.writeHead(200);
    res.end(JSON.stringify({ templates }));
  } else if (parsedUrl.pathname === '/api/generate') {
    const template = templates[Math.floor(Math.random() * templates.length)];
    res.writeHead(200);
    res.end(JSON.stringify({ 
      message: 'Service generated successfully!', 
      template: template.name,
      service_name: 'my-new-service',
      status: 'ready_to_deploy'
    }));
  } else {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      message: 'DevX Platform API', 
      version: '1.0.0',
      endpoints: ['/health', '/api/templates', '/api/generate']
    }));
  }
});

server.listen(3001, () => {
  console.log('✅ DevX API running on http://localhost:3001');
});