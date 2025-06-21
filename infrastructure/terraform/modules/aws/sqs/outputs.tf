# Main Queue Outputs
output "queue_id" {
  description = "The URL for the created Amazon SQS queue"
  value       = aws_sqs_queue.main.id
}

output "queue_arn" {
  description = "The ARN of the SQS queue"
  value       = aws_sqs_queue.main.arn
}

output "queue_name" {
  description = "The name of the SQS queue"
  value       = aws_sqs_queue.main.name
}

output "queue_url" {
  description = "Same as queue_id: The URL for the created Amazon SQS queue"
  value       = aws_sqs_queue.main.url
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

# Queue Attributes
output "queue_visibility_timeout_seconds" {
  description = "The visibility timeout for the queue"
  value       = aws_sqs_queue.main.visibility_timeout_seconds
}

output "queue_message_retention_seconds" {
  description = "The number of seconds Amazon SQS retains a message"
  value       = aws_sqs_queue.main.message_retention_seconds
}

output "queue_max_message_size" {
  description = "The limit of how many bytes a message can contain before Amazon SQS rejects it"
  value       = aws_sqs_queue.main.max_message_size
}

output "queue_delay_seconds" {
  description = "The time in seconds that the delivery of all messages in the queue will be delayed"
  value       = aws_sqs_queue.main.delay_seconds
}

output "queue_receive_wait_time_seconds" {
  description = "The time for which a ReceiveMessage call will wait for a message to arrive"
  value       = aws_sqs_queue.main.receive_wait_time_seconds
}

output "queue_fifo_queue" {
  description = "Boolean designating a FIFO queue"
  value       = aws_sqs_queue.main.fifo_queue
}

output "queue_content_based_deduplication" {
  description = "Enables content-based deduplication for FIFO queues"
  value       = aws_sqs_queue.main.content_based_deduplication
}

output "queue_kms_master_key_id" {
  description = "The ID of an AWS-managed customer master key (CMK) for Amazon SQS"
  value       = aws_sqs_queue.main.kms_master_key_id
}

output "queue_kms_data_key_reuse_period_seconds" {
  description = "The length of time, in seconds, for which Amazon SQS can reuse a data key"
  value       = aws_sqs_queue.main.kms_data_key_reuse_period_seconds
}

output "queue_sqs_managed_sse_enabled" {
  description = "Boolean to enable server-side encryption (SSE) of message content with SQS-owned encryption keys"
  value       = aws_sqs_queue.main.sqs_managed_sse_enabled
}

# Policy Outputs
output "queue_policy" {
  description = "The JSON policy for the SQS queue"
  value       = try(aws_sqs_queue_policy.main[0].policy, "")
}

output "dlq_policy" {
  description = "The JSON policy for the dead letter queue"
  value       = try(aws_sqs_queue_policy.dlq[0].policy, "")
}

# IAM Policy Output
output "iam_policy_arn" {
  description = "The ARN of the IAM policy for SQS access"
  value       = try(aws_iam_policy.sqs_access[0].arn, "")
}

output "iam_policy_name" {
  description = "The name of the IAM policy for SQS access"
  value       = try(aws_iam_policy.sqs_access[0].name, "")
}

output "iam_policy_id" {
  description = "The ID of the IAM policy for SQS access"
  value       = try(aws_iam_policy.sqs_access[0].id, "")
}

# CloudWatch Alarms
output "cloudwatch_alarm_queue_depth_id" {
  description = "The ID of the CloudWatch alarm for queue depth"
  value       = try(aws_cloudwatch_metric_alarm.queue_depth[0].id, "")
}

output "cloudwatch_alarm_queue_depth_arn" {
  description = "The ARN of the CloudWatch alarm for queue depth"
  value       = try(aws_cloudwatch_metric_alarm.queue_depth[0].arn, "")
}

output "cloudwatch_alarm_message_age_id" {
  description = "The ID of the CloudWatch alarm for message age"
  value       = try(aws_cloudwatch_metric_alarm.queue_age[0].id, "")
}

output "cloudwatch_alarm_message_age_arn" {
  description = "The ARN of the CloudWatch alarm for message age"
  value       = try(aws_cloudwatch_metric_alarm.queue_age[0].arn, "")
}

output "cloudwatch_alarm_dlq_depth_id" {
  description = "The ID of the CloudWatch alarm for DLQ depth"
  value       = try(aws_cloudwatch_metric_alarm.dlq_depth[0].id, "")
}

output "cloudwatch_alarm_dlq_depth_arn" {
  description = "The ARN of the CloudWatch alarm for DLQ depth"
  value       = try(aws_cloudwatch_metric_alarm.dlq_depth[0].arn, "")
}

# EventBridge Rule
output "eventbridge_rule_id" {
  description = "The ID of the EventBridge rule"
  value       = try(aws_cloudwatch_event_rule.sqs_events[0].id, "")
}

output "eventbridge_rule_arn" {
  description = "The ARN of the EventBridge rule"
  value       = try(aws_cloudwatch_event_rule.sqs_events[0].arn, "")
}

# Lambda Event Source Mapping
output "lambda_event_source_mapping_uuid" {
  description = "The UUID of the Lambda event source mapping"
  value       = try(aws_lambda_event_source_mapping.sqs_lambda[0].uuid, "")
}

output "lambda_event_source_mapping_function_arn" {
  description = "The ARN of the Lambda function for the event source mapping"
  value       = try(aws_lambda_event_source_mapping.sqs_lambda[0].function_arn, "")
}

output "lambda_event_source_mapping_last_modified" {
  description = "The date the Lambda event source mapping was last modified"
  value       = try(aws_lambda_event_source_mapping.sqs_lambda[0].last_modified, "")
}

output "lambda_event_source_mapping_last_processing_result" {
  description = "The result of the last AWS Lambda invocation of your Lambda function"
  value       = try(aws_lambda_event_source_mapping.sqs_lambda[0].last_processing_result, "")
}

output "lambda_event_source_mapping_state" {
  description = "The state of the event source mapping"
  value       = try(aws_lambda_event_source_mapping.sqs_lambda[0].state, "")
}

output "lambda_event_source_mapping_state_transition_reason" {
  description = "The cause of the last state change"
  value       = try(aws_lambda_event_source_mapping.sqs_lambda[0].state_transition_reason, "")
}

# SNS Topic for Alarms
output "sns_topic_arn" {
  description = "The ARN of the SNS topic for alarms"
  value       = try(aws_sns_topic.sqs_alarms[0].arn, "")
}

output "sns_topic_name" {
  description = "The name of the SNS topic for alarms"
  value       = try(aws_sns_topic.sqs_alarms[0].name, "")
}

output "sns_topic_id" {
  description = "The ID of the SNS topic for alarms"
  value       = try(aws_sns_topic.sqs_alarms[0].id, "")
}

# Redrive Configuration
output "queue_redrive_policy" {
  description = "The JSON redrive policy for the queue"
  value       = aws_sqs_queue.main.redrive_policy
}

output "queue_redrive_allow_policy" {
  description = "The JSON redrive allow policy for the queue"
  value       = aws_sqs_queue.main.redrive_allow_policy
}