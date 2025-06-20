#!/bin/bash

# Quick DevX Platform Demo
set -e

echo "🚀 Starting DevX Platform Demo..."

# Create a simple demo structure
mkdir -p demo/{api,portal}

# Create simple API
cat > demo/api/server.js << 'EOF'
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
EOF

# Create simple Portal
cat > demo/portal/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevX Platform - Developer Experience Portal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
            color: white;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 3rem; }
        .header h1 { 
            font-size: 3rem; 
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
        }
        .header p { font-size: 1.2rem; color: #888; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 3rem; }
        .card { 
            background: rgba(26, 26, 26, 0.8);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 2rem;
            backdrop-filter: blur(10px);
            transition: transform 0.2s, border-color 0.2s;
        }
        .card:hover { transform: translateY(-4px); border-color: #3b82f6; }
        .card h3 { color: #3b82f6; margin-bottom: 1rem; }
        .templates { margin-top: 2rem; }
        .template-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
        .template { 
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .template:hover { background: rgba(59, 130, 246, 0.2); }
        .btn { 
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: transform 0.2s;
        }
        .btn:hover { transform: scale(1.05); }
        .status { 
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(34, 197, 94, 0.9);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .demo-actions { text-align: center; margin: 2rem 0; }
        .demo-actions button { margin: 0 1rem; }
        #result { margin-top: 2rem; padding: 1rem; background: rgba(34, 197, 94, 0.1); border-radius: 8px; display: none; }
    </style>
</head>
<body>
    <div class="status">🟢 Platform Online</div>
    
    <div class="container">
        <div class="header">
            <h1>DevX Platform</h1>
            <p>Enterprise-Grade Developer Experience Platform</p>
            <p style="margin-top: 0.5rem; font-size: 1rem; color: #666;">
                Generate production-ready microservices in under 30 seconds
            </p>
        </div>

        <div class="cards">
            <div class="card">
                <h3>🚀 Service Generation</h3>
                <p>Lightning-fast service generator supporting Node.js, Python, Go, Java, and Rust with production-ready boilerplate.</p>
            </div>
            <div class="card">
                <h3>🔒 Security First</h3>
                <p>Built-in security patterns: JWT auth, rate limiting, CORS, input validation, and comprehensive error handling.</p>
            </div>
            <div class="card">
                <h3>📊 Observability</h3>
                <p>Structured logging, distributed tracing, and Prometheus metrics configured out of the box.</p>
            </div>
            <div class="card">
                <h3>☁️ Cloud Ready</h3>
                <p>Kubernetes manifests, Terraform modules, and CI/CD pipelines included with every generated service.</p>
            </div>
        </div>

        <div class="templates">
            <h2 style="margin-bottom: 1rem;">Available Templates</h2>
            <div class="template-grid" id="templates">
                <!-- Templates loaded here -->
            </div>
        </div>

        <div class="demo-actions">
            <button class="btn" onclick="generateService()">🎯 Generate Service Demo</button>
            <button class="btn" onclick="showCLI()">💻 CLI Commands</button>
            <button class="btn" onclick="showFeatures()">✨ Platform Features</button>
        </div>

        <div id="result"></div>
    </div>

    <script>
        // Load templates
        fetch('http://localhost:3001/api/templates')
            .then(res => res.json())
            .then(data => {
                const templatesDiv = document.getElementById('templates');
                data.templates.forEach(template => {
                    const div = document.createElement('div');
                    div.className = 'template';
                    div.innerHTML = `
                        <h4>${template.name}</h4>
                        <p style="color: #888; font-size: 0.9rem;">${template.technology}</p>
                        <p style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">${template.description || 'Production-ready template'}</p>
                    `;
                    div.onclick = () => selectTemplate(template);
                    templatesDiv.appendChild(div);
                });
            })
            .catch(err => {
                console.error('API connection failed:', err);
                document.getElementById('templates').innerHTML = '<p style="color: #ff6b6b;">Demo mode - API offline</p>';
            });

        function selectTemplate(template) {
            alert(`Selected: ${template.name}\n\nIn the full platform, this would:\n• Generate ${template.technology} service\n• Set up database connections\n• Configure CI/CD pipeline\n• Create Kubernetes manifests\n• Deploy to your environment`);
        }

        function generateService() {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<h3>🎉 Service Generated Successfully!</h3><p>Your new microservice is ready to deploy with:</p><ul><li>✅ Production-ready code structure</li><li>✅ Security middleware configured</li><li>✅ Database connections set up</li><li>✅ Docker containers built</li><li>✅ Tests written (90% coverage)</li><li>✅ CI/CD pipeline created</li></ul><p><strong>Next steps:</strong> Deploy with <code>kubectl apply -f manifests/</code></p>';
            
            // Simulate API call
            fetch('http://localhost:3001/api/generate')
                .then(res => res.json())
                .then(data => console.log('Generated:', data))
                .catch(err => console.log('Demo mode'));
        }

        function showCLI() {
            alert(`DevX CLI Commands:

🚀 Generate Services:
devex create api user-service --auth jwt --db postgres
devex create webapp dashboard --framework nextjs
devex create worker email-processor --queue redis

📊 Manage Services:
devex list
devex deploy user-service
devex logs user-service --follow
devex status

⚙️ Configuration:
devex config set cluster production
devex auth login
devex templates list`);
        }

        function showFeatures() {
            alert(`🔥 Platform Features:

CODE GENERATION:
• Multi-language support (Node.js, Python, Go, Java, Rust)
• Production boilerplate with 12-factor principles
• 90% test coverage out of the box

SECURITY & OBSERVABILITY:
• JWT authentication, rate limiting, CORS
• Structured logging, distributed tracing
• Prometheus metrics, health checks

INFRASTRUCTURE:
• Kubernetes manifests with HPA, PDB
• Terraform modules for AWS/GCP
• CI/CD pipelines with progressive deployment

DEVELOPER EXPERIENCE:
• One-click service generation
• Real-time cost tracking
• Dependency visualization
• Template marketplace`);
        }
    </script>
</body>
</html>
EOF

# Start the services
echo "🔧 Starting API server..."
cd demo/api && node server.js &
API_PID=$!

echo "🌐 Starting Portal server..."
cd ../portal && python3 -m http.server 3000 > /dev/null 2>&1 &
PORTAL_PID=$!

cd ../../

# Wait a moment for services to start
sleep 2

echo ""
echo "✅ DevX Platform Demo is running!"
echo ""
echo "🌐 Portal UI:  http://localhost:3000"  
echo "🔧 API:        http://localhost:3001"
echo ""
echo "💡 Try the demo features:"
echo "   • Browse service templates"
echo "   • Generate a service demo"  
echo "   • View CLI commands"
echo ""
echo "Press Ctrl+C to stop the demo"

# Open browser
open http://localhost:3000

# Wait for interrupt
trap "kill $API_PID $PORTAL_PID 2>/dev/null; echo; echo '🛑 Demo stopped'; exit 0" INT
wait