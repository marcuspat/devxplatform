# Deployment Strategies Guide

This guide explains the deployment strategies implemented in our CI/CD pipelines and how to use them effectively.

## Overview

Our CI/CD pipelines support multiple deployment strategies to ensure safe and reliable deployments:

1. **Rolling Deployment** - Default strategy for simple updates
2. **Canary Deployment** - Gradual rollout with monitoring
3. **Blue-Green Deployment** - Zero-downtime deployments with instant rollback
4. **Feature Flag Integration** - Progressive feature enablement

## GitHub Actions Workflows

### Continuous Integration (`ci.yml`)

The CI workflow runs on every push and pull request, executing:

- **Parallel Testing**: Tests run in 4 shards across Node 18 and 20
- **Security Scanning**: Trivy, Snyk, CodeQL, and OWASP ZAP
- **Multi-platform Docker builds**: AMD64 and ARM64 support
- **Automatic caching**: Dependencies, Docker layers, and test results

### Continuous Deployment (`cd.yml`)

The CD workflow supports multiple deployment strategies:

#### Canary Deployment (Default)

```yaml
# Deploy 10% canary
- Deploys new version to canary pods
- Routes 10% of traffic to canary
- Monitors error rate, latency, and success rate
- Progressively increases traffic: 10% → 25% → 50% → 75% → 100%
- Automatic rollback if metrics exceed thresholds
```

To trigger manually:
```bash
gh workflow run cd.yml -f environment=production -f strategy=canary -f canary-percentage=10
```

#### Blue-Green Deployment

```yaml
# Deploy to green environment
- Deploys new version to green environment
- Runs smoke tests on green
- Switches traffic from blue to green
- Monitors metrics for 5 minutes
- Automatic rollback if issues detected
```

To trigger manually:
```bash
gh workflow run cd.yml -f environment=production -f strategy=blue-green
```

## GitLab CI Pipeline

The GitLab CI configuration (`.gitlab-ci.yml`) provides similar capabilities:

### Key Features

- **Parallel test execution** with 4 shards
- **Security scanning** with multiple tools
- **Progressive canary deployments**
- **Automatic rollback** based on metrics
- **Multi-environment support**

### Manual Deployment Triggers

```bash
# Trigger canary deployment
curl -X POST \
  --form token=$CI_JOB_TOKEN \
  --form ref=main \
  --form "variables[DEPLOY_ENVIRONMENT]=production" \
  --form "variables[DEPLOY_STRATEGY]=canary" \
  https://gitlab.com/api/v4/projects/$PROJECT_ID/trigger/pipeline
```

## Feature Flag Integration

Both pipelines integrate with LaunchDarkly for progressive feature rollouts:

### Canary with Feature Flags

1. Deploy canary with 10% traffic
2. Enable feature flag for 10% of users
3. Monitor metrics and user feedback
4. Gradually increase both traffic and feature flag percentage
5. Full rollout when metrics are stable

### Configuration

```javascript
// In your application
const ldClient = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY, {
  environment: process.env.LAUNCHDARKLY_ENVIRONMENT
});

// Check feature flag
const showNewFeature = await ldClient.variation('new-feature', user, false);
```

## Monitoring and Rollback

### Automatic Monitoring

Both pipelines monitor these metrics during deployment:

- **Error Rate**: Must be < 5%
- **P99 Latency**: Must be < 1000ms
- **Success Rate**: Must be > 95%

### Manual Rollback

GitHub Actions:
```bash
# Rollback canary
gh workflow run rollback.yml -f environment=production -f deployment=canary
```

GitLab:
```bash
# Trigger rollback job
curl -X POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$ROLLBACK_JOB_ID/play"
```

## Deployment Environments

### Staging

- Automatic deployment on main branch
- Full test suite execution
- Feature flags enabled for testing
- Accessible at: https://staging.example.com

### Production Canary

- Manual approval required
- Progressive traffic routing
- Real-time monitoring
- Automatic rollback on failures

### Production

- Blue-green or canary deployment
- Multi-region deployment support
- Zero-downtime updates
- Full observability

## Best Practices

### 1. Pre-deployment Checklist

- [ ] All tests passing
- [ ] Security scans clean
- [ ] Performance benchmarks met
- [ ] Database migrations tested
- [ ] Feature flags configured
- [ ] Rollback plan documented

### 2. Deployment Windows

- Avoid deployments on Fridays
- Deploy during low-traffic periods
- Have team members available for monitoring
- Communicate deployment schedules

### 3. Feature Flag Strategy

```javascript
// Progressive rollout example
const rolloutPercentages = {
  'internal-users': 100,    // Full rollout to internal users
  'beta-users': 50,         // 50% of beta users
  'all-users': 10          // 10% of all users
};
```

### 4. Monitoring During Deployment

Monitor these dashboards during deployment:
- Application metrics (Datadog/New Relic)
- Error tracking (Sentry)
- User analytics (Mixpanel/Amplitude)
- Infrastructure metrics (CloudWatch/Prometheus)

## Troubleshooting

### Failed Deployments

1. Check pipeline logs for specific errors
2. Review monitoring dashboards for anomalies
3. Verify feature flag configurations
4. Check for database migration issues
5. Review container health checks

### Rollback Procedures

1. **Automatic Rollback**: Triggered by metric thresholds
2. **Manual Rollback**: Use rollback workflows
3. **Feature Flag Rollback**: Disable flags immediately
4. **Database Rollback**: Use migration down scripts

### Common Issues

**High Error Rate**
- Check application logs
- Review recent code changes
- Verify external service dependencies
- Check database connection pools

**Performance Degradation**
- Review new database queries
- Check for memory leaks
- Verify caching configurations
- Monitor CPU/memory usage

**Failed Health Checks**
- Verify health check endpoints
- Check startup time requirements
- Review resource limits
- Validate network policies

## Advanced Configurations

### Multi-Region Deployment

```yaml
# Deploy to multiple regions
regions:
  - us-east-1
  - eu-west-1
  - ap-southeast-1

# Regional canary rollout
canary_weights:
  us-east-1: 20
  eu-west-1: 10
  ap-southeast-1: 5
```

### Custom Metric Thresholds

```yaml
# Adjust thresholds per environment
production:
  error_rate_threshold: 2
  latency_p99_threshold: 500
  success_rate_threshold: 99

staging:
  error_rate_threshold: 10
  latency_p99_threshold: 2000
  success_rate_threshold: 90
```

### Deployment Notifications

Configure notifications in your pipeline:

```yaml
# Slack
webhook_url: ${{ secrets.SLACK_WEBHOOK }}

# PagerDuty
routing_key: ${{ secrets.PAGERDUTY_ROUTING_KEY }}

# Email
smtp_server: smtp.example.com
recipients: devops@example.com
```

## Security Considerations

1. **Secret Management**: Use Kubernetes secrets or cloud KMS
2. **Image Scanning**: All images scanned before deployment
3. **Network Policies**: Restrict pod-to-pod communication
4. **RBAC**: Limit deployment permissions
5. **Audit Logging**: Track all deployment activities

## Performance Optimization

1. **Docker Layer Caching**: Reduces build time by 70%
2. **Parallel Testing**: Cuts test time by 75%
3. **Dependency Caching**: Saves 5-10 minutes per build
4. **Multi-stage Builds**: Reduces image size by 60%
5. **BuildKit**: Improves build performance by 50%

## Conclusion

These CI/CD pipelines provide a robust foundation for safe, reliable deployments with:
- Comprehensive testing and security scanning
- Multiple deployment strategies
- Automatic monitoring and rollback
- Feature flag integration
- Full observability

Choose the appropriate strategy based on your risk tolerance and deployment requirements.