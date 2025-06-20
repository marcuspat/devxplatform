# AWS Lambda Module

This module creates Lambda functions with smart defaults, comprehensive IAM policies, and support for various event sources and configurations.

## Features

- **Smart defaults**: Runtime-specific defaults for handler, timeout, and memory
- **Multiple deployment options**: ZIP, S3, Container images
- **Event sources**: SQS, SNS, Kinesis, DynamoDB Streams, EventBridge
- **Advanced features**: VPC, EFS, provisioned concurrency, SnapStart
- **Security**: Fine-grained IAM policies, secrets management
- **Observability**: X-Ray tracing, CloudWatch Logs, custom metrics
- **Cost optimization**: ARM64 support, right-sized defaults

## Usage Examples

### Basic API Lambda

```hcl
module "api_lambda" {
  source = "./modules/aws/lambda"

  function_name = "api-handler"
  description   = "API request handler"
  runtime       = "nodejs18.x"
  
  # Smart defaults will set handler to "index.handler"
  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")
  
  environment_variables = {
    NODE_ENV     = "production"
    API_ENDPOINT = "https://api.example.com"
  }
  
  # API Gateway trigger
  allowed_triggers = {
    api_gateway = {
      action    = "lambda:InvokeFunction"
      principal = "apigateway.amazonaws.com"
      source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
    }
  }
  
  # Attach policies for common services
  attach_s3_policy = true
  s3_bucket_names  = ["my-app-bucket"]
  
  attach_dynamodb_policy = true
  dynamodb_table_arns   = [aws_dynamodb_table.main.arn]
  
  tags = {
    Environment = "production"
    Service     = "api"
  }
}
```

### Event Processing Lambda with SQS

```hcl
module "event_processor" {
  source = "./modules/aws/lambda"

  function_name = "event-processor"
  description   = "Process events from SQS queue"
  runtime       = "python3.11"
  
  # Smart defaults will set handler to "lambda_function.lambda_handler"
  # and memory to 512MB
  timeout = 300  # 5 minutes for batch processing
  
  # Container deployment
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.lambda.repository_url}:latest"
  
  # SQS event source
  event_source_mappings = {
    sqs = {
      event_source_arn = aws_sqs_queue.events.arn
      batch_size       = 25
      maximum_batching_window_in_seconds = 20
      
      # Handle failures
      maximum_retry_attempts = 2
      bisect_batch_on_function_error = true
      
      destination_config = {
        on_failure = {
          destination_arn = aws_sqs_queue.dlq.arn
        }
      }
    }
  }
  
  # Dead letter queue for async invocations
  dead_letter_target_arn = aws_sqs_queue.lambda_dlq.arn
  
  # VPC configuration for RDS access
  vpc_subnet_ids         = module.vpc.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.lambda.id]
  
  # Secrets for database access
  attach_secrets_policy = true
  secrets_arns = [
    aws_secretsmanager_secret.db_credentials.arn
  ]
  
  # X-Ray tracing
  tracing_mode = "Active"
  
  tags = {
    Environment = "production"
    Service     = "event-processing"
  }
}
```

### High-Performance Data Processing

```hcl
module "data_processor" {
  source = "./modules/aws/lambda"

  function_name = "data-processor"
  description   = "High-performance data processing"
  runtime       = "java17"
  
  # Java optimizations
  memory_size = 3008  # 3GB for memory-intensive processing
  timeout     = 900   # 15 minutes
  architectures = ["arm64"]  # Better price/performance
  
  # SnapStart for faster cold starts
  snap_start = true
  publish    = true
  
  # Provisioned concurrency for consistent performance
  provisioned_concurrent_executions = 5
  
  # EFS for shared data access
  file_system_config = {
    arn              = aws_efs_access_point.lambda.arn
    local_mount_path = "/mnt/efs"
  }
  
  # Ephemeral storage for temp files
  ephemeral_storage_size = 10240  # 10GB
  
  # Kinesis event source
  event_source_mappings = {
    kinesis = {
      event_source_arn = aws_kinesis_stream.data.arn
      starting_position = "LATEST"
      batch_size = 100
      parallelization_factor = 10
      
      # Tumbling windows for aggregation
      tumbling_window_in_seconds = 60
      
      # Error handling
      maximum_retry_attempts = 3
      maximum_record_age_in_seconds = 3600
      bisect_batch_on_function_error = true
    }
  }
  
  # S3 access for results
  attach_s3_policy = true
  s3_bucket_names = ["data-processing-results"]
  s3_actions = ["s3:PutObject", "s3:PutObjectAcl"]
  
  tags = {
    Environment = "production"
    Workload    = "data-processing"
  }
}
```

### HTTP API with Function URL

```hcl
module "http_api" {
  source = "./modules/aws/lambda"

  function_name = "http-api"
  description   = "HTTP API endpoint"
  runtime       = "go1.x"
  
  # Go optimizations - small binary, fast startup
  memory_size = 256
  timeout     = 29  # API Gateway timeout is 30s
  
  # Function URL for direct HTTP access
  create_function_url = true
  function_url_authorization_type = "NONE"  # Public endpoint
  
  function_url_cors = {
    allow_origins = ["https://example.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["content-type", "x-api-key"]
    max_age = 86400
  }
  
  # Async invocation config
  maximum_event_age_in_seconds = 21600  # 6 hours
  maximum_retry_attempts = 2
  
  destination_on_success = aws_sns_topic.success.arn
  destination_on_failure = aws_sqs_queue.failures.arn
  
  # CloudWatch Logs with encryption
  cloudwatch_logs_retention_days = 30
  cloudwatch_logs_kms_key_id    = aws_kms_key.logs.arn
  
  # Custom IAM policy
  attach_policy_json = true
  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem"
        ]
        Resource = aws_dynamodb_table.cache.arn
      }
    ]
  })
  
  tags = {
    Environment = "production"
    Type        = "api"
  }
}
```

### Scheduled Task Lambda

```hcl
module "scheduled_task" {
  source = "./modules/aws/lambda"

  function_name = "cleanup-task"
  description   = "Scheduled cleanup task"
  runtime       = "python3.11"
  
  timeout     = 300
  memory_size = 1024
  
  # EventBridge trigger
  allowed_triggers = {
    eventbridge = {
      action     = "lambda:InvokeFunction"
      principal  = "events.amazonaws.com"
      source_arn = aws_cloudwatch_event_rule.schedule.arn
    }
  }
  
  # Alias for stable endpoint
  create_alias = true
  alias_name   = "prod"
  
  # Multiple IAM policies
  attach_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    aws_iam_policy.custom.arn
  ]
  
  tags = {
    Environment = "production"
    Type        = "scheduled-task"
  }
}
```

## Smart Defaults by Runtime

### Node.js
- Handler: `index.handler`
- Memory: 512 MB
- Timeout: 30 seconds

### Python
- Handler: `lambda_function.lambda_handler`
- Memory: 512 MB
- Timeout: 60 seconds

### Java
- Handler: `com.example.Handler::handleRequest`
- Memory: 1024 MB
- Timeout: 60 seconds

### Go
- Handler: `main`
- Memory: 256 MB
- Timeout: 30 seconds

## Cost Optimization Tips

1. **Use ARM64 architecture** for better price/performance
2. **Right-size memory** based on profiling
3. **Use Fargate for container functions** over 10GB
4. **Enable SnapStart** for Java functions
5. **Set appropriate log retention** to reduce storage costs