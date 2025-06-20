terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    # Backend configuration loaded from backend.hcl
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Secondary region provider for disaster recovery
provider "aws" {
  alias  = "dr"
  region = var.dr_region

  default_tags {
    tags = merge(local.common_tags, {
      Region = "DR"
    })
  }
}

locals {
  environment = "prod"
  
  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
    Compliance  = "PCI-DSS"
  }
}

# VPC Module - Multi-AZ with high availability
module "vpc" {
  source = "../../modules/aws/networking"

  name             = "${var.project_name}-${local.environment}"
  cidr             = var.vpc_cidr
  azs              = var.availability_zones
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs
  
  enable_nat_gateway   = true
  single_nat_gateway   = false  # NAT gateway per AZ for HA
  enable_dns_hostnames = true
  enable_dns_support   = true
  enable_vpn_gateway   = true
  
  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true
  flow_log_retention_in_days           = 30

  tags = local.common_tags
}

# ECS Cluster for API Services - Production configuration
module "api_ecs" {
  source = "../../modules/aws/ecs"

  cluster_name = "${var.project_name}-api-${local.environment}"
  service_name = "api-service"
  
  # Production configuration - higher resources
  task_cpu      = "1024"
  task_memory   = "2048"
  desired_count = 5
  
  container_name  = "api"
  container_image = "${var.ecr_repository_url}:${var.api_version}"
  container_port  = 8080
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  enable_load_balancer = true
  target_group_arn    = module.alb.target_group_arns["api"]
  
  # Production environment variables
  environment_variables = [
    {
      name  = "ENVIRONMENT"
      value = local.environment
    },
    {
      name  = "LOG_LEVEL"
      value = "INFO"
    },
    {
      name  = "ENABLE_METRICS"
      value = "true"
    },
    {
      name  = "ENABLE_TRACING"
      value = "true"
    }
  ]
  
  # Secrets from AWS Secrets Manager
  secrets = {
    DATABASE_URL = aws_secretsmanager_secret.database_url.arn
    API_KEY      = aws_secretsmanager_secret.api_key.arn
    JWT_SECRET   = aws_secretsmanager_secret.jwt_secret.arn
  }
  
  # Auto-scaling configuration
  enable_autoscaling        = true
  autoscaling_min_capacity  = 5
  autoscaling_max_capacity  = 50
  autoscaling_cpu_target    = 70
  autoscaling_memory_target = 80
  
  # Production deployment configuration
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period          = 60
  
  # Circuit breaker for safe deployments
  enable_circuit_breaker          = true
  enable_circuit_breaker_rollback = true
  
  # Capacity provider strategy for cost optimization
  capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 2
      base             = 0
    },
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base             = 5  # Always keep 5 tasks on regular Fargate
    }
  ]
  
  tags = local.common_tags
}

# Lambda Functions - Production configuration
module "data_processor" {
  source = "../../modules/aws/lambda"

  function_name = "${var.project_name}-data-processor-${local.environment}"
  description   = "Production data processing function"
  runtime       = "python3.11"
  architectures = ["arm64"]  # Better price/performance
  
  # Production configuration
  memory_size = 1024
  timeout     = 300
  reserved_concurrent_executions = 100
  
  # S3 deployment package
  s3_bucket = var.lambda_deployment_bucket
  s3_key    = "lambda/data-processor/v${var.lambda_version}/function.zip"
  
  environment_variables = {
    ENVIRONMENT = local.environment
    LOG_LEVEL   = "INFO"
    TABLE_NAME  = module.dynamodb.table_name
  }
  
  # Production alias
  create_alias           = true
  alias_name            = "live"
  alias_function_version = var.lambda_version
  
  # VPC configuration for RDS access
  vpc_subnet_ids         = module.vpc.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.lambda.id]
  
  # Dead letter queue
  dead_letter_target_arn = module.dlq.queue_arn
  
  # X-Ray tracing
  tracing_mode = "Active"
  
  # IAM policies
  attach_dynamodb_policy = true
  dynamodb_table_arns   = [module.dynamodb.table_arn]
  
  attach_secrets_policy = true
  secrets_arns = [
    aws_secretsmanager_secret.database_credentials.arn
  ]
  
  # SQS trigger with production settings
  event_source_mappings = {
    sqs = {
      event_source_arn = module.sqs.queue_arn
      batch_size       = 25
      maximum_batching_window_in_seconds = 20
      
      # Error handling
      maximum_retry_attempts = 2
      maximum_record_age_in_seconds = 3600
      bisect_batch_on_function_error = true
      
      destination_config = {
        on_failure = {
          destination_arn = module.dlq.queue_arn
        }
      }
    }
  }
  
  # CloudWatch Logs
  cloudwatch_logs_retention_days = 30
  cloudwatch_logs_kms_key_id    = aws_kms_key.logs.arn
  
  tags = local.common_tags
}

# RDS Database - Multi-AZ for high availability
module "database" {
  source = "../../modules/aws/rds"

  identifier = "${var.project_name}-db-${local.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"  # Production instance
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type          = "gp3"
  iops                  = 3000
  
  database_name = var.project_name
  username      = "dbadmin"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
  
  # High availability
  multi_az = true
  
  # Backup configuration
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Production settings
  skip_final_snapshot = false
  deletion_protection = true
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = local.common_tags
}

# Read replica for read scaling
module "database_replica" {
  source = "../../modules/aws/rds"

  identifier = "${var.project_name}-db-replica-${local.environment}"
  
  # Replica configuration
  replicate_source_db = module.database.db_instance_id
  
  instance_class = "db.r6g.large"
  
  # No backup needed for read replica
  skip_final_snapshot = true
  backup_retention_period = 0
  
  tags = merge(local.common_tags, {
    Type = "read-replica"
  })
}

# DynamoDB Table - Production configuration
module "dynamodb" {
  source = "../../modules/aws/dynamodb"

  table_name = "${var.project_name}-${local.environment}"
  
  billing_mode   = "PROVISIONED"
  read_capacity  = 100
  write_capacity = 100
  
  hash_key  = "pk"
  range_key = "sk"
  
  attributes = [
    {
      name = "pk"
      type = "S"
    },
    {
      name = "sk"
      type = "S"
    },
    {
      name = "gsi1pk"
      type = "S"
    },
    {
      name = "gsi1sk"
      type = "S"
    }
  ]
  
  # Global secondary index
  global_secondary_indexes = [{
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    read_capacity   = 50
    write_capacity  = 50
    projection_type = "ALL"
  }]
  
  # Auto-scaling
  enable_autoscaling = true
  autoscaling_read = {
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
    target_value       = 70
    min_capacity       = 100
    max_capacity       = 1000
  }
  
  autoscaling_write = {
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
    target_value       = 70
    min_capacity       = 100
    max_capacity       = 1000
  }
  
  # Point-in-time recovery
  point_in_time_recovery_enabled = true
  
  # Encryption
  server_side_encryption_enabled = true
  server_side_encryption_kms_key_arn = aws_kms_key.dynamodb.arn
  
  # Continuous backups
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  tags = local.common_tags
}

# ElastiCache Redis Cluster
module "redis" {
  source = "../../modules/aws/elasticache"

  cluster_id = "${var.project_name}-redis-${local.environment}"
  
  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.r6g.large"
  
  # Cluster mode enabled for sharding
  parameter_group_family = "redis7"
  port                   = 6379
  
  # Multi-AZ with automatic failover
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Number of shards and replicas
  num_cache_clusters = 3
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  
  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  
  # Backup
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  # Notifications
  notification_topic_arn = aws_sns_topic.alerts.arn
  
  tags = local.common_tags
}

# Application Load Balancer with WAF
module "alb" {
  source = "../../modules/aws/alb"

  name = "${var.project_name}-${local.environment}"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids
  
  # Security
  enable_deletion_protection = true
  enable_http2              = true
  enable_waf                = true
  
  # Access logs
  enable_access_logs = true
  access_logs_bucket = module.s3_logs.bucket_id
  
  # HTTPS configuration
  enable_https       = true
  certificate_arn    = var.acm_certificate_arn
  ssl_policy         = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  
  target_groups = {
    api = {
      port     = 8080
      protocol = "HTTP"
      
      health_check = {
        enabled             = true
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval            = 30
        path                = "/health"
        matcher             = "200"
      }
      
      stickiness = {
        enabled         = true
        type           = "lb_cookie"
        cookie_duration = 86400
      }
    }
  }
  
  # WAF rules
  waf_rules = {
    rate_limit = {
      priority = 1
      action   = "block"
      rule     = "rate_based"
      rate     = 2000
    }
    
    geo_blocking = {
      priority = 2
      action   = "block"
      rule     = "geo_match"
      countries = ["CN", "RU", "KP"]  # Example blocked countries
    }
  }
  
  tags = local.common_tags
}

# CloudWatch Alarms
module "cloudwatch_alarms" {
  source = "../../modules/aws/monitoring"

  alarm_namespace = "${var.project_name}-${local.environment}"
  sns_topic_arn   = aws_sns_topic.alerts.arn
  
  # ECS alarms
  ecs_cluster_name = module.api_ecs.cluster_name
  ecs_service_name = module.api_ecs.service_name
  
  # RDS alarms
  db_instance_id = module.database.db_instance_id
  
  # Lambda alarms
  lambda_function_names = [
    module.data_processor.function_name
  ]
  
  # DynamoDB alarms
  dynamodb_table_name = module.dynamodb.table_name
  
  # Custom metric alarms
  custom_alarms = {
    high_error_rate = {
      metric_name = "ErrorRate"
      namespace   = "Application"
      statistic   = "Average"
      period      = 300
      threshold   = 5
      comparison  = "GreaterThanThreshold"
    }
    
    low_success_rate = {
      metric_name = "SuccessRate"
      namespace   = "Application"
      statistic   = "Average"
      period      = 300
      threshold   = 95
      comparison  = "LessThanThreshold"
    }
  }
  
  tags = local.common_tags
}

# Cost estimation with alerts
resource "null_resource" "cost_estimate" {
  provisioner "local-exec" {
    command = <<-EOT
      infracost breakdown --path . \
        --format json \
        --out-file cost-estimate-prod.json
      
      # Alert if monthly cost exceeds threshold
      COST=$(jq '.totalMonthlyCost' cost-estimate-prod.json)
      if (( $(echo "$COST > ${var.cost_alert_threshold}" | bc -l) )); then
        aws sns publish \
          --topic-arn ${aws_sns_topic.alerts.arn} \
          --message "Production infrastructure cost estimate: $COST USD/month exceeds threshold of ${var.cost_alert_threshold} USD/month"
      fi
    EOT
  }
  
  triggers = {
    always_run = timestamp()
  }
}