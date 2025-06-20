# AWS ECS Module

This module creates an ECS cluster with support for both Fargate and EC2 launch types, including auto-scaling, service discovery, and comprehensive monitoring.

## Features

- **Multi-launch type support**: Fargate and EC2
- **Auto-scaling**: CPU and memory-based scaling policies
- **Service discovery**: Optional AWS Cloud Map integration
- **Load balancing**: ALB/NLB integration support
- **Security**: IAM roles, security groups, and secrets management
- **Monitoring**: CloudWatch Container Insights and custom metrics
- **High availability**: Multi-AZ deployment with circuit breaker
- **Cost optimization**: Fargate Spot support and smart defaults

## Usage Examples

### Basic Fargate Service

```hcl
module "api_service" {
  source = "./modules/aws/ecs"

  cluster_name = "my-api-cluster"
  service_name = "api-service"
  
  container_name  = "api"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-api:latest"
  container_port  = 8080
  
  task_cpu    = "512"
  task_memory = "1024"
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  enable_load_balancer = true
  target_group_arn    = module.alb.target_group_arn
  
  environment_variables = [
    {
      name  = "ENVIRONMENT"
      value = "production"
    },
    {
      name  = "LOG_LEVEL"
      value = "info"
    }
  ]
  
  secrets = {
    DATABASE_URL = "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db-url"
    API_KEY      = "arn:aws:ssm:us-east-1:123456789012:parameter/prod/api-key"
  }
  
  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

### High-Performance Service with EC2

```hcl
module "worker_service" {
  source = "./modules/aws/ecs"

  cluster_name = "worker-cluster"
  service_name = "data-processor"
  
  enable_fargate = false
  enable_ec2     = true
  autoscaling_group_arn = module.ecs_asg.autoscaling_group_arn
  
  container_name  = "worker"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/worker:latest"
  
  task_cpu    = "2048"
  task_memory = "4096"
  
  desired_count = 5
  
  capacity_provider_strategy = [
    {
      capacity_provider = "worker-cluster-ec2"
      weight           = 1
      base             = 5
    }
  ]
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  # Advanced scaling configuration
  enable_autoscaling       = true
  autoscaling_min_capacity = 5
  autoscaling_max_capacity = 50
  autoscaling_cpu_target   = 60
  autoscaling_memory_target = 70
  
  # Volume mounts for high I/O
  volumes = [
    {
      name = "data-cache"
      efs_volume_configuration = {
        file_system_id = aws_efs_file_system.cache.id
        root_directory = "/cache"
        transit_encryption_port = 2999
      }
    }
  ]
  
  mount_points = [
    {
      source_volume  = "data-cache"
      container_path = "/app/cache"
      read_only      = false
    }
  ]
  
  tags = {
    Environment = "production"
    Workload    = "batch-processing"
  }
}
```

### Microservice with Service Discovery

```hcl
module "microservice" {
  source = "./modules/aws/ecs"

  cluster_name = "microservices-cluster"
  service_name = "user-service"
  
  container_name  = "user-api"
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/user-service:v2.1.0"
  container_port  = 3000
  
  # Service mesh ready
  enable_service_discovery = true
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.main.id
  
  # Circuit breaker for resilience
  enable_circuit_breaker          = true
  enable_circuit_breaker_rollback = true
  
  # Zero-downtime deployment
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent        = 200
  
  # Health checks
  health_check_grace_period = 30
  health_check_command = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  security_group_ingress_rules = [
    {
      from_port   = 3000
      to_port     = 3000
      protocol    = "tcp"
      cidr_blocks = [module.vpc.vpc_cidr]
    }
  ]
  
  tags = {
    Environment = "production"
    Service     = "user-management"
  }
}
```

## Smart Defaults by Service Type

### API Services
- CPU: 256-512 units
- Memory: 512-1024 MB
- Min replicas: 2-3
- Max replicas: 10-20
- CPU scaling target: 70%

### Worker Services
- CPU: 1024-2048 units
- Memory: 2048-4096 MB
- Min replicas: 1-2
- Max replicas: 20-50
- Memory scaling target: 80%

### Frontend Services
- CPU: 256 units
- Memory: 512 MB
- Min replicas: 2
- Max replicas: 10
- CPU scaling target: 60%

## Cost Optimization

```hcl
# Use Fargate Spot for non-critical workloads
default_capacity_provider_strategy = [
  {
    capacity_provider = "FARGATE_SPOT"
    weight           = 4
    base             = 0
  },
  {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 2  # Always keep 2 tasks on regular Fargate
  }
]
```