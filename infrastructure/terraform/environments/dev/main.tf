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

locals {
  environment = "dev"
  
  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/aws/networking"

  name             = "${var.project_name}-${local.environment}"
  cidr             = var.vpc_cidr
  azs              = var.availability_zones
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  
  enable_nat_gateway = true
  single_nat_gateway = true  # Cost optimization for dev
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

# ECS Cluster for API Services
module "api_ecs" {
  source = "../../modules/aws/ecs"

  cluster_name = "${var.project_name}-api-${local.environment}"
  service_name = "api-service"
  
  # Development configuration - minimal resources
  task_cpu    = "256"
  task_memory = "512"
  desired_count = 1
  
  container_name  = "api"
  container_image = "${var.ecr_repository_url}:dev-latest"
  container_port  = 8080
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  enable_load_balancer = true
  target_group_arn    = module.alb.target_group_arns["api"]
  
  # Development environment variables
  environment_variables = [
    {
      name  = "ENVIRONMENT"
      value = local.environment
    },
    {
      name  = "LOG_LEVEL"
      value = "DEBUG"
    },
    {
      name  = "ENABLE_DEBUG_ENDPOINTS"
      value = "true"
    }
  ]
  
  # Minimal auto-scaling for dev
  enable_autoscaling       = false
  
  # Development-specific security rules
  security_group_ingress_rules = [
    {
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
    }
  ]
  
  tags = local.common_tags
}

# Lambda Functions
module "data_processor" {
  source = "../../modules/aws/lambda"

  function_name = "${var.project_name}-data-processor-${local.environment}"
  description   = "Data processing function for ${local.environment}"
  runtime       = "python3.11"
  
  # Development configuration
  memory_size = 256
  timeout     = 60
  
  filename         = "${path.module}/lambda/data-processor.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/data-processor.zip")
  
  environment_variables = {
    ENVIRONMENT = local.environment
    LOG_LEVEL   = "DEBUG"
    TABLE_NAME  = module.dynamodb.table_name
  }
  
  # DynamoDB access
  attach_dynamodb_policy = true
  dynamodb_table_arns   = [module.dynamodb.table_arn]
  
  # SQS trigger
  event_source_mappings = {
    sqs = {
      event_source_arn = module.sqs.queue_arn
      batch_size       = 10
    }
  }
  
  tags = local.common_tags
}

# RDS Database (small instance for dev)
module "database" {
  source = "../../modules/aws/rds"

  identifier = "${var.project_name}-db-${local.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"  # Minimal instance for dev
  
  allocated_storage     = 20
  max_allocated_storage = 100
  
  database_name = var.project_name
  username      = "dbadmin"
  
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  
  # Development settings
  backup_retention_period = 1
  skip_final_snapshot    = true
  deletion_protection    = false
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = local.common_tags
}

# DynamoDB Table
module "dynamodb" {
  source = "../../modules/aws/dynamodb"

  table_name = "${var.project_name}-${local.environment}"
  
  billing_mode = "PAY_PER_REQUEST"  # No need to provision capacity for dev
  
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
    }
  ]
  
  # No global secondary indexes for dev to save costs
  
  tags = local.common_tags
}

# SQS Queue
module "sqs" {
  source = "../../modules/aws/sqs"

  queue_name = "${var.project_name}-events-${local.environment}"
  
  # Development configuration
  message_retention_seconds = 86400  # 1 day
  visibility_timeout_seconds = 300
  
  create_dlq = true
  dlq_message_retention_seconds = 345600  # 4 days
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "../../modules/aws/alb"

  name = "${var.project_name}-${local.environment}"
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  
  # HTTPS listener with self-signed cert for dev
  enable_https = false  # HTTP only for dev
  
  target_groups = {
    api = {
      port     = 8080
      protocol = "HTTP"
      health_check = {
        enabled             = true
        healthy_threshold   = 2
        unhealthy_threshold = 2
        timeout             = 5
        interval            = 30
        path                = "/health"
        matcher             = "200"
      }
    }
  }
  
  tags = local.common_tags
}

# Cost estimation
resource "null_resource" "cost_estimate" {
  provisioner "local-exec" {
    command = "infracost breakdown --path . --format json --out-file cost-estimate.json"
  }
  
  triggers = {
    always_run = timestamp()
  }
}