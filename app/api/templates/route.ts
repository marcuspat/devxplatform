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
    id: '43',
    slug: 'terraform-azure',
    name: 'Terraform Azure Infrastructure',
    technology: 'Terraform',
    description: 'Azure infrastructure with AKS, Azure SQL, and virtual networks',
    features: ['AKS Cluster', 'Azure SQL', 'Virtual Networks', 'Key Vault', 'Application Gateway', 'Azure Monitor'],
    category: 'devops',
    downloads: 1650,
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
  },

  // Platform Engineering Templates
  {
    id: '25',
    slug: 'backstage-idp',
    name: 'Backstage Developer Portal',
    technology: 'Backstage',
    description: 'Spotify Backstage IDP with software catalog, templates, and plugins',
    features: ['Software Catalog', 'TechDocs', 'Templates', 'Scaffolder', 'Kubernetes Plugin', 'GitHub Integration'],
    category: 'platform-engineering',
    downloads: 2340,
    rating: 4.8
  },
  {
    id: '26',
    slug: 'fluxcd-gitops',
    name: 'FluxCD GitOps Platform',
    technology: 'FluxCD',
    description: 'Complete GitOps platform with FluxCD v2, multi-tenancy, and progressive delivery',
    features: ['GitOps Toolkit', 'Kustomize', 'Helm Controller', 'Image Automation', 'Multi-Tenancy', 'Flagger Integration'],
    category: 'platform-engineering',
    downloads: 1920,
    rating: 4.7
  },
  {
    id: '27',
    slug: 'tekton-ci',
    name: 'Tekton CI/CD Platform',
    technology: 'Tekton',
    description: 'Cloud-native CI/CD with Tekton pipelines, triggers, and dashboard',
    features: ['Pipeline as Code', 'Event Triggers', 'Task Catalog', 'Multi-Cloud', 'Dashboard UI', 'Results API'],
    category: 'platform-engineering',
    downloads: 1560,
    rating: 4.6
  },
  {
    id: '28',
    slug: 'kratix-platform',
    name: 'Kratix Platform as a Product',
    technology: 'Kratix',
    description: 'Platform-as-a-Product framework for building internal platforms',
    features: ['Promise-Based API', 'Multi-Cluster', 'GitOps Native', 'Resource Composition', 'Platform Templates', 'State Store'],
    category: 'platform-engineering',
    downloads: 780,
    rating: 4.5
  },
  {
    id: '29',
    slug: 'port-developer-portal',
    name: 'Port Developer Portal',
    technology: 'Port',
    description: 'Internal developer portal with service catalog and self-service actions',
    features: ['Service Catalog', 'Self-Service Actions', 'Scorecards', 'Blueprints', 'Integrations Hub', 'RBAC'],
    category: 'platform-engineering',
    downloads: 1120,
    rating: 4.7
  },
  {
    id: '30',
    slug: 'humanitec-platform',
    name: 'Humanitec Platform Orchestrator',
    technology: 'Humanitec',
    description: 'Platform orchestration with dynamic configuration management',
    features: ['Score Workloads', 'Dynamic Config', 'Environment Management', 'Resource Graphs', 'Platform API', 'CLI Tools'],
    category: 'platform-engineering',
    downloads: 890,
    rating: 4.6
  },
  {
    id: '31',
    slug: 'garden-io',
    name: 'Garden Development Platform',
    technology: 'Garden',
    description: 'Development platform for Kubernetes with testing and preview environments',
    features: ['Dev Environments', 'Testing Framework', 'Preview Environments', 'Dependency Graph', 'Hot Reload', 'Multi-Module'],
    category: 'platform-engineering',
    downloads: 1340,
    rating: 4.5
  },
  {
    id: '32',
    slug: 'tilt-dev-env',
    name: 'Tilt Development Environment',
    technology: 'Tilt',
    description: 'Multi-service development environment for Kubernetes',
    features: ['Live Updates', 'Multi-Service', 'Resource Dependencies', 'Custom Buttons', 'Snapshots', 'Extensions'],
    category: 'platform-engineering',
    downloads: 1680,
    rating: 4.6
  },
  {
    id: '33',
    slug: 'keptn-quality-gates',
    name: 'Keptn Quality Gates',
    technology: 'Keptn',
    description: 'Event-driven cloud-native application lifecycle orchestration',
    features: ['Quality Gates', 'SLO-based Evaluation', 'Automated Remediation', 'Multi-Stage Delivery', 'Observability', 'GitOps'],
    category: 'platform-engineering',
    downloads: 1230,
    rating: 4.5
  },
  {
    id: '34',
    slug: 'loft-virtual-clusters',
    name: 'Loft Virtual Clusters',
    technology: 'Loft',
    description: 'Virtual Kubernetes clusters for multi-tenancy and isolation',
    features: ['vClusters', 'Sleep Mode', 'SSO Integration', 'Resource Quotas', 'Templates', 'Cost Tracking'],
    category: 'platform-engineering',
    downloads: 1450,
    rating: 4.7
  },
  {
    id: '35',
    slug: 'kubevela-oam',
    name: 'KubeVela Application Platform',
    technology: 'KubeVela',
    description: 'Application delivery platform based on OAM (Open Application Model)',
    features: ['OAM', 'Application Definitions', 'Workflow Engine', 'Multi-Cluster', 'Addon System', 'VelaUX UI'],
    category: 'platform-engineering',
    downloads: 980,
    rating: 4.5
  },
  {
    id: '36',
    slug: 'dapr-microservices',
    name: 'Dapr Microservices Platform',
    technology: 'Dapr',
    description: 'Distributed application runtime for microservices',
    features: ['Service Invocation', 'State Management', 'Pub/Sub', 'Bindings', 'Actors', 'Observability'],
    category: 'platform-engineering',
    downloads: 1760,
    rating: 4.6
  },
  {
    id: '37',
    slug: 'keda-autoscaling',
    name: 'KEDA Event-Driven Autoscaling',
    technology: 'KEDA',
    description: 'Kubernetes event-driven autoscaling for any container',
    features: ['Event Sources', 'Custom Metrics', 'Scale to Zero', 'Multiple Scalers', 'External Metrics', 'Job Scaling'],
    category: 'platform-engineering',
    downloads: 2100,
    rating: 4.8
  },
  {
    id: '38',
    slug: 'openfaas-serverless',
    name: 'OpenFaaS Serverless Platform',
    technology: 'OpenFaaS',
    description: 'Serverless functions platform for Kubernetes',
    features: ['Any Language', 'Auto-Scaling', 'Metrics', 'Async/Queuing', 'Templates', 'Function Store'],
    category: 'platform-engineering',
    downloads: 1890,
    rating: 4.6
  },
  {
    id: '39',
    slug: 'knative-platform',
    name: 'Knative Serverless Platform',
    technology: 'Knative',
    description: 'Kubernetes-based platform for serverless workloads',
    features: ['Serving', 'Eventing', 'Scale to Zero', 'Traffic Splitting', 'Event Sources', 'Brokers & Triggers'],
    category: 'platform-engineering',
    downloads: 1650,
    rating: 4.7
  },
  {
    id: '40',
    slug: 'rancher-platform',
    name: 'Rancher Multi-Cluster Platform',
    technology: 'Rancher',
    description: 'Multi-cluster Kubernetes management platform',
    features: ['Multi-Cluster', 'Unified RBAC', 'App Catalog', 'Fleet GitOps', 'Monitoring', 'Backup/Restore'],
    category: 'platform-engineering',
    downloads: 2450,
    rating: 4.7
  },
  {
    id: '41',
    slug: 'okteto-dev-platform',
    name: 'Okteto Development Platform',
    technology: 'Okteto',
    description: 'Development platform with remote development environments',
    features: ['Dev Environments', 'Preview Environments', 'Remote Development', 'Automatic SSL', 'Secrets Management', 'GitHub Actions'],
    category: 'platform-engineering',
    downloads: 1120,
    rating: 4.5
  },
  {
    id: '42',
    slug: 'shipa-app-platform',
    name: 'Shipa Application Platform',
    technology: 'Shipa',
    description: 'Application management platform for Kubernetes',
    features: ['App Frameworks', 'Policy Engine', 'Multi-Cluster', 'Developer Portal', 'Dependency Maps', 'Cost Visibility'],
    category: 'platform-engineering',
    downloads: 670,
    rating: 4.4
  },

  // AI Agent Templates (Agentics)
  {
    id: '44',
    slug: 'autogen-multi-agent',
    name: 'AutoGen Multi-Agent System',
    technology: 'AutoGen',
    description: 'Multi-agent conversation framework with customizable roles and workflows',
    features: ['Group Chat', 'Role-based Agents', 'Code Execution', 'Human Feedback', 'Tool Integration', 'Conversation Patterns'],
    category: 'agentics',
    downloads: 2100,
    rating: 4.8
  },
  {
    id: '45',
    slug: 'langchain-agent-executor',
    name: 'LangChain Agent Executor',
    technology: 'LangChain',
    description: 'Intelligent agent with tool use, memory, and reasoning capabilities',
    features: ['Tool Calling', 'Memory Management', 'Chain-of-Thought', 'Document QA', 'API Integration', 'Streaming'],
    category: 'agentics',
    downloads: 3200,
    rating: 4.9
  },
  {
    id: '46',
    slug: 'crewai-workforce',
    name: 'CrewAI Agent Workforce',
    technology: 'CrewAI',
    description: 'Collaborative AI agents working together on complex tasks',
    features: ['Role-based Crews', 'Task Delegation', 'Collaborative Planning', 'Process Orchestration', 'Tool Sharing', 'Result Synthesis'],
    category: 'agentics',
    downloads: 1850,
    rating: 4.7
  },
  {
    id: '47',
    slug: 'superagi-autonomous',
    name: 'SuperAGI Autonomous Agent',
    technology: 'SuperAGI',
    description: 'Autonomous AI agent platform with goal-oriented task execution',
    features: ['Goal Planning', 'Resource Management', 'Performance Monitoring', 'Tool Marketplace', 'Agent Orchestration', 'Human Oversight'],
    category: 'agentics',
    downloads: 1420,
    rating: 4.6
  },
  {
    id: '48',
    slug: 'semantic-kernel-agent',
    name: 'Semantic Kernel Agent',
    technology: 'Semantic Kernel',
    description: 'Microsoft Semantic Kernel-based agent with enterprise integration',
    features: ['Plugin System', 'Planner Integration', 'Memory Stores', 'Enterprise Auth', 'Azure Integration', 'Prompt Engineering'],
    category: 'agentics',
    downloads: 1680,
    rating: 4.5
  },
  {
    id: '49',
    slug: 'llama-index-agent',
    name: 'LlamaIndex RAG Agent',
    technology: 'LlamaIndex',
    description: 'RAG-powered agent with advanced document understanding and querying',
    features: ['Multi-Document RAG', 'Query Engine', 'Index Management', 'Retrieval Augmentation', 'Chat Engine', 'Sub-Question Queries'],
    category: 'agentics',
    downloads: 2450,
    rating: 4.8
  },
  {
    id: '50',
    slug: 'haystack-agent-pipeline',
    name: 'Haystack Agent Pipeline',
    technology: 'Haystack',
    description: 'Production-ready agent pipeline with document processing and QA',
    features: ['Pipeline Architecture', 'Document Processing', 'Answer Extraction', 'Evaluation Framework', 'REST API', 'Scaling'],
    category: 'agentics',
    downloads: 1120,
    rating: 4.6
  },
  {
    id: '51',
    slug: 'react-agent-pattern',
    name: 'ReAct Agent Pattern',
    technology: 'Python + OpenAI',
    description: 'Reasoning and Acting agent pattern implementation with tool use',
    features: ['Reasoning Loops', 'Action Planning', 'Tool Integration', 'Observation Handling', 'Error Recovery', 'Trace Logging'],
    category: 'agentics',
    downloads: 1890,
    rating: 4.7
  },
  {
    id: '52',
    slug: 'openai-assistants-api',
    name: 'OpenAI Assistants API',
    technology: 'OpenAI API',
    description: 'OpenAI Assistants API with file handling and function calling',
    features: ['Code Interpreter', 'File Search', 'Function Calling', 'Thread Management', 'Streaming', 'Vector Stores'],
    category: 'agentics',
    downloads: 3850,
    rating: 4.9
  },
  {
    id: '53',
    slug: 'agent-swarm-coordination',
    name: 'Agent Swarm Coordination',
    technology: 'Multi-Framework',
    description: 'Coordinated swarm of specialized agents for complex problem solving',
    features: ['Swarm Intelligence', 'Task Distribution', 'Agent Communication', 'Load Balancing', 'Consensus Mechanisms', 'Emergent Behavior'],
    category: 'agentics',
    downloads: 1340,
    rating: 4.5
  },
  {
    id: '54',
    slug: 'cognitive-architecture-agent',
    name: 'Cognitive Architecture Agent',
    technology: 'ACT-R/SOAR',
    description: 'Cognitive architecture-based agent with human-like reasoning patterns',
    features: ['Cognitive Modeling', 'Working Memory', 'Procedural Knowledge', 'Learning Mechanisms', 'Goal Management', 'Symbolic Reasoning'],
    category: 'agentics',
    downloads: 890,
    rating: 4.4
  },
  {
    id: '55',
    slug: 'multi-modal-agent',
    name: 'Multi-Modal AI Agent',
    technology: 'OpenAI GPT-4V',
    description: 'Multi-modal agent capable of processing text, images, and audio',
    features: ['Vision Processing', 'Audio Analysis', 'Text Understanding', 'Cross-Modal Reasoning', 'Tool Integration', 'Output Generation'],
    category: 'agentics',
    downloads: 2760,
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