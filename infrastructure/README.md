# Infrastructure Templates

This directory contains comprehensive infrastructure templates for Kubernetes and Terraform with smart defaults based on service type and expected load patterns.

## 📁 Directory Structure

```
infrastructure/
├── kubernetes/                    # Kubernetes manifests and configurations
│   ├── base/                     # Base Kustomize templates
│   │   ├── api-service/          # API service base manifests
│   │   ├── worker-service/       # Background worker templates
│   │   ├── frontend-service/     # Frontend application templates
│   │   └── database/            # Database deployments
│   ├── components/              # Reusable Kubernetes components
│   │   ├── hpa/                 # HorizontalPodAutoscaler configs
│   │   ├── pdb/                 # PodDisruptionBudget configs
│   │   ├── network-policies/    # NetworkPolicy for zero-trust
│   │   └── monitoring/          # ServiceMonitor configs
│   ├── overlays/               # Environment-specific overlays
│   │   ├── development/        # Development environment
│   │   ├── staging/           # Staging environment
│   │   └── production/        # Production environment
│   └── service-mesh/          # Service mesh configurations
│       ├── istio/             # Istio service mesh configs
│       └── linkerd/           # Linkerd service mesh configs
└── terraform/                 # Terraform modules and environments
    ├── modules/              # Reusable Terraform modules
    │   ├── aws/             # AWS-specific modules
    │   └── gcp/             # GCP-specific modules
    ├── environments/        # Environment configurations
    │   ├── dev/            # Development environment
    │   ├── staging/        # Staging environment
    │   └── prod/           # Production environment
    └── backend/            # Remote state configuration
```

## 🚀 Kubernetes Templates

### Service Types with Smart Defaults

#### API Services
- **Resources**: 256m CPU, 512Mi memory (request) / 1000m CPU, 512Mi memory (limits)
- **Replicas**: 3 (base) with HPA scaling to 20
- **Health Checks**: Liveness, readiness, and startup probes
- **Security**: Non-root user, read-only root filesystem
- **Networking**: Service mesh ready with mTLS

#### Worker Services  
- **Resources**: 500m CPU, 1Gi memory (request) / 2000m CPU, 2Gi memory (limits)
- **Replicas**: 2 (base) with HPA scaling to 50
- **Processing**: Batch job patterns with queue-based scaling
- **Storage**: EFS volume mounts for shared data

#### Frontend Services
- **Resources**: 100m CPU, 256Mi memory (request) / 500m CPU, 512Mi memory (limits)
- **Replicas**: 2 (base) with HPA scaling to 10
- **CDN**: CloudFront integration ready
- **Caching**: Redis session store support

### Key Features

#### HorizontalPodAutoscaler (HPA)
- **CPU-based scaling**: 70% target utilization
- **Memory-based scaling**: 80% target utilization  
- **Custom metrics**: Request rate, response time, queue depth
- **Behavior policies**: Controlled scale-up/down with stabilization

#### PodDisruptionBudget (PDB)
- **High availability**: Always maintain 51% of pods available
- **Rolling updates**: Zero-downtime deployments
- **Node maintenance**: Graceful pod eviction

#### NetworkPolicies (Zero-Trust)
- **Ingress rules**: Allow traffic from specific namespaces/pods
- **Egress rules**: Restrict outbound traffic to required services
- **DNS access**: Allow CoreDNS for service discovery
- **Monitoring**: Allow Prometheus scraping

#### Service Mesh (Istio)
- **Traffic management**: Virtual services with canary deployments
- **Security**: mTLS encryption and authorization policies
- **Observability**: Distributed tracing and metrics
- **Resilience**: Circuit breakers and retry policies

### Environment Overlays

#### Development
- **Resources**: Minimal resource requests
- **Replicas**: Single replica for cost optimization
- **Debug**: Enable debug endpoints and verbose logging
- **Monitoring**: Basic health checks

#### Staging
- **Resources**: 75% of production resources
- **Replicas**: 2-3 replicas for testing HA
- **Testing**: Integration test hooks
- **Security**: Production-like security policies

#### Production
- **Resources**: Full production resource allocation
- **Replicas**: High replica counts with auto-scaling
- **Security**: Full security hardening and compliance
- **Monitoring**: Comprehensive observability stack

## ☁️ Terraform Modules

### AWS Modules

#### ECS Module (`modules/aws/ecs/`)
**Smart Defaults by Service Type:**
- **API Services**: 256 CPU, 512 memory, 3 replicas
- **Worker Services**: 1024 CPU, 2048 memory, 5 replicas  
- **Background Jobs**: 2048 CPU, 4096 memory, spot instances

**Features:**
- Multi-launch type support (Fargate/EC2)
- Auto-scaling with CPU/memory targets
- Service discovery integration
- Circuit breaker deployments
- Blue/green deployment support

**Cost Optimization:**
- Fargate Spot integration (up to 70% savings)
- Right-sized resource defaults
- Automatic scaling policies

#### Lambda Module (`modules/aws/lambda/`)
**Runtime-Specific Defaults:**
- **Node.js**: `index.handler`, 512MB memory, 30s timeout
- **Python**: `lambda_function.lambda_handler`, 512MB memory, 60s timeout
- **Java**: `com.example.Handler::handleRequest`, 1024MB memory, 60s timeout
- **Go**: `main`, 256MB memory, 30s timeout

**Features:**
- Multiple deployment methods (ZIP, S3, Container)
- Event source mappings (SQS, Kinesis, DynamoDB)
- VPC configuration with security groups
- Dead letter queue configuration
- X-Ray tracing integration
- Provisioned concurrency support

### GCP Modules

#### Cloud Run Module (`modules/gcp/cloud-run/`)
**Smart Defaults:**
- **CPU**: 1000m with auto-scaling
- **Memory**: 512Mi with burst capability
- **Concurrency**: 80 requests per instance
- **Min instances**: 0 (scale to zero)
- **Max instances**: 100

#### GKE Module (`modules/gcp/gke/`)
**Features:**
- Autopilot and Standard modes
- Multi-zone node pools
- Workload Identity integration
- Network policies enabled
- Binary Authorization support

### Environment Configurations

#### Development (`environments/dev/`)
- **Cost optimized**: Minimal resource allocation
- **Single AZ**: Reduced networking costs
- **Spot instances**: Where appropriate for non-critical workloads
- **Simplified monitoring**: Basic CloudWatch/Stackdriver

#### Production (`environments/prod/`)
- **High availability**: Multi-AZ deployment
- **Auto-scaling**: Comprehensive scaling policies
- **Security**: Full encryption, WAF, security groups
- **Monitoring**: Complete observability stack
- **Backup**: Automated backup strategies
- **DR**: Cross-region disaster recovery

## 🔧 Smart Defaults System

### Resource Allocation by Service Pattern

| Service Type | CPU Request | Memory Request | CPU Limit | Memory Limit | Replicas |
|-------------|-------------|----------------|-----------|--------------|----------|
| API Gateway | 100m | 128Mi | 500m | 256Mi | 2-5 |
| REST API | 250m | 256Mi | 1000m | 512Mi | 3-10 |
| GraphQL API | 500m | 512Mi | 1500m | 1Gi | 3-15 |
| Worker Queue | 500m | 512Mi | 2000m | 2Gi | 2-20 |
| Batch Job | 1000m | 1Gi | 4000m | 4Gi | 1-10 |
| Frontend | 100m | 128Mi | 500m | 256Mi | 2-8 |
| Database | 1000m | 2Gi | 4000m | 8Gi | 1-3 |

### Auto-scaling Thresholds

| Metric | Target | Scale Up | Scale Down |
|--------|--------|----------|------------|
| CPU Utilization | 70% | +100% in 30s | -10% in 300s |
| Memory Utilization | 80% | +50% in 60s | -10% in 300s |
| Request Rate | 1000 RPS | +4 pods in 30s | -2 pods in 60s |
| Queue Depth | 30 msgs | +2 pods in 30s | -1 pod in 60s |

## 💰 Cost Optimization Features

### Kubernetes
- **Spot instances**: Up to 70% savings for fault-tolerant workloads
- **Vertical Pod Autoscaling**: Right-size containers automatically
- **Cluster autoscaling**: Scale nodes based on demand
- **Resource quotas**: Prevent resource over-allocation

### AWS
- **Fargate Spot**: 70% discount for interruptible workloads
- **Reserved capacity**: Savings plans for predictable workloads
- **S3 lifecycle policies**: Automatic storage class transitions
- **Lambda provisioned concurrency**: Optimize for consistent performance

### GCP
- **Preemptible instances**: 80% discount for fault-tolerant workloads
- **Sustained use discounts**: Automatic discounts for running workloads
- **Committed use contracts**: Long-term pricing discounts
- **Cloud Run scale-to-zero**: Pay only for actual usage

## 📊 Cost Estimation Integration

Both Kubernetes and Terraform templates include cost estimation:

```bash
# Kubernetes cost estimation
kubectl cost --namespace production

# Terraform cost estimation with infracost
infracost breakdown --path ./environments/prod
```

## 🚦 Getting Started

### Kubernetes Deployment

1. **Choose your service type and environment:**
```bash
# Copy and customize base template
cp -r kubernetes/base/api-service my-service
cd kubernetes/overlays/development
```

2. **Deploy with Kustomize:**
```bash
kubectl apply -k .
```

3. **Monitor deployment:**
```bash
kubectl get pods,svc,hpa -l app=my-service
```

### Terraform Deployment

1. **Initialize backend:**
```bash
cd terraform/backend
terraform init && terraform apply
```

2. **Deploy environment:**
```bash
cd ../environments/dev
terraform init -backend-config=../../backend/backend.hcl
terraform plan -var-file=terraform.tfvars
terraform apply
```

3. **Monitor costs:**
```bash
infracost breakdown --path .
```

## 🔍 Monitoring and Observability

### Kubernetes
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **Jaeger**: Distributed tracing
- **Fluentd**: Log aggregation

### AWS
- **CloudWatch**: Metrics, logs, and alarms
- **X-Ray**: Distributed tracing
- **AWS Config**: Configuration compliance
- **Cost Explorer**: Cost analysis and optimization

### GCP
- **Cloud Monitoring**: Unified metrics and alerting
- **Cloud Trace**: Distributed tracing
- **Cloud Logging**: Log management
- **Cloud Profiler**: Application performance

## 📚 Examples and Use Cases

### Microservices Architecture
Perfect for containerized microservices with service mesh communication, auto-scaling, and observability.

### Serverless Applications  
Lambda/Cloud Functions with event-driven architectures, API Gateway integration, and cost-optimized scaling.

### Data Processing Pipelines
Batch processing with worker services, queue-based scaling, and managed data services integration.

### High-Traffic Web Applications
Load-balanced APIs with CDN, caching layers, database read replicas, and comprehensive monitoring.

## 🔐 Security Best Practices

- **Zero-trust networking** with network policies
- **Pod security standards** enforcement
- **Secrets management** with external providers
- **Image scanning** and admission controllers
- **mTLS encryption** in service mesh
- **RBAC** and workload identity
- **Regular security updates** and patching

This infrastructure template provides a solid foundation for deploying scalable, secure, and cost-effective applications across multiple environments and cloud providers.