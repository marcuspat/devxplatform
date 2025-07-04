terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

locals {
  function_name = var.function_name
  
  # Smart defaults based on runtime
  runtime_defaults = {
    nodejs = {
      handler = "index.handler"
      timeout = 30
      memory  = 512
    }
    python = {
      handler = "lambda_function.lambda_handler"
      timeout = 60
      memory  = 512
    }
    java = {
      handler = "com.example.Handler::handleRequest"
      timeout = 60
      memory  = 1024
    }
    go = {
      handler = "main"
      timeout = 30
      memory  = 256
    }
  }
  
  runtime_family = split(".", var.runtime)[0]
  handler        = coalesce(var.handler, try(local.runtime_defaults[local.runtime_family].handler, "index.handler"))
  timeout        = coalesce(var.timeout, try(local.runtime_defaults[local.runtime_family].timeout, 30))
  memory_size    = coalesce(var.memory_size, try(local.runtime_defaults[local.runtime_family].memory, 512))
}

# Lambda Function
resource "aws_lambda_function" "this" {
  function_name = local.function_name
  role         = aws_iam_role.lambda.arn

  # Code source
  filename         = var.filename
  source_code_hash = var.source_code_hash
  s3_bucket        = var.s3_bucket
  s3_key           = var.s3_key
  s3_object_version = var.s3_object_version
  image_uri        = var.image_uri

  # Configuration
  handler                        = var.package_type == "Image" ? null : local.handler
  runtime                        = var.package_type == "Image" ? null : var.runtime
  timeout                        = local.timeout
  memory_size                    = local.memory_size
  reserved_concurrent_executions = var.reserved_concurrent_executions
  package_type                   = var.package_type
  architectures                  = var.architectures
  publish                        = var.publish

  # Environment variables
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [true] : []
    content {
      variables = var.environment_variables
    }
  }

  # VPC configuration
  dynamic "vpc_config" {
    for_each = var.vpc_subnet_ids != null ? [true] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = var.create_security_group ? concat([aws_security_group.lambda[0].id], var.vpc_security_group_ids) : var.vpc_security_group_ids
    }
  }

  # Dead letter config
  dynamic "dead_letter_config" {
    for_each = var.dead_letter_target_arn != null ? [true] : []
    content {
      target_arn = var.dead_letter_target_arn
    }
  }

  # Tracing
  dynamic "tracing_config" {
    for_each = var.tracing_mode != null ? [true] : []
    content {
      mode = var.tracing_mode
    }
  }

  # File system config for EFS
  dynamic "file_system_config" {
    for_each = var.file_system_config != null ? [var.file_system_config] : []
    content {
      arn              = file_system_config.value.arn
      local_mount_path = file_system_config.value.local_mount_path
    }
  }

  # Ephemeral storage
  dynamic "ephemeral_storage" {
    for_each = var.ephemeral_storage_size != null ? [true] : []
    content {
      size = var.ephemeral_storage_size
    }
  }

  # Snap start (Java)
  dynamic "snap_start" {
    for_each = var.snap_start ? [true] : []
    content {
      apply_on = "PublishedVersions"
    }
  }

  layers = var.layers

  tags = merge(var.tags, {
    Name = local.function_name
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_cloudwatch_log_group.lambda
  ]
}

# Lambda Alias for stable endpoint
resource "aws_lambda_alias" "this" {
  count = var.create_alias ? 1 : 0

  name             = var.alias_name
  description      = var.alias_description
  function_name    = aws_lambda_function.this.function_name
  function_version = var.alias_function_version != null ? var.alias_function_version : aws_lambda_function.this.version

  dynamic "routing_config" {
    for_each = var.alias_routing_config != null ? [var.alias_routing_config] : []
    content {
      additional_version_weights = routing_config.value.additional_version_weights
    }
  }
}

# Lambda Permission for triggers
resource "aws_lambda_permission" "this" {
  for_each = var.allowed_triggers

  function_name = aws_lambda_function.this.function_name
  qualifier     = var.create_alias ? aws_lambda_alias.this[0].name : null

  statement_id       = each.key
  action            = each.value.action
  principal         = each.value.principal
  source_arn        = each.value.source_arn
  source_account    = each.value.source_account
  event_source_token = each.value.event_source_token
}

# Event Source Mappings
resource "aws_lambda_event_source_mapping" "this" {
  for_each = var.event_source_mappings

  event_source_arn = each.value.event_source_arn
  function_name    = var.create_alias ? aws_lambda_alias.this[0].arn : aws_lambda_function.this.arn

  enabled                            = each.value.enabled
  batch_size                        = each.value.batch_size
  maximum_batching_window_in_seconds = each.value.maximum_batching_window_in_seconds
  parallelization_factor            = each.value.parallelization_factor
  starting_position                 = each.value.starting_position
  starting_position_timestamp       = each.value.starting_position_timestamp
  maximum_record_age_in_seconds     = each.value.maximum_record_age_in_seconds
  bisect_batch_on_function_error    = each.value.bisect_batch_on_function_error
  maximum_retry_attempts            = each.value.maximum_retry_attempts
  tumbling_window_in_seconds        = each.value.tumbling_window_in_seconds

  dynamic "destination_config" {
    for_each = each.value.destination_config != null ? [each.value.destination_config] : []
    content {
      dynamic "on_failure" {
        for_each = destination_config.value.on_failure != null ? [destination_config.value.on_failure] : []
        content {
          destination_arn = on_failure.value.destination_arn
        }
      }
    }
  }

  dynamic "filter_criteria" {
    for_each = each.value.filter_criteria != null ? [each.value.filter_criteria] : []
    content {
      dynamic "filter" {
        for_each = filter_criteria.value.filters
        content {
          pattern = filter.value.pattern
        }
      }
    }
  }

  dynamic "self_managed_event_source" {
    for_each = each.value.self_managed_event_source != null ? [each.value.self_managed_event_source] : []
    content {
      endpoints = self_managed_event_source.value.endpoints
    }
  }

  dynamic "source_access_configuration" {
    for_each = each.value.source_access_configurations
    content {
      type = source_access_configuration.value.type
      uri  = source_access_configuration.value.uri
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = var.cloudwatch_logs_retention_days
  kms_key_id        = var.cloudwatch_logs_kms_key_id

  tags = var.tags
}

# Async Invocation Configuration
resource "aws_lambda_function_event_invoke_config" "this" {
  count = var.maximum_event_age_in_seconds != null || var.maximum_retry_attempts != null ? 1 : 0

  function_name                = aws_lambda_function.this.function_name
  qualifier                    = var.create_alias ? aws_lambda_alias.this[0].name : null
  maximum_event_age_in_seconds = var.maximum_event_age_in_seconds
  maximum_retry_attempts       = var.maximum_retry_attempts

  dynamic "destination_config" {
    for_each = var.destination_on_failure != null || var.destination_on_success != null ? [true] : []
    content {
      dynamic "on_failure" {
        for_each = var.destination_on_failure != null ? [true] : []
        content {
          destination = var.destination_on_failure
        }
      }

      dynamic "on_success" {
        for_each = var.destination_on_success != null ? [true] : []
        content {
          destination = var.destination_on_success
        }
      }
    }
  }
}

# Provisioned Concurrency
resource "aws_lambda_provisioned_concurrency_config" "this" {
  count = var.provisioned_concurrent_executions != null ? 1 : 0

  function_name                     = aws_lambda_function.this.function_name
  provisioned_concurrent_executions = var.provisioned_concurrent_executions
  qualifier                         = var.create_alias ? aws_lambda_alias.this[0].name : aws_lambda_function.this.version
}

# Function URL
resource "aws_lambda_function_url" "this" {
  count = var.create_function_url ? 1 : 0

  function_name      = aws_lambda_function.this.function_name
  qualifier          = var.create_alias ? aws_lambda_alias.this[0].name : null
  authorization_type = var.function_url_authorization_type

  dynamic "cors" {
    for_each = var.function_url_cors != null ? [var.function_url_cors] : []
    content {
      allow_credentials = cors.value.allow_credentials
      allow_headers     = cors.value.allow_headers
      allow_methods     = cors.value.allow_methods
      allow_origins     = cors.value.allow_origins
      expose_headers    = cors.value.expose_headers
      max_age          = cors.value.max_age
    }
  }
}

# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Security Group for Lambda in VPC
resource "aws_security_group" "lambda" {
  count = var.vpc_subnet_ids != null && var.create_security_group ? 1 : 0

  name_prefix = "${local.function_name}-lambda-"
  description = "Security group for Lambda function ${local.function_name}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${local.function_name}-lambda-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group Rules
resource "aws_security_group_rule" "lambda_egress" {
  count = var.vpc_subnet_ids != null && var.create_security_group ? 1 : 0

  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.lambda[0].id
  description       = "Allow all outbound traffic"
}

# Additional egress rules for specific services
resource "aws_security_group_rule" "lambda_egress_custom" {
  for_each = var.vpc_subnet_ids != null && var.create_security_group ? var.security_group_egress_rules : {}

  type              = "egress"
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  protocol          = each.value.protocol
  cidr_blocks       = lookup(each.value, "cidr_blocks", null)
  prefix_list_ids   = lookup(each.value, "prefix_list_ids", null)
  security_group_id = aws_security_group.lambda[0].id
  description       = each.value.description
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.error_alarm_evaluation_periods
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = var.error_alarm_period
  statistic           = "Sum"
  threshold           = var.error_alarm_threshold
  alarm_description   = "This metric monitors Lambda function errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.function_name}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.throttle_alarm_evaluation_periods
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = var.throttle_alarm_period
  statistic           = "Sum"
  threshold           = var.throttle_alarm_threshold
  alarm_description   = "This metric monitors Lambda function throttles"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.duration_alarm_evaluation_periods
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = var.duration_alarm_period
  statistic           = "Average"
  threshold           = var.duration_alarm_threshold
  alarm_description   = "This metric monitors Lambda function duration"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_concurrent_executions" {
  count = var.enable_cloudwatch_alarms && var.reserved_concurrent_executions != null ? 1 : 0

  alarm_name          = "${local.function_name}-concurrent-executions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.concurrent_alarm_evaluation_periods
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = var.concurrent_alarm_period
  statistic           = "Maximum"
  threshold           = var.concurrent_alarm_threshold != null ? var.concurrent_alarm_threshold : var.reserved_concurrent_executions * 0.9
  alarm_description   = "This metric monitors Lambda concurrent executions"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_dead_letter_errors" {
  count = var.enable_cloudwatch_alarms && var.dead_letter_target_arn != null ? 1 : 0

  alarm_name          = "${local.function_name}-dead-letter-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.dlq_alarm_evaluation_periods
  metric_name         = "DeadLetterErrors"
  namespace           = "AWS/Lambda"
  period              = var.dlq_alarm_period
  statistic           = "Sum"
  threshold           = var.dlq_alarm_threshold
  alarm_description   = "This metric monitors Lambda dead letter queue errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "lambda" {
  count = var.create_cloudwatch_dashboard ? 1 : 0

  dashboard_name = "${local.function_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.this.function_name, { stat = "Sum" }],
            [".", "Errors", ".", ".", { stat = "Sum" }],
            [".", "Throttles", ".", ".", { stat = "Sum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Invocations, Errors, and Throttles"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.this.function_name, { stat = "Average" }],
            ["...", { stat = "Maximum" }],
            ["...", { stat = "Minimum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Duration (ms)"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", aws_lambda_function.this.function_name, { stat = "Maximum" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Concurrent Executions"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.lambda.name}' | fields @timestamp, @message | sort @timestamp desc | limit 100"
          region  = data.aws_region.current.name
          title   = "Recent Logs"
        }
      }
    ]
  })
}