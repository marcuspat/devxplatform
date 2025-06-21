terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Dead Letter Queue
resource "aws_sqs_queue" "dlq" {
  count = var.create_dlq ? 1 : 0

  name                       = var.dlq_name != "" ? var.dlq_name : "${var.queue_name}-dlq"
  delay_seconds              = var.dlq_delay_seconds
  max_message_size           = var.dlq_max_message_size
  message_retention_seconds  = var.dlq_message_retention_seconds
  receive_wait_time_seconds  = var.dlq_receive_wait_time_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout_seconds

  sqs_managed_sse_enabled = var.dlq_sqs_managed_sse_enabled
  kms_master_key_id       = var.dlq_kms_master_key_id
  kms_data_key_reuse_period_seconds = var.dlq_kms_data_key_reuse_period_seconds

  fifo_queue                  = var.dlq_fifo_queue
  content_based_deduplication = var.dlq_fifo_queue ? var.dlq_content_based_deduplication : null
  deduplication_scope         = var.dlq_fifo_queue ? var.dlq_deduplication_scope : null
  fifo_throughput_limit       = var.dlq_fifo_queue ? var.dlq_fifo_throughput_limit : null

  tags = merge(var.tags, {
    Name = var.dlq_name != "" ? var.dlq_name : "${var.queue_name}-dlq"
    Type = "DLQ"
  })
}

# Dead Letter Queue Policy
resource "aws_sqs_queue_policy" "dlq" {
  count = var.create_dlq && length(var.dlq_policy_statements) > 0 ? 1 : 0

  queue_url = aws_sqs_queue.dlq[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = var.dlq_policy_statements
  })
}

# Main SQS Queue
resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  delay_seconds              = var.delay_seconds
  max_message_size           = var.max_message_size
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  visibility_timeout_seconds = var.visibility_timeout_seconds

  # Encryption
  sqs_managed_sse_enabled = var.sqs_managed_sse_enabled
  kms_master_key_id       = var.kms_master_key_id
  kms_data_key_reuse_period_seconds = var.kms_data_key_reuse_period_seconds

  # FIFO Configuration
  fifo_queue                  = var.fifo_queue
  content_based_deduplication = var.fifo_queue ? var.content_based_deduplication : null
  deduplication_scope         = var.fifo_queue ? var.deduplication_scope : null
  fifo_throughput_limit       = var.fifo_queue ? var.fifo_throughput_limit : null

  # Dead Letter Queue Configuration
  redrive_policy = var.create_dlq ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = var.max_receive_count
  }) : var.redrive_policy

  # Allow redriving from the DLQ
  redrive_allow_policy = var.create_dlq ? jsonencode({
    redrivePermission = var.redrive_allow_policy_permission
    sourceQueueArns   = [aws_sqs_queue.dlq[0].arn]
  }) : var.redrive_allow_policy

  tags = merge(var.tags, {
    Name = var.queue_name
  })
}

# Queue Policy
resource "aws_sqs_queue_policy" "main" {
  count = length(var.policy_statements) > 0 ? 1 : 0

  queue_url = aws_sqs_queue.main.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = var.policy_statements
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.queue_name}-high-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ApproximateNumberOfMessages"
  namespace           = "AWS/SQS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.queue_depth_threshold
  alarm_description   = "This metric monitors SQS queue depth"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "queue_age" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.queue_name}-high-message-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = var.alarm_period
  statistic           = "Maximum"
  threshold           = var.message_age_threshold
  alarm_description   = "This metric monitors SQS message age"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  count = var.create_dlq && var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.queue_name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessages"
  namespace           = "AWS/SQS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.dlq_depth_threshold
  alarm_description   = "This metric monitors DLQ message count"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq[0].name
  }

  tags = var.tags
}

# EventBridge Rule for SQS events (optional)
resource "aws_cloudwatch_event_rule" "sqs_events" {
  count = var.create_eventbridge_rule ? 1 : 0

  name        = "${var.queue_name}-events"
  description = "Capture SQS events for ${var.queue_name}"

  event_pattern = jsonencode({
    source      = ["aws.sqs"]
    detail-type = ["SQS Queue Events"]
    detail = {
      eventName = var.eventbridge_event_names
      resources = {
        queueArn = [aws_sqs_queue.main.arn]
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sqs_events" {
  count = var.create_eventbridge_rule && var.eventbridge_target_arn != "" ? 1 : 0

  rule      = aws_cloudwatch_event_rule.sqs_events[0].name
  target_id = "${var.queue_name}-target"
  arn       = var.eventbridge_target_arn

  dynamic "input_transformer" {
    for_each = var.eventbridge_input_transformer != null ? [var.eventbridge_input_transformer] : []
    content {
      input_paths    = input_transformer.value.input_paths
      input_template = input_transformer.value.input_template
    }
  }
}

# Lambda Event Source Mapping (if Lambda function ARN is provided)
resource "aws_lambda_event_source_mapping" "sqs_lambda" {
  count = var.lambda_function_arn != "" ? 1 : 0

  event_source_arn = aws_sqs_queue.main.arn
  function_name    = var.lambda_function_arn
  enabled          = var.lambda_event_source_mapping_enabled
  batch_size       = var.lambda_batch_size
  maximum_batching_window_in_seconds = var.lambda_maximum_batching_window

  dynamic "scaling_config" {
    for_each = var.lambda_scaling_config != null ? [var.lambda_scaling_config] : []
    content {
      maximum_concurrency = scaling_config.value.maximum_concurrency
    }
  }

  dynamic "filter_criteria" {
    for_each = var.lambda_filter_criteria != null ? [var.lambda_filter_criteria] : []
    content {
      dynamic "filter" {
        for_each = filter_criteria.value.filters
        content {
          pattern = filter.value.pattern
        }
      }
    }
  }
}

# IAM Policy Document for SQS Access
data "aws_iam_policy_document" "sqs_access" {
  statement {
    sid    = "SQSQueueAccess"
    effect = "Allow"
    actions = [
      "sqs:ChangeMessageVisibility",
      "sqs:ChangeMessageVisibilityBatch",
      "sqs:DeleteMessage",
      "sqs:DeleteMessageBatch",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ListQueues",
      "sqs:PurgeQueue",
      "sqs:ReceiveMessage",
      "sqs:SendMessage",
      "sqs:SendMessageBatch",
      "sqs:SetQueueAttributes"
    ]
    resources = [
      aws_sqs_queue.main.arn,
    ]
  }

  dynamic "statement" {
    for_each = var.create_dlq ? [1] : []
    content {
      sid    = "SQSDLQAccess"
      effect = "Allow"
      actions = [
        "sqs:ChangeMessageVisibility",
        "sqs:ChangeMessageVisibilityBatch",
        "sqs:DeleteMessage",
        "sqs:DeleteMessageBatch",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
        "sqs:SendMessage",
        "sqs:SendMessageBatch",
        "sqs:SetQueueAttributes"
      ]
      resources = [
        aws_sqs_queue.dlq[0].arn,
      ]
    }
  }

  dynamic "statement" {
    for_each = var.kms_master_key_id != null || var.dlq_kms_master_key_id != null ? [1] : []
    content {
      sid    = "SQSKMSAccess"
      effect = "Allow"
      actions = [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ]
      resources = compact([
        var.kms_master_key_id,
        var.dlq_kms_master_key_id
      ])
    }
  }
}

# IAM Policy for SQS Access
resource "aws_iam_policy" "sqs_access" {
  count = var.create_iam_policy ? 1 : 0

  name        = "${var.queue_name}-sqs-access-policy"
  description = "IAM policy for accessing SQS queue ${var.queue_name}"
  policy      = data.aws_iam_policy_document.sqs_access.json

  tags = var.tags
}

# SNS Topic for Alarms
resource "aws_sns_topic" "sqs_alarms" {
  count = var.create_sns_topic ? 1 : 0

  name         = "${var.queue_name}-alarms"
  display_name = "SQS Alarms for ${var.queue_name}"
  kms_master_key_id = var.sns_kms_key_id

  tags = var.tags
}

resource "aws_sns_topic_subscription" "sqs_alarms_email" {
  count = var.create_sns_topic && var.alarm_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.sqs_alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}