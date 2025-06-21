terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = var.dashboard_name

  dashboard_body = jsonencode({
    widgets = concat(
      var.enable_ecs_widgets ? local.ecs_widgets : [],
      var.enable_alb_widgets ? local.alb_widgets : [],
      var.enable_rds_widgets ? local.rds_widgets : [],
      var.enable_lambda_widgets ? local.lambda_widgets : [],
      var.enable_dynamodb_widgets ? local.dynamodb_widgets : [],
      var.custom_widgets
    )
  })
}

# Log Groups for Application Logs
resource "aws_cloudwatch_log_group" "application_logs" {
  for_each          = var.log_groups
  name              = each.value.name
  retention_in_days = each.value.retention_days
  kms_key_id        = var.enable_log_encryption ? aws_kms_key.logs[0].arn : null

  tags = merge(var.tags, {
    Name = each.value.name
  })
}

# KMS Key for Log Encryption
resource "aws_kms_key" "logs" {
  count                   = var.enable_log_encryption ? 1 : 0
  description             = "KMS key for CloudWatch Logs encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "cloudwatch-logs-key"
  })
}

resource "aws_kms_alias" "logs" {
  count         = var.enable_log_encryption ? 1 : 0
  name          = "alias/cloudwatch-logs"
  target_key_id = aws_kms_key.logs[0].key_id
}

# CloudWatch Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_filter" {
  for_each       = var.enable_error_tracking ? var.log_groups : {}
  name           = "${each.key}-error-filter"
  log_group_name = aws_cloudwatch_log_group.application_logs[each.key].name
  pattern        = "[timestamp, request_id, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "${each.key}-error-count"
    namespace = var.metrics_namespace
    value     = "1"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "error_rate_alarm" {
  for_each            = var.enable_error_tracking ? var.log_groups : {}
  alarm_name          = "${each.key}-error-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "${each.key}-error-count"
  namespace           = var.metrics_namespace
  period              = "300"
  statistic           = "Sum"
  threshold           = var.error_threshold
  alarm_description   = "This metric monitors error rate for ${each.key}"
  alarm_actions       = var.alarm_actions

  tags = var.tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  count = var.create_sns_topic ? 1 : 0
  name  = var.sns_topic_name

  tags = merge(var.tags, {
    Name = var.sns_topic_name
  })
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.create_sns_topic && length(var.alert_email_addresses) > 0 ? length(var.alert_email_addresses) : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# CloudWatch Composite Alarms
resource "aws_cloudwatch_composite_alarm" "application_health" {
  count               = var.enable_composite_alarms ? 1 : 0
  alarm_name          = "${var.dashboard_name}-application-health"
  alarm_description   = "Composite alarm for overall application health"
  alarm_rule          = var.composite_alarm_rule
  actions_enabled     = true
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  insufficient_data_actions = []

  tags = var.tags
}

# Local values for widget configurations
locals {
  ecs_widgets = [
    {
      type   = "metric"
      x      = 0
      y      = 0
      width  = 12
      height = 6
      properties = {
        metrics = [
          ["AWS/ECS", "CPUUtilization", "ServiceName", var.ecs_service_name, "ClusterName", var.ecs_cluster_name],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ]
        period = 300
        stat   = "Average"
        region = data.aws_region.current.name
        title  = "ECS Service Metrics"
      }
    }
  ]

  alb_widgets = [
    {
      type   = "metric"
      x      = 0
      y      = 6
      width  = 12
      height = 6
      properties = {
        metrics = [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_name],
          [".", "TargetResponseTime", ".", "."],
          [".", "HTTPCode_Target_2XX_Count", ".", "."],
          [".", "HTTPCode_Target_4XX_Count", ".", "."],
          [".", "HTTPCode_Target_5XX_Count", ".", "."]
        ]
        period = 300
        stat   = "Sum"
        region = data.aws_region.current.name
        title  = "ALB Metrics"
      }
    }
  ]

  rds_widgets = [
    {
      type   = "metric"
      x      = 0
      y      = 12
      width  = 12
      height = 6
      properties = {
        metrics = [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
          [".", "DatabaseConnections", ".", "."],
          [".", "FreeableMemory", ".", "."]
        ]
        period = 300
        stat   = "Average"
        region = data.aws_region.current.name
        title  = "RDS Metrics"
      }
    }
  ]

  lambda_widgets = [
    {
      type   = "metric"
      x      = 0
      y      = 18
      width  = 12
      height = 6
      properties = {
        metrics = [
          ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name],
          [".", "Duration", ".", "."],
          [".", "Errors", ".", "."]
        ]
        period = 300
        stat   = "Sum"
        region = data.aws_region.current.name
        title  = "Lambda Metrics"
      }
    }
  ]

  dynamodb_widgets = [
    {
      type   = "metric"
      x      = 0
      y      = 24
      width  = 12
      height = 6
      properties = {
        metrics = [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.dynamodb_table_name],
          [".", "ConsumedWriteCapacityUnits", ".", "."],
          [".", "ThrottledRequests", ".", "."]
        ]
        period = 300
        stat   = "Sum"
        region = data.aws_region.current.name
        title  = "DynamoDB Metrics"
      }
    }
  ]
}

# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# CloudWatch Synthetics Canary for endpoint monitoring
resource "aws_synthetics_canary" "endpoint_monitoring" {
  count                    = var.enable_synthetics ? 1 : 0
  name                     = "${var.dashboard_name}-endpoint-monitor"
  artifact_s3_location     = "s3://${var.synthetics_s3_bucket}/"
  execution_role_arn       = aws_iam_role.synthetics[0].arn
  handler                  = "apiCanaryBlueprint.handler"
  zip_file                 = var.synthetics_zip_file
  runtime_version          = var.synthetics_runtime_version
  start_canary             = true

  schedule {
    expression = var.synthetics_schedule
  }

  run_config {
    timeout_in_seconds = var.synthetics_timeout
    memory_in_mb      = 960
    active_tracing    = true
  }

  success_retention_period = var.synthetics_success_retention
  failure_retention_period = var.synthetics_failure_retention

  tags = merge(var.tags, {
    Name = "${var.dashboard_name}-endpoint-monitor"
  })
}

# IAM Role for Synthetics
resource "aws_iam_role" "synthetics" {
  count = var.enable_synthetics ? 1 : 0
  name  = "${var.dashboard_name}-synthetics-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "synthetics_execution" {
  count      = var.enable_synthetics ? 1 : 0
  role       = aws_iam_role.synthetics[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsFullAccess"
}

# CloudWatch Insights Query Definitions
resource "aws_cloudwatch_query_definition" "error_analysis" {
  count = var.enable_insights_queries ? 1 : 0
  name  = "${var.dashboard_name}-error-analysis"

  log_group_names = [for k, v in aws_cloudwatch_log_group.application_logs : v.name]

  query_string = <<-EOT
    fields @timestamp, @message, level, error, stack_trace
    | filter level = "ERROR"
    | stats count() by error
    | sort count desc
  EOT
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  count = var.enable_insights_queries ? 1 : 0
  name  = "${var.dashboard_name}-performance-analysis"

  log_group_names = [for k, v in aws_cloudwatch_log_group.application_logs : v.name]

  query_string = <<-EOT
    fields @timestamp, @message, duration, endpoint
    | filter duration > 1000
    | stats avg(duration), max(duration), min(duration) by endpoint
    | sort avg desc
  EOT
}

# Application Load Balancer Alarms
resource "aws_cloudwatch_metric_alarm" "alb_target_response_time" {
  count               = var.enable_alb_alarms && var.alb_name != "" ? 1 : 0
  alarm_name          = "${var.alb_name}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.alb_response_time_threshold
  alarm_description   = "ALB target response time is too high"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  count               = var.enable_alb_alarms && var.alb_name != "" ? 1 : 0
  alarm_name          = "${var.alb_name}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.alb_unhealthy_host_threshold
  alarm_description   = "ALB has unhealthy targets"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = var.alb_target_group_arn_suffix
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# RDS Alarms
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count               = var.enable_rds_alarms && var.rds_instance_id != "" ? 1 : 0
  alarm_name          = "${var.rds_instance_id}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.rds_cpu_threshold
  alarm_description   = "RDS instance CPU utilization is too high"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count               = var.enable_rds_alarms && var.rds_instance_id != "" ? 1 : 0
  alarm_name          = "${var.rds_instance_id}-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.rds_connection_threshold
  alarm_description   = "RDS database connections are too high"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count               = var.enable_rds_alarms && var.rds_instance_id != "" ? 1 : 0
  alarm_name          = "${var.rds_instance_id}-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.rds_storage_threshold_bytes
  alarm_description   = "RDS free storage space is too low"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = var.tags
}

# ECS Alarms
resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  count               = var.enable_ecs_alarms && var.ecs_service_name != "" ? 1 : 0
  alarm_name          = "${var.ecs_service_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.ecs_cpu_threshold
  alarm_description   = "ECS service CPU utilization is too high"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  count               = var.enable_ecs_alarms && var.ecs_service_name != "" ? 1 : 0
  alarm_name          = "${var.ecs_service_name}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.ecs_memory_threshold
  alarm_description   = "ECS service memory utilization is too high"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = var.tags
}

# CloudWatch Anomaly Detection Alarm
resource "aws_cloudwatch_metric_alarm" "request_anomaly" {
  count                     = var.enable_anomaly_detection ? 1 : 0
  alarm_name                = "${var.alb_name}-request-anomaly"
  comparison_operator       = "LessThanLowerOrGreaterThanUpperThreshold"
  evaluation_periods        = "2"
  threshold_metric_id       = "ad1"
  alarm_description         = "Request count anomaly detected"
  alarm_actions             = var.alarm_actions
  insufficient_data_actions = []

  metric_query {
    id          = "m1"
    return_data = true

    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = "300"
      stat        = "Average"

      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
  }

  tags = var.tags
}

# X-Ray Service Map
resource "aws_xray_group" "main" {
  count           = var.enable_xray ? 1 : 0
  group_name      = var.dashboard_name
  filter_expression = var.xray_filter_expression

  tags = var.tags
}

resource "aws_xray_sampling_rule" "main" {
  count         = var.enable_xray ? 1 : 0
  rule_name     = var.dashboard_name
  priority      = 1000
  version       = 1
  reservoir_size = 1
  fixed_rate    = var.xray_sampling_rate
  url_path      = "*"
  host          = "*"
  http_method   = "*"
  service_type  = "*"
  service_name  = "*"
  resource_arn  = "*"

  tags = var.tags
}