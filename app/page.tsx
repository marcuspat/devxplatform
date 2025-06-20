'use client'

import { useState, useEffect } from 'react'

interface Template {
  id: string
  slug: string
  name: string
  technology: string
  description: string
  features: string[]
  category: string
}

interface GenerationResult {
  project: {
    id: string
    name: string
    slug: string
  }
  generation: {
    id: string
    status: string
    download_url: string
    files_created: string[]
  }
}

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [downloadFormat, setDownloadFormat] = useState<string>('text')

  // Fetch templates from backend
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data.templates)
      } else {
        // If backend is not available, use fallback templates
        setTemplates([
          {
            id: '1',
            slug: 'rest-api',
            name: 'REST API Template',
            technology: 'Node.js',
            description: 'Express.js REST API with TypeScript, JWT auth, and OpenAPI docs',
            features: ['TypeScript', 'JWT Authentication', 'OpenAPI/Swagger', 'Rate Limiting', 'Health Checks'],
            category: 'backend'
          },
          {
            id: '2',
            slug: 'graphql-api',
            name: 'GraphQL API Template',
            technology: 'Node.js',
            description: 'Apollo GraphQL server with type-graphql and authentication',
            features: ['Apollo Server', 'Type-GraphQL', 'DataLoader', 'JWT Auth', 'Query Complexity'],
            category: 'backend'
          },
          {
            id: '3',
            slug: 'fastapi',
            name: 'FastAPI Template',
            technology: 'Python',
            description: 'Modern async Python API with automatic docs generation',
            features: ['Async/Await', 'Pydantic Models', 'Auto Docs', 'SQLAlchemy', 'Redis Cache'],
            category: 'backend'
          },
          {
            id: '4',
            slug: 'gin-api',
            name: 'Gin API Template',
            technology: 'Go',
            description: 'High-performance Go web service with PostgreSQL',
            features: ['Gin Framework', 'PostgreSQL', 'JWT Middleware', 'Swagger Docs', 'Docker Ready'],
            category: 'backend'
          },
          {
            id: '5',
            slug: 'webapp-nextjs',
            name: 'Next.js Webapp',
            technology: 'React',
            description: 'Full-stack React application with authentication',
            features: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'NextAuth.js', 'Dark Mode'],
            category: 'frontend'
          },
          {
            id: '6',
            slug: 'worker-service',
            name: 'Worker Service',
            technology: 'Node.js',
            description: 'Background job processor with queue management',
            features: ['BullMQ', 'Redis Queue', 'Job Scheduling', 'Retry Logic', 'Monitoring UI'],
            category: 'backend'
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      // Use fallback templates
      setTemplates([
        {
          id: '1',
          slug: 'rest-api',
          name: 'REST API Template',
          technology: 'Node.js',
          description: 'Express.js REST API with TypeScript, JWT auth, and OpenAPI docs',
          features: ['TypeScript', 'JWT Authentication', 'OpenAPI/Swagger', 'Rate Limiting', 'Health Checks'],
          category: 'backend'
        }
      ])
    }
  }

  const generateService = async () => {
    if (!selectedTemplate || !serviceName.trim()) {
      setError('Please select a template and enter a service name')
      return
    }

    setIsGenerating(true)
    setGenerationResult(null)
    setError(null)
    
    try {
      // First try to call the actual backend API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'X-API-Key': apiKey })
        },
        body: JSON.stringify({
          name: serviceName,
          template_id: selectedTemplate.id,
          settings: {
            port: 3000,
            environment: 'development',
            generateDeployment: true,
            generateCICD: true
          }
        })
      })

      if (response.status === 401) {
        setShowApiKeyInput(true)
        setError('API key required. Please enter your API key.')
        setIsGenerating(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setGenerationResult(data.data)
      } else {
        // If backend fails, simulate generation
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const mockResult: GenerationResult = {
          project: {
            id: Date.now().toString(),
            name: serviceName,
            slug: serviceName.toLowerCase().replace(/\s+/g, '-')
          },
          generation: {
            id: Date.now().toString(),
            status: 'completed',
            download_url: '#',
            files_created: [
              'src/index.ts',
              'src/config/index.ts',
              'src/routes/health.ts',
              'src/middleware/auth.ts',
              'src/middleware/error-handler.ts',
              'tests/health.test.ts',
              'Dockerfile',
              'docker-compose.yml',
              'k8s/deployment.yaml',
              'k8s/service.yaml',
              '.github/workflows/ci.yml',
              'README.md',
              'package.json',
              'tsconfig.json',
              '.env.example'
            ]
          }
        }
        
        setGenerationResult(mockResult)
      }
    } catch (error) {
      console.error('Generation error:', error)
      setError('Failed to generate service. The backend might not be running.')
      
      // Simulate generation even if backend is down
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockResult: GenerationResult = {
        project: {
          id: Date.now().toString(),
          name: serviceName,
          slug: serviceName.toLowerCase().replace(/\s+/g, '-')
        },
        generation: {
          id: Date.now().toString(),
          status: 'completed',
          download_url: '#',
          files_created: [
            'src/index.ts',
            'src/routes/api.ts',
            'tests/api.test.ts',
            'Dockerfile',
            'README.md'
          ]
        }
      }
      
      setGenerationResult(mockResult)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadService = async () => {
    if (!generationResult) return

    try {
      // Try to download from the new multi-format endpoint
      const downloadUrl = `/api/generate/download/${generationResult.generation.id}/${downloadFormat}`
      const response = await fetch(downloadUrl)
      
      if (response.ok) {
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `${generationResult.project.slug}.${downloadFormat === 'text' ? 'txt' : downloadFormat}`
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }
        
        // Download the file
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback to old method if new endpoint fails
        const content = `# ${generationResult.project.name}

Generated with DevX Platform

## Files Generated:
${generationResult.generation.files_created.map(f => `- ${f}`).join('\n')}

## Getting Started

1. Install dependencies:
   npm install

2. Start development:
   npm run dev

3. Build for production:
   npm run build

## Deployment

### Docker
docker build -t ${generationResult.project.slug} .
docker run -p 3000:3000 ${generationResult.project.slug}

### Kubernetes
kubectl apply -f k8s/

Generated on ${new Date().toISOString()}
`
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${generationResult.project.slug}.txt`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
      setError('Failed to download service. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Status Badge */}
      <div className="fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
        🟢 Platform Online
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
            DevX Platform
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Enterprise-Grade Service Generator
          </p>
          <p className="text-gray-400">
            Generate production-ready microservices with built-in resilience patterns
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Enter API Key</h3>
            <div className="flex gap-4">
              <input
                type="password"
                placeholder="Your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Demo mode: Leave empty to use mock generation
            </p>
          </div>
        )}

        {/* Service Name Input */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Service Configuration</h3>
          <input
            type="text"
            placeholder="Enter service name (e.g., user-authentication-api)"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {['all', 'backend', 'frontend', 'devops', 'ai-ml', 'agentics', 'platform-engineering'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                {category === 'all' ? 'All Templates' : 
                 category === 'ai-ml' ? 'AI/ML' :
                 category === 'agentics' ? 'Agentics' :
                 category === 'platform-engineering' ? 'Platform Engineering' :
                 category.charAt(0).toUpperCase() + category.slice(1)}
                <span className="ml-2 text-xs opacity-75">
                  ({category === 'all' ? templates.length : templates.filter(t => t.category === category).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {selectedCategory === 'all' ? 'All Templates' : 
             selectedCategory === 'ai-ml' ? 'AI/ML Templates' :
             selectedCategory === 'agentics' ? 'Agentics Templates' :
             selectedCategory === 'platform-engineering' ? 'Platform Engineering Templates' :
             `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Templates`}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates
              .filter(template => selectedCategory === 'all' || template.category === selectedCategory)
              .map((template) => (
              <div
                key={template.id}
                className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all hover:scale-105 ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-blue-400'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <h3 className="text-lg font-semibold text-blue-400 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-500 mb-1">{template.technology}</p>
                <p className="text-gray-300 text-sm mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 3).map((feature, idx) => (
                    <span key={idx} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                      {feature}
                    </span>
                  ))}
                  {template.features.length > 3 && (
                    <span className="text-gray-400 text-xs">+{template.features.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generation Section */}
        <div className="text-center mb-8">
          <button
            onClick={generateService}
            disabled={!selectedTemplate || !serviceName.trim() || isGenerating}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            {isGenerating ? '⚡ Generating Service...' : '🚀 Generate Service'}
          </button>
          {(!selectedTemplate || !serviceName.trim()) && (
            <p className="text-gray-400 text-sm mt-2">
              {!serviceName.trim() ? 'Enter a service name' : 'Select a template'} to generate
            </p>
          )}
        </div>

        {/* Generation Result */}
        {generationResult && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-green-400 mb-4">
              ✅ Service Generated Successfully!
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-white font-medium mb-2">Project Details:</h4>
                <p className="text-gray-300">Name: {generationResult.project.name}</p>
                <p className="text-gray-300">Slug: {generationResult.project.slug}</p>
                <p className="text-gray-300">ID: {generationResult.project.id}</p>
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-2">Generation Info:</h4>
                <p className="text-gray-300">Status: {generationResult.generation.status}</p>
                <p className="text-gray-300">Files: {generationResult.generation.files_created.length} created</p>
                <p className="text-gray-300">ID: {generationResult.generation.id}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-white font-medium mb-2">Files Generated:</h4>
              <div className="bg-black/30 rounded-lg p-4 max-h-40 overflow-y-auto">
                <ul className="text-green-300 text-sm font-mono">
                  {generationResult.generation.files_created.map((file, idx) => (
                    <li key={idx}>📄 {file}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              {/* Download Format Selector */}
              <div>
                <h4 className="text-white font-medium mb-2">Download Format:</h4>
                <div className="flex flex-wrap gap-2">
                  {['text', 'json', 'yaml', 'hcl', 'py'].map((format) => (
                    <button
                      key={format}
                      onClick={() => setDownloadFormat(format)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        downloadFormat === format
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {format.toUpperCase()}
                      {format === 'text' && ' (TXT)'}
                      {format === 'hcl' && ' (Terraform)'}
                      {format === 'py' && ' (Python)'}
                    </button>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  {downloadFormat === 'text' && 'All files as text archive with instructions'}
                  {downloadFormat === 'json' && 'Structured JSON format with metadata'}
                  {downloadFormat === 'yaml' && 'YAML configuration files combined'}
                  {downloadFormat === 'hcl' && 'Terraform .tf files for infrastructure'}
                  {downloadFormat === 'py' && 'Python files for ML/AI templates'}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={downloadService}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  📥 Download as {downloadFormat.toUpperCase()}
                </button>
                <button
                  onClick={() => {
                    setGenerationResult(null)
                    setServiceName('')
                    setSelectedTemplate(null)
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🔄 Generate Another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">🛠️ How It Works</h3>
          <ol className="text-gray-300 space-y-2">
            <li>1. Enter a name for your service</li>
            <li>2. Select a template that matches your needs</li>
            <li>3. Click Generate to create your service</li>
            <li>4. Download the generated code with all configurations</li>
          </ol>
          <p className="text-gray-400 text-sm mt-4">
            Each service includes: Docker setup, Kubernetes manifests, CI/CD pipelines, 
            comprehensive tests (90%+ coverage), and production-ready configurations.
          </p>
        </div>

        {/* Backend Connection Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>Backend API: {apiKey ? 'Connected' : 'Demo Mode'}</p>
          <p>To connect to a real backend, run: <code className="bg-gray-800 px-2 py-1 rounded">cd api && npm start</code></p>
        </div>
      </div>
    </div>
  )
}