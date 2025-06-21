# Table Outputs
output "table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.main.id
}

output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.arn
}

output "table_stream_arn" {
  description = "ARN of the DynamoDB table stream"
  value       = aws_dynamodb_table.main.stream_arn
}

output "table_stream_label" {
  description = "Timestamp of when DynamoDB Streams was enabled on the table"
  value       = aws_dynamodb_table.main.stream_label
}

# Capacity Information
output "table_billing_mode" {
  description = "Billing mode of the table"
  value       = aws_dynamodb_table.main.billing_mode
}

output "table_read_capacity" {
  description = "Read capacity of the table"
  value       = aws_dynamodb_table.main.billing_mode == "PROVISIONED" ? aws_dynamodb_table.main.read_capacity : null
}

output "table_write_capacity" {
  description = "Write capacity of the table"
  value       = aws_dynamodb_table.main.billing_mode == "PROVISIONED" ? aws_dynamodb_table.main.write_capacity : null
}

# Keys
output "table_hash_key" {
  description = "Hash key of the table"
  value       = aws_dynamodb_table.main.hash_key
}

output "table_range_key" {
  description = "Range key of the table"
  value       = aws_dynamodb_table.main.range_key
}

# Indexes
output "global_secondary_indexes" {
  description = "List of global secondary indexes"
  value       = var.global_secondary_indexes
}

output "local_secondary_indexes" {
  description = "List of local secondary indexes"
  value       = var.local_secondary_indexes
}

# Auto Scaling
output "read_autoscaling_target_arn" {
  description = "ARN of the read capacity auto scaling target"
  value       = var.autoscaling_enabled && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_target.read_target[0].arn : null
}

output "write_autoscaling_target_arn" {
  description = "ARN of the write capacity auto scaling target"
  value       = var.autoscaling_enabled && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_target.write_target[0].arn : null
}

output "read_autoscaling_policy_arn" {
  description = "ARN of the read capacity auto scaling policy"
  value       = var.autoscaling_enabled && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_policy.read_policy[0].arn : null
}

output "write_autoscaling_policy_arn" {
  description = "ARN of the write capacity auto scaling policy"
  value       = var.autoscaling_enabled && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_policy.write_policy[0].arn : null
}

# CloudWatch Alarms
output "read_throttled_events_alarm_arn" {
  description = "ARN of the read throttled events CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.read_throttled_events[0].arn : null
}

output "write_throttled_events_alarm_arn" {
  description = "ARN of the write throttled events CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.write_throttled_events[0].arn : null
}

# Additional Information
output "table_tags" {
  description = "Tags associated with the table"
  value       = aws_dynamodb_table.main.tags
}

output "table_point_in_time_recovery_enabled" {
  description = "Whether point-in-time recovery is enabled"
  value       = var.point_in_time_recovery_enabled
}

output "table_server_side_encryption_enabled" {
  description = "Whether server-side encryption is enabled"
  value       = var.server_side_encryption_enabled
}

# IAM Outputs
output "iam_policy_arn" {
  description = "ARN of the IAM policy for DynamoDB access"
  value       = var.create_iam_policy ? aws_iam_policy.dynamodb_access[0].arn : null
}

output "iam_policy_id" {
  description = "ID of the IAM policy for DynamoDB access"
  value       = var.create_iam_policy ? aws_iam_policy.dynamodb_access[0].id : null
}

# SNS Topic Outputs
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = var.enable_sns_topic ? aws_sns_topic.dynamodb_alarms[0].arn : null
}

# Additional Alarm Outputs
output "system_errors_alarm_arn" {
  description = "ARN of the system errors CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.system_errors[0].arn : null
}

output "consumed_read_capacity_alarm_arn" {
  description = "ARN of the consumed read capacity CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? aws_cloudwatch_metric_alarm.consumed_read_capacity[0].arn : null
}

output "consumed_write_capacity_alarm_arn" {
  description = "ARN of the consumed write capacity CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? aws_cloudwatch_metric_alarm.consumed_write_capacity[0].arn : null
}

# Backup Outputs
output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = var.enable_backup_plan ? aws_backup_plan.dynamodb[0].id : null
}

output "backup_plan_arn" {
  description = "ARN of the backup plan"
  value       = var.enable_backup_plan ? aws_backup_plan.dynamodb[0].arn : null
}

output "backup_vault_name" {
  description = "Name of the backup vault"
  value       = var.enable_backup_plan ? aws_backup_vault.dynamodb[0].name : null
}

output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = var.enable_backup_plan ? aws_backup_vault.dynamodb[0].arn : null
}

output "backup_selection_id" {
  description = "ID of the backup selection"
  value       = var.enable_backup_plan ? aws_backup_selection.dynamodb[0].id : null
}

output "backup_role_arn" {
  description = "ARN of the IAM role for AWS Backup"
  value       = var.enable_backup_plan ? aws_iam_role.backup[0].arn : null
}