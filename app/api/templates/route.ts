import { NextResponse } from 'next/server'

// Enhanced templates including DevOps and AI/ML templates
const mockTemplates = [
  // Original Backend Templates
  {
    id: '1',
    slug: 'rest-api',
    name: 'REST API Template',
    technology: 'Node.js',
    description: 'Express.js REST API with TypeScript, JWT auth, and OpenAPI docs',
    features: ['TypeScript', 'JWT Authentication', 'OpenAPI/Swagger', 'Rate Limiting', 'Health Checks'],
    category: 'backend',
    downloads: 1250,
    rating: 4.8
  },
  {
    id: '2',
    slug: 'graphql-api',
    name: 'GraphQL API Template',
    technology: 'Node.js',
    description: 'Apollo GraphQL server with type-graphql and authentication',
    features: ['Apollo Server', 'Type-GraphQL', 'DataLoader', 'JWT Auth', 'Query Complexity'],
    category: 'backend',
    downloads: 890,
    rating: 4.7
  },
  {
    id: '3',
    slug: 'fastapi',
    name: 'FastAPI Template',
    technology: 'Python',
    description: 'Modern async Python API with automatic docs generation',
    features: ['Async/Await', 'Pydantic Models', 'Auto Docs', 'SQLAlchemy', 'Redis Cache'],
    category: 'backend',
    downloads: 2100,
    rating: 4.9
  },
  {
    id: '4',
    slug: 'gin-api',
    name: 'Gin API Template',
    technology: 'Go',
    description: 'High-performance Go web service with PostgreSQL',
    features: ['Gin Framework', 'PostgreSQL', 'JWT Middleware', 'Swagger Docs', 'Docker Ready'],
    category: 'backend',
    downloads: 670,
    rating: 4.6
  },
  {
    id: '5',
    slug: 'webapp-nextjs',
    name: 'Next.js Webapp',
    technology: 'React',
    description: 'Full-stack React application with authentication',
    features: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'NextAuth.js', 'Dark Mode'],
    category: 'frontend',
    downloads: 3400,
    rating: 4.9
  },
  {
    id: '6',
    slug: 'worker-service',
    name: 'Worker Service',
    technology: 'Node.js',
    description: 'Background job processor with queue management',
    features: ['BullMQ', 'Redis Queue', 'Job Scheduling', 'Retry Logic', 'Monitoring UI'],
    category: 'backend',
    downloads: 540,
    rating: 4.5
  },

  // DevOps Templates
  {
    id: '7',
    slug: 'k8s-microservices',
    name: 'K8s Microservices Stack',
    technology: 'Kubernetes',
    description: 'Production-ready Kubernetes manifests for microservices architecture',
    features: ['Service Mesh (Istio)', 'Ingress Controller', 'HPA', 'Network Policies', 'RBAC', 'Prometheus Monitoring'],
    category: 'devops',
    downloads: 2850,
    rating: 4.9
  },
  {
    id: '8',
    slug: 'terraform-aws',
    name: 'Terraform AWS Infrastructure',
    technology: 'Terraform',
    description: 'Complete AWS infrastructure as code with best practices',
    features: ['VPC & Networking', 'EKS Cluster', 'RDS Multi-AZ', 'S3 Buckets', 'IAM Roles', 'CloudWatch'],
    category: 'devops',
    downloads: 3200,
    rating: 4.8
  },
  {
    id: '9',
    slug: 'helm-chart',
    name: 'Helm Chart Template',
    technology: 'Helm',
    description: 'Production-grade Helm chart with advanced templating',
    features: ['ConfigMaps', 'Secrets', 'HPA', 'PDB', 'Service Monitor', 'Ingress'],
    category: 'devops',
    downloads: 1890,
    rating: 4.7
  },
  {
    id: '10',
    slug: 'argocd-gitops',
    name: 'ArgoCD GitOps Pipeline',
    technology: 'ArgoCD',
    description: 'Complete GitOps setup with ArgoCD applications and app-of-apps pattern',
    features: ['App of Apps', 'Multi-Environment', 'Sync Waves', 'Health Checks', 'Notifications', 'RBAC'],
    category: 'devops',
    downloads: 1450,
    rating: 4.8
  },
  {
    id: '11',
    slug: 'prometheus-grafana',
    name: 'Prometheus & Grafana Stack',
    technology: 'Monitoring',
    description: 'Complete observability stack with Prometheus, Grafana, and AlertManager',
    features: ['Service Discovery', 'Custom Dashboards', 'Alert Rules', 'Recording Rules', 'Loki Logging', 'Tempo Tracing'],
    category: 'devops',
    downloads: 2100,
    rating: 4.9
  },
  {
    id: '12',
    slug: 'ci-cd-pipeline',
    name: 'CI/CD Pipeline Template',
    technology: 'GitHub Actions',
    description: 'Multi-stage CI/CD pipeline with security scanning and deployment',
    features: ['Build & Test', 'SAST/DAST', 'Container Scan', 'Multi-Environment Deploy', 'Rollback', 'Notifications'],
    category: 'devops',
    downloads: 3500,
    rating: 4.8
  },

  // AI/ML Templates
  {
    id: '13',
    slug: 'ml-training-pipeline',
    name: 'ML Training Pipeline',
    technology: 'Kubeflow',
    description: 'End-to-end ML pipeline with experiment tracking and model versioning',
    features: ['Kubeflow Pipelines', 'MLflow Tracking', 'DVC', 'Hyperparameter Tuning', 'Distributed Training', 'Model Registry'],
    category: 'ai-ml',
    downloads: 1650,
    rating: 4.7
  },
  {
    id: '14',
    slug: 'model-serving-api',
    name: 'Model Serving API',
    technology: 'FastAPI + TorchServe',
    description: 'Production ML model serving with auto-scaling and A/B testing',
    features: ['TorchServe', 'ONNX Runtime', 'Model Versioning', 'A/B Testing', 'Batch Inference', 'GPU Support'],
    category: 'ai-ml',
    downloads: 1320,
    rating: 4.8
  },
  {
    id: '15',
    slug: 'llm-ops-stack',
    name: 'LLMOps Stack',
    technology: 'LangChain',
    description: 'Complete LLM application stack with RAG, vector DB, and monitoring',
    features: ['LangChain', 'Vector Database', 'RAG Pipeline', 'Prompt Management', 'Token Tracking', 'Evaluation Suite'],
    category: 'ai-ml',
    downloads: 2800,
    rating: 4.9
  },
  {
    id: '16',
    slug: 'gpu-cluster-k8s',
    name: 'GPU Cluster on K8s',
    technology: 'Kubernetes + NVIDIA',
    description: 'Kubernetes configuration for GPU workloads with NVIDIA operators',
    features: ['NVIDIA GPU Operator', 'Time Slicing', 'MIG Support', 'Node Feature Discovery', 'GPU Monitoring', 'DCGM Exporter'],
    category: 'ai-ml',
    downloads: 980,
    rating: 4.7
  },
  {
    id: '17',
    slug: 'mlops-platform',
    name: 'MLOps Platform',
    technology: 'Airflow + MLflow',
    description: 'Complete MLOps platform with orchestration, tracking, and deployment',
    features: ['Airflow DAGs', 'MLflow Server', 'Feature Store', 'Model Monitoring', 'Data Validation', 'CI/CD Integration'],
    category: 'ai-ml',
    downloads: 1560,
    rating: 4.8
  },
  {
    id: '18',
    slug: 'vector-search-api',
    name: 'Vector Search API',
    technology: 'Python + Qdrant',
    description: 'High-performance vector similarity search API for AI applications',
    features: ['Qdrant Vector DB', 'Embedding Models', 'Hybrid Search', 'Real-time Indexing', 'Clustering', 'API Gateway'],
    category: 'ai-ml',
    downloads: 1100,
    rating: 4.6
  },

  // Infrastructure as Code
  {
    id: '19',
    slug: 'terraform-gcp',
    name: 'Terraform GCP Infrastructure',
    technology: 'Terraform',
    description: 'Google Cloud Platform infrastructure with GKE, Cloud SQL, and networking',
    features: ['GKE Autopilot', 'Cloud SQL', 'VPC & Subnets', 'Cloud Armor', 'IAM Bindings', 'Workload Identity'],
    category: 'devops',
    downloads: 1780,
    rating: 4.7
  },
  {
    id: '20',
    slug: 'pulumi-typescript',
    name: 'Pulumi TypeScript IaC',
    technology: 'Pulumi',
    description: 'Infrastructure as code using TypeScript with multi-cloud support',
    features: ['TypeScript Native', 'Multi-Cloud', 'State Management', 'Policy as Code', 'Stack References', 'Secrets Management'],
    category: 'devops',
    downloads: 920,
    rating: 4.6
  },
  {
    id: '21',
    slug: 'crossplane-platform',
    name: 'Crossplane Platform',
    technology: 'Crossplane',
    description: 'Kubernetes-native infrastructure management with composition',
    features: ['Compositions', 'Provider AWS/GCP/Azure', 'XRDs', 'Claim Model', 'GitOps Ready', 'Multi-Tenancy'],
    category: 'devops',
    downloads: 650,
    rating: 4.5
  },

  // Security & Compliance
  {
    id: '22',
    slug: 'security-scanning',
    name: 'Security Scanning Pipeline',
    technology: 'DevSecOps',
    description: 'Comprehensive security scanning pipeline with multiple tools',
    features: ['Trivy Scanning', 'OWASP ZAP', 'SonarQube', 'Dependency Check', 'Secret Detection', 'SBOM Generation'],
    category: 'devops',
    downloads: 1420,
    rating: 4.8
  },
  {
    id: '23',
    slug: 'istio-service-mesh',
    name: 'Istio Service Mesh',
    technology: 'Istio',
    description: 'Complete service mesh setup with mTLS, traffic management, and observability',
    features: ['mTLS', 'Traffic Management', 'Circuit Breaking', 'Distributed Tracing', 'Canary Deployments', 'Rate Limiting'],
    category: 'devops',
    downloads: 1230,
    rating: 4.7
  },
  {
    id: '24',
    slug: 'vault-secrets',
    name: 'HashiCorp Vault Setup',
    technology: 'Vault',
    description: 'Enterprise secrets management with Vault and Kubernetes integration',
    features: ['KV Secrets Engine', 'Dynamic Secrets', 'PKI Engine', 'Kubernetes Auth', 'Auto-Unseal', 'Audit Logging'],
    category: 'devops',
    downloads: 1850,
    rating: 4.8
  }
]

export async function GET() {
  try {
    // Try to fetch from backend if running
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'
    const response = await fetch(`${backendUrl}/api/templates`, {
      next: { revalidate: 60 } // Cache for 1 minute
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
  } catch {
    // Backend not available, will use mock data
  }
  
  // Return mock data if backend is not available
  return NextResponse.json({
    success: true,
    message: 'Templates retrieved successfully',
    data: {
      templates: mockTemplates,
      pagination: {
        limit: 50,
        offset: 0,
        total: mockTemplates.length
      }
    }
  })
}