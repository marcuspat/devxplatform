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

# SNS Topic
resource "aws_sns_topic" "main" {
  name                              = var.topic_name
  display_name                      = var.display_name
  policy                           = var.policy
  delivery_policy                  = var.delivery_policy
  application_success_feedback_role_arn    = var.application_success_feedback_role_arn
  application_success_feedback_sample_rate = var.application_success_feedback_sample_rate
  application_failure_feedback_role_arn    = var.application_failure_feedback_role_arn
  http_success_feedback_role_arn           = var.http_success_feedback_role_arn
  http_success_feedback_sample_rate        = var.http_success_feedback_sample_rate
  http_failure_feedback_role_arn           = var.http_failure_feedback_role_arn
  lambda_success_feedback_role_arn         = var.lambda_success_feedback_role_arn
  lambda_success_feedback_sample_rate      = var.lambda_success_feedback_sample_rate
  lambda_failure_feedback_role_arn         = var.lambda_failure_feedback_role_arn
  sqs_success_feedback_role_arn            = var.sqs_success_feedback_role_arn
  sqs_success_feedback_sample_rate         = var.sqs_success_feedback_sample_rate
  sqs_failure_feedback_role_arn            = var.sqs_failure_feedback_role_arn
  firehose_success_feedback_role_arn       = var.firehose_success_feedback_role_arn
  firehose_success_feedback_sample_rate    = var.firehose_success_feedback_sample_rate
  firehose_failure_feedback_role_arn       = var.firehose_failure_feedback_role_arn
  kms_master_key_id                        = var.kms_master_key_id
  content_based_deduplication              = var.fifo_topic ? var.content_based_deduplication : null
  fifo_topic                               = var.fifo_topic
  signature_version                        = var.signature_version
  tracing_config                           = var.tracing_config

  tags = merge(var.tags, {
    Name = var.topic_name
  })
}

# SNS Topic Policy
resource "aws_sns_topic_policy" "main" {
  count = var.topic_policy != "" ? 1 : 0

  arn    = aws_sns_topic.main.arn
  policy = var.topic_policy
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "subscriptions" {
  for_each = { for idx, sub in var.subscriptions : idx => sub }

  topic_arn                       = aws_sns_topic.main.arn
  protocol                        = each.value.protocol
  endpoint                        = each.value.endpoint
  endpoint_auto_confirms          = lookup(each.value, "endpoint_auto_confirms", null)
  confirmation_timeout_in_minutes = lookup(each.value, "confirmation_timeout_in_minutes", null)
  raw_message_delivery           = lookup(each.value, "raw_message_delivery", null)
  filter_policy                  = lookup(each.value, "filter_policy", null)
  filter_policy_scope            = lookup(each.value, "filter_policy_scope", null)
  delivery_policy                = lookup(each.value, "delivery_policy", null)
  redrive_policy                 = lookup(each.value, "redrive_policy", null)
  subscription_role_arn          = lookup(each.value, "subscription_role_arn", null)
  replay_policy                  = lookup(each.value, "replay_policy", null)
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "number_of_messages_published" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.topic_name}-messages-published"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "NumberOfMessagesPublished"
  namespace           = "AWS/SNS"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.messages_published_threshold
  alarm_description   = "This metric monitors SNS messages published"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    TopicName = aws_sns_topic.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "number_of_notifications_delivered" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.topic_name}-notifications-delivered"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "NumberOfNotificationsDelivered"
  namespace           = "AWS/SNS"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.notifications_delivered_threshold
  alarm_description   = "This metric monitors SNS notifications delivered"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    TopicName = aws_sns_topic.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "number_of_notifications_failed" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.topic_name}-notifications-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "NumberOfNotificationsFailed"
  namespace           = "AWS/SNS"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.notifications_failed_threshold
  alarm_description   = "This metric monitors SNS notifications failed"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = "notBreaching"

  dimensions = {
    TopicName = aws_sns_topic.main.name
  }

  tags = var.tags
}

# IAM Policy Document for SNS Access
data "aws_iam_policy_document" "sns_access" {
  statement {
    sid    = "SNSTopicAccess"
    effect = "Allow"
    actions = [
      "sns:Publish",
      "sns:GetTopicAttributes",
      "sns:SetTopicAttributes",
      "sns:AddPermission",
      "sns:RemovePermission",
      "sns:DeleteTopic",
      "sns:Subscribe",
      "sns:ListSubscriptionsByTopic",
      "sns:GetSubscriptionAttributes",
      "sns:SetSubscriptionAttributes",
      "sns:Unsubscribe"
    ]
    resources = [
      aws_sns_topic.main.arn
    ]
  }

  dynamic "statement" {
    for_each = var.kms_master_key_id != null ? [1] : []
    content {
      sid    = "SNSKMSAccess"
      effect = "Allow"
      actions = [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ]
      resources = [var.kms_master_key_id]
    }
  }
}

# IAM Policy for SNS Access
resource "aws_iam_policy" "sns_access" {
  count = var.create_iam_policy ? 1 : 0

  name        = "${var.topic_name}-sns-access-policy"
  description = "IAM policy for accessing SNS topic ${var.topic_name}"
  policy      = data.aws_iam_policy_document.sns_access.json

  tags = var.tags
}

# Dead Letter Queue for failed deliveries
resource "aws_sqs_queue" "dlq" {
  count = var.create_dlq ? 1 : 0

  name                       = "${var.topic_name}-dlq"
  message_retention_seconds  = var.dlq_message_retention_seconds
  visibility_timeout_seconds = var.dlq_visibility_timeout_seconds
  sqs_managed_sse_enabled   = var.dlq_sqs_managed_sse_enabled
  kms_master_key_id         = var.dlq_kms_master_key_id

  tags = merge(var.tags, {
    Name = "${var.topic_name}-dlq"
    Type = "DLQ"
  })
}

# Application Auto Scaling for subscription throughput
resource "aws_appautoscaling_target" "sns_subscription" {
  count = var.enable_auto_scaling ? 1 : 0

  max_capacity       = var.auto_scaling_max_capacity
  min_capacity       = var.auto_scaling_min_capacity
  resource_id        = "topic/${aws_sns_topic.main.name}"
  scalable_dimension = "sns:topic:ProvisionedThroughputInMiBps"
  service_namespace  = "sns"
}

resource "aws_appautoscaling_policy" "sns_subscription_scaling" {
  count = var.enable_auto_scaling ? 1 : 0

  name               = "${var.topic_name}-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sns_subscription[0].resource_id
  scalable_dimension = aws_appautoscaling_target.sns_subscription[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.sns_subscription[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "SNSNumberOfMessagesPublished"
    }
    target_value = var.auto_scaling_target_value
  }
}

# EventBridge Rule for SNS events
resource "aws_cloudwatch_event_rule" "sns_events" {
  count = var.create_eventbridge_rule ? 1 : 0

  name        = "${var.topic_name}-events"
  description = "Capture SNS events for ${var.topic_name}"

  event_pattern = jsonencode({
    source      = ["aws.sns"]
    detail-type = ["SNS Message"]
    detail = {
      topicArn = [aws_sns_topic.main.arn]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sns_events" {
  count = var.create_eventbridge_rule && var.eventbridge_target_arn != "" ? 1 : 0

  rule      = aws_cloudwatch_event_rule.sns_events[0].name
  target_id = "${var.topic_name}-target"
  arn       = var.eventbridge_target_arn

  dynamic "input_transformer" {
    for_each = var.eventbridge_input_transformer != null ? [var.eventbridge_input_transformer] : []
    content {
      input_paths    = input_transformer.value.input_paths
      input_template = input_transformer.value.input_template
    }
  }
}

# Cross-region subscription (if specified)
resource "aws_sns_topic_subscription" "cross_region" {
  for_each = var.cross_region_subscriptions

  provider  = aws.cross_region
  topic_arn = each.value.topic_arn
  protocol  = each.value.protocol
  endpoint  = aws_sns_topic.main.arn

  depends_on = [aws_sns_topic.main]
}

# Data Events for CloudTrail (if needed)
resource "aws_cloudtrail_event_data_store" "sns_events" {
  count = var.enable_cloudtrail_logging ? 1 : 0

  name                          = "${var.topic_name}-data-events"
  multi_region_enabled         = var.cloudtrail_multi_region_enabled
  organization_enabled         = var.cloudtrail_organization_enabled
  termination_protection_enabled = var.cloudtrail_termination_protection_enabled

  advanced_event_selector {
    name = "SNS Data Events"
    
    field_selector {
      field  = "eventCategory"
      equals = ["Data"]
    }
    
    field_selector {
      field  = "resources.type"
      equals = ["AWS::SNS::Topic"]
    }
    
    field_selector {
      field  = "resources.ARN"
      equals = [aws_sns_topic.main.arn]
    }
  }

  tags = var.tags
}

# Lambda permission for SNS invocation
resource "aws_lambda_permission" "sns_invoke" {
  for_each = var.lambda_function_permissions

  statement_id  = "AllowExecutionFromSNS-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.main.arn
}