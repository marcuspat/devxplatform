# CI/CD Templates Documentation

This repository contains comprehensive CI/CD templates for GitHub Actions and GitLab CI with enterprise-grade features including security scanning, progressive deployments, and automatic rollbacks.

## 📋 Table of Contents

- [Features](#features)
- [GitHub Actions Setup](#github-actions-setup)
- [GitLab CI Setup](#gitlab-ci-setup)
- [Configuration](#configuration)
- [Security](#security)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🚀 Features

### Core CI/CD Features
- **Multi-stage pipelines** with proper caching strategies
- **Parallel test execution** (4-way sharding)
- **Multi-platform Docker builds** (AMD64/ARM64)
- **Progressive deployment strategies**:
  - Rolling deployments
  - Canary deployments (10% → 25% → 50% → 75% → 100%)
  - Blue-Green deployments
- **Automatic rollback** based on metrics thresholds
- **Feature flag integration** with LaunchDarkly

### Security Features
- **SAST** (Static Application Security Testing) with CodeQL/Semgrep
- **DAST** (Dynamic Application Security Testing) with OWASP ZAP
- **Container scanning** with Trivy and Snyk
- **Dependency scanning** for vulnerabilities
- **Secret detection** to prevent credential leaks
- **License compliance** checking

### Monitoring & Observability
- **Real-time metrics monitoring** during deployments
- **Automatic health checks** and smoke tests
- **Performance testing** with k6
- **Synthetic monitoring** integration
- **Deployment tracking** in APM tools

## 🔧 GitHub Actions Setup

### Prerequisites

1. **Required Secrets**:
   ```
   AWS_ACCESS_KEY_ID         # AWS credentials for EKS
   AWS_SECRET_ACCESS_KEY     # AWS credentials
   CODECOV_TOKEN            # Code coverage tracking
   DATADOG_API_KEY          # Monitoring metrics
   DATADOG_APP_KEY          # Monitoring metrics
   GITHUB_TOKEN             # Automatically provided
   JIRA_API_TOKEN           # Issue tracking
   LAUNCHDARKLY_API_KEY     # Feature flags
   NEW_RELIC_API_KEY        # APM tracking
   SLACK_WEBHOOK            # Notifications
   SNYK_TOKEN              # Security scanning
   ```

2. **Environments**:
   - `staging` - Automatic deployments from main
   - `production-canary` - Canary deployments
   - `production` - Full production deployments

### Quick Start

1. Copy the workflows to your repository:
   ```bash
   cp -r .github/workflows /path/to/your/repo/.github/
   ```

2. Configure your secrets in GitHub:
   ```
   Settings → Secrets and variables → Actions → New repository secret
   ```

3. Push to trigger the pipeline:
   ```bash
   git add .
   git commit -m "Add CI/CD pipelines"
   git push origin main
   ```

### Manual Deployments

Deploy to production with canary strategy:
```bash
gh workflow run cd.yml \
  -f environment=production \
  -f strategy=canary \
  -f canary-percentage=10
```

Deploy with blue-green strategy:
```bash
gh workflow run cd.yml \
  -f environment=production \
  -f strategy=blue-green
```

## 🦊 GitLab CI Setup

### Prerequisites

1. **CI/CD Variables**:
   ```
   AWS_ACCESS_KEY_ID        # AWS credentials
   AWS_SECRET_ACCESS_KEY    # AWS credentials
   CI_REGISTRY_USER         # GitLab registry user
   CI_REGISTRY_PASSWORD     # GitLab registry password
   DATADOG_API_KEY         # Monitoring
   DATADOG_APP_KEY         # Monitoring
   JIRA_API_TOKEN          # Issue tracking
   JIRA_DOMAIN             # Your JIRA domain
   KUBE_CA_PEM_FILE        # Kubernetes CA certificate
   KUBE_TOKEN              # Kubernetes service account token
   KUBE_URL                # Kubernetes API URL
   LAUNCHDARKLY_API_KEY    # Feature flags
   NEW_RELIC_API_KEY       # APM
   NEW_RELIC_APP_ID        # APM app ID
   SLACK_WEBHOOK_URL       # Notifications
   SNYK_TOKEN              # Security scanning
   ```

2. **Protected Branches**:
   - Configure `main` and `release/*` as protected branches
   - Set deployment environment approvals

### Quick Start

1. Copy the GitLab CI configuration:
   ```bash
   cp .gitlab-ci.yml /path/to/your/repo/
   ```

2. Configure CI/CD variables:
   ```
   Settings → CI/CD → Variables → Add variable
   ```

3. Push to trigger the pipeline:
   ```bash
   git add .gitlab-ci.yml
   git commit -m "Add GitLab CI/CD pipeline"
   git push origin main
   ```

### Manual Deployments

Trigger deployment via API:
```bash
curl -X POST \
  --form token=$CI_JOB_TOKEN \
  --form ref=main \
  --form "variables[DEPLOY_ENVIRONMENT]=production" \
  --form "variables[DEPLOY_STRATEGY]=canary" \
  https://gitlab.com/api/v4/projects/$PROJECT_ID/trigger/pipeline
```

## ⚙️ Configuration

### Docker Configuration

The `Dockerfile` uses multi-stage builds for optimal image size:

```dockerfile
# Build stage - compiles TypeScript
FROM node:18-alpine AS builder

# Production stage - minimal runtime
FROM node:18-alpine AS production
```

Key features:
- Non-root user execution
- Health check endpoint
- Signal handling with dumb-init
- Security hardening

### Helm Configuration

The Helm chart (`helm/chart/`) supports:

- **Deployment strategies**: Rolling, canary, blue-green
- **Auto-scaling**: HPA with custom metrics
- **Service mesh**: Istio integration
- **Observability**: Prometheus metrics, distributed tracing
- **Security**: Network policies, pod security policies

Example values for canary deployment:
```yaml
canary:
  enabled: true
  weight: 10
  analysis:
    interval: 1m
    threshold: 5
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
      - name: request-duration
        thresholdRange:
          max: 500
```

### Feature Flags

LaunchDarkly integration example:
```javascript
// Initialize
const ldClient = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY);

// Check feature
const showNewFeature = await ldClient.variation(
  'new-feature',
  { key: user.id },
  false
);

// Percentage rollout
const rolloutConfig = {
  rules: [{
    rollout: {
      variations: [
        { variation: 0, weight: 90 },  // 90% see old
        { variation: 1, weight: 10 }   // 10% see new
      ]
    }
  }]
};
```

## 🔒 Security

### Security Scanning Pipeline

1. **Dependency Scanning**:
   - npm audit for Node.js vulnerabilities
   - Snyk for comprehensive dependency analysis

2. **SAST (Static Analysis)**:
   - CodeQL for security vulnerabilities
   - Semgrep for custom security rules

3. **Container Scanning**:
   - Trivy for OS and application vulnerabilities
   - Image signing and verification

4. **DAST (Dynamic Analysis)**:
   - OWASP ZAP baseline scan
   - API security testing

### Security Best Practices

1. **Secrets Management**:
   ```yaml
   # Never commit secrets
   env:
     API_KEY: ${{ secrets.API_KEY }}  # ✅ Good
     API_KEY: "sk-1234567890"         # ❌ Bad
   ```

2. **Container Security**:
   - Run as non-root user
   - Read-only root filesystem
   - Drop all capabilities
   - Use distroless or Alpine images

3. **Network Security**:
   ```yaml
   networkPolicy:
     enabled: true
     ingress:
       - from:
           - namespaceSelector:
               matchLabels:
                 name: ingress-nginx
   ```

## 📊 Monitoring

### Metrics Monitored During Deployment

1. **Error Rate**: Must be < 5%
2. **P99 Latency**: Must be < 1000ms
3. **Success Rate**: Must be > 95%
4. **Custom Business Metrics**: Configurable

### Monitoring Integration

**Datadog Example**:
```javascript
// Track deployment
datadogClient.event({
  title: 'Deployment Started',
  text: `Deploying version ${version} to ${environment}`,
  tags: ['deployment', `env:${environment}`],
  alert_type: 'info'
});

// Track custom metrics
datadogClient.gauge('api.response_time', responseTime, {
  tags: [`version:${version}`, `canary:true`]
});
```

**Prometheus Metrics**:
```javascript
// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Failed Health Checks**
   ```bash
   # Check pod logs
   kubectl logs -n production deployment/app

   # Check health endpoint
   kubectl exec -n production deployment/app -- curl localhost:8080/health
   ```

2. **High Error Rate During Canary**
   ```bash
   # Check canary pods
   kubectl get pods -n production -l version=canary

   # View canary logs
   kubectl logs -n production -l version=canary --tail=100

   # Manual rollback
   kubectl delete deployment app-canary -n production
   ```

3. **Docker Build Failures**
   ```bash
   # Enable BuildKit debugging
   export DOCKER_BUILDKIT=1
   export BUILDKIT_PROGRESS=plain

   # Build locally
   docker build --no-cache --progress=plain .
   ```

### Debugging Commands

**GitHub Actions**:
```bash
# Download workflow logs
gh run download $RUN_ID

# View specific job logs
gh run view $RUN_ID --log

# Re-run failed jobs
gh run rerun $RUN_ID --failed
```

**GitLab CI**:
```bash
# Get pipeline status
curl -H "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/pipelines/$PIPELINE_ID"

# Download job artifacts
curl -H "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID/artifacts" \
  -o artifacts.zip

# Retry failed job
curl -X POST -H "PRIVATE-TOKEN: $TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID/retry"
```

### Performance Optimization Tips

1. **Cache Optimization**:
   - Use layer caching in Docker builds
   - Cache node_modules between builds
   - Use GitLab/GitHub cache effectively

2. **Parallel Execution**:
   - Run tests in parallel shards
   - Build multiple platforms concurrently
   - Deploy to multiple regions in parallel

3. **Resource Limits**:
   ```yaml
   resources:
     requests:
       cpu: 250m
       memory: 256Mi
     limits:
       cpu: 500m
       memory: 512Mi
   ```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [OWASP DevSecOps Guideline](https://owasp.org/www-project-devsecops-guideline/)

## 🤝 Contributing

To contribute improvements to these templates:

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request with detailed description

## 📄 License

These CI/CD templates are provided as-is for use in your projects. Customize them according to your specific requirements and security policies.