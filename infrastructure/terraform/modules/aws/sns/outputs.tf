# Topic Outputs
output "topic_id" {
  description = "The ARN of the SNS topic, as a more obvious property (clone of arn)"
  value       = aws_sns_topic.main.id
}

output "topic_arn" {
  description = "The ARN of the SNS topic"
  value       = aws_sns_topic.main.arn
}

output "topic_name" {
  description = "The name of the topic"
  value       = aws_sns_topic.main.name
}

output "topic_display_name" {
  description = "The display name for the topic"
  value       = aws_sns_topic.main.display_name
}

output "topic_policy" {
  description = "The fully-formed AWS policy as JSON"
  value       = aws_sns_topic.main.policy
}

output "topic_owner" {
  description = "The AWS Account ID of the SNS topic owner"
  value       = aws_sns_topic.main.owner
}

output "topic_beginning_archive_time" {
  description = "The oldest timestamp at which a FIFO topic subscriber can start a replay"
  value       = aws_sns_topic.main.beginning_archive_time
}

output "topic_fifo_topic" {
  description = "Whether or not the topic is FIFO"
  value       = aws_sns_topic.main.fifo_topic
}

output "topic_content_based_deduplication" {
  description = "Whether or not content-based deduplication is enabled"
  value       = aws_sns_topic.main.content_based_deduplication
}

# Subscription Outputs
output "subscriptions" {
  description = "Map of subscription objects"
  value = {
    for idx, subscription in aws_sns_topic_subscription.subscriptions :
    idx => {
      arn                 = subscription.arn
      id                  = subscription.id
      protocol            = subscription.protocol
      endpoint            = subscription.endpoint
      owner_id            = subscription.owner_id
      confirmation_was_authenticated = subscription.confirmation_was_authenticated
      pending_confirmation = subscription.pending_confirmation
    }
  }
}

output "subscription_arns" {
  description = "List of ARNs of SNS topic subscriptions"
  value       = [for sub in aws_sns_topic_subscription.subscriptions : sub.arn]
}

output "subscription_ids" {
  description = "List of IDs of SNS topic subscriptions"
  value       = [for sub in aws_sns_topic_subscription.subscriptions : sub.id]
}

# Dead Letter Queue Outputs
output "dlq_id" {
  description = "The URL for the created dead letter queue"
  value       = try(aws_sqs_queue.dlq[0].id, "")
}

output "dlq_arn" {
  description = "The ARN of the dead letter queue"
  value       = try(aws_sqs_queue.dlq[0].arn, "")
}

output "dlq_name" {
  description = "The name of the dead letter queue"
  value       = try(aws_sqs_queue.dlq[0].name, "")
}

output "dlq_url" {
  description = "Same as dlq_id: The URL for the created dead letter queue"
  value       = try(aws_sqs_queue.dlq[0].url, "")
}

# IAM Policy Output
output "iam_policy_arn" {
  description = "The ARN of the IAM policy for SNS access"
  value       = try(aws_iam_policy.sns_access[0].arn, "")
}

output "iam_policy_name" {
  description = "The name of the IAM policy for SNS access"
  value       = try(aws_iam_policy.sns_access[0].name, "")
}

output "iam_policy_id" {
  description = "The ID of the IAM policy for SNS access"
  value       = try(aws_iam_policy.sns_access[0].id, "")
}

# CloudWatch Alarms
output "cloudwatch_alarm_messages_published_id" {
  description = "The ID of the CloudWatch alarm for messages published"
  value       = try(aws_cloudwatch_metric_alarm.number_of_messages_published[0].id, "")
}

output "cloudwatch_alarm_messages_published_arn" {
  description = "The ARN of the CloudWatch alarm for messages published"
  value       = try(aws_cloudwatch_metric_alarm.number_of_messages_published[0].arn, "")
}

output "cloudwatch_alarm_notifications_delivered_id" {
  description = "The ID of the CloudWatch alarm for notifications delivered"
  value       = try(aws_cloudwatch_metric_alarm.number_of_notifications_delivered[0].id, "")
}

output "cloudwatch_alarm_notifications_delivered_arn" {
  description = "The ARN of the CloudWatch alarm for notifications delivered"
  value       = try(aws_cloudwatch_metric_alarm.number_of_notifications_delivered[0].arn, "")
}

output "cloudwatch_alarm_notifications_failed_id" {
  description = "The ID of the CloudWatch alarm for notifications failed"
  value       = try(aws_cloudwatch_metric_alarm.number_of_notifications_failed[0].id, "")
}

output "cloudwatch_alarm_notifications_failed_arn" {
  description = "The ARN of the CloudWatch alarm for notifications failed"
  value       = try(aws_cloudwatch_metric_alarm.number_of_notifications_failed[0].arn, "")
}

# Auto Scaling Outputs
output "auto_scaling_target_id" {
  description = "The ID of the auto scaling target"
  value       = try(aws_appautoscaling_target.sns_subscription[0].id, "")
}

output "auto_scaling_policy_arn" {
  description = "The ARN of the auto scaling policy"
  value       = try(aws_appautoscaling_policy.sns_subscription_scaling[0].arn, "")
}

output "auto_scaling_policy_name" {
  description = "The name of the auto scaling policy"
  value       = try(aws_appautoscaling_policy.sns_subscription_scaling[0].name, "")
}

# EventBridge Rule Outputs
output "eventbridge_rule_id" {
  description = "The ID of the EventBridge rule"
  value       = try(aws_cloudwatch_event_rule.sns_events[0].id, "")
}

output "eventbridge_rule_arn" {
  description = "The ARN of the EventBridge rule"
  value       = try(aws_cloudwatch_event_rule.sns_events[0].arn, "")
}

output "eventbridge_rule_name" {
  description = "The name of the EventBridge rule"
  value       = try(aws_cloudwatch_event_rule.sns_events[0].name, "")
}

# CloudTrail Data Store
output "cloudtrail_data_store_arn" {
  description = "The ARN of the CloudTrail data store"
  value       = try(aws_cloudtrail_event_data_store.sns_events[0].arn, "")
}

output "cloudtrail_data_store_id" {
  description = "The ID of the CloudTrail data store"
  value       = try(aws_cloudtrail_event_data_store.sns_events[0].id, "")
}

# Cross-region Subscriptions
output "cross_region_subscription_arns" {
  description = "Map of cross-region subscription ARNs"
  value       = { for k, v in aws_sns_topic_subscription.cross_region : k => v.arn }
}

output "cross_region_subscription_ids" {
  description = "Map of cross-region subscription IDs"
  value       = { for k, v in aws_sns_topic_subscription.cross_region : k => v.id }
}

# Lambda Permissions
output "lambda_permission_statement_ids" {
  description = "Map of Lambda permission statement IDs"
  value       = { for k, v in aws_lambda_permission.sns_invoke : k => v.statement_id }
}

# Topic URL (for convenience)
output "topic_url" {
  description = "The URL of the SNS topic (for HTTP/HTTPS endpoints)"
  value       = "https://sns.${data.aws_region.current.name}.amazonaws.com/${data.aws_caller_identity.current.account_id}:${aws_sns_topic.main.name}"
}

# Connection Information
output "topic_connection_info" {
  description = "SNS topic connection information"
  value = {
    arn    = aws_sns_topic.main.arn
    name   = aws_sns_topic.main.name
    region = data.aws_region.current.name
    url    = "https://sns.${data.aws_region.current.name}.amazonaws.com/${data.aws_caller_identity.current.account_id}:${aws_sns_topic.main.name}"
  }
}