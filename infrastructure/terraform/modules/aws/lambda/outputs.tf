output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "function_qualified_arn" {
  description = "Qualified ARN of the Lambda function"
  value       = aws_lambda_function.this.qualified_arn
}

output "function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.this.version
}

output "function_last_modified" {
  description = "Date function was last modified"
  value       = aws_lambda_function.this.last_modified
}

output "function_source_code_size" {
  description = "Size in bytes of the function deployment package"
  value       = aws_lambda_function.this.source_code_size
}

output "function_invoke_arn" {
  description = "ARN to be used for invoking Lambda function from API Gateway"
  value       = aws_lambda_function.this.invoke_arn
}

output "role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda.name
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.arn
}

output "alias_arn" {
  description = "ARN of the Lambda alias"
  value       = var.create_alias ? aws_lambda_alias.this[0].arn : null
}

output "alias_name" {
  description = "Name of the Lambda alias"
  value       = var.create_alias ? aws_lambda_alias.this[0].name : null
}

output "alias_invoke_arn" {
  description = "ARN to be used for invoking Lambda alias from API Gateway"
  value       = var.create_alias ? aws_lambda_alias.this[0].invoke_arn : null
}

output "function_url" {
  description = "Function URL for Lambda function"
  value       = var.create_function_url ? aws_lambda_function_url.this[0].function_url : null
}

output "function_url_id" {
  description = "Unique identifier for the function URL"
  value       = var.create_function_url ? aws_lambda_function_url.this[0].url_id : null
}

output "event_source_mapping_ids" {
  description = "Map of event source mapping IDs"
  value       = { for k, v in aws_lambda_event_source_mapping.this : k => v.id }
}

output "event_source_mapping_arns" {
  description = "Map of event source mapping ARNs"
  value       = { for k, v in aws_lambda_event_source_mapping.this : k => v.arn }
}

output "event_source_mapping_states" {
  description = "Map of event source mapping states"
  value       = { for k, v in aws_lambda_event_source_mapping.this : k => v.state }
}

# Security Group Outputs
output "security_group_id" {
  description = "ID of the Lambda security group"
  value       = var.vpc_subnet_ids != null && var.create_security_group ? aws_security_group.lambda[0].id : null
}

output "security_group_arn" {
  description = "ARN of the Lambda security group"
  value       = var.vpc_subnet_ids != null && var.create_security_group ? aws_security_group.lambda[0].arn : null
}

# CloudWatch Alarm Outputs
output "error_alarm_arn" {
  description = "ARN of the error CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.lambda_errors[0].arn : null
}

output "throttle_alarm_arn" {
  description = "ARN of the throttle CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.lambda_throttles[0].arn : null
}

output "duration_alarm_arn" {
  description = "ARN of the duration CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.lambda_duration[0].arn : null
}

output "concurrent_executions_alarm_arn" {
  description = "ARN of the concurrent executions CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms && var.reserved_concurrent_executions != null ? aws_cloudwatch_metric_alarm.lambda_concurrent_executions[0].arn : null
}

output "dead_letter_errors_alarm_arn" {
  description = "ARN of the dead letter errors CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms && var.dead_letter_target_arn != null ? aws_cloudwatch_metric_alarm.lambda_dead_letter_errors[0].arn : null
}

# CloudWatch Dashboard Output
output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = var.create_cloudwatch_dashboard ? aws_cloudwatch_dashboard.lambda[0].dashboard_arn : null
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = var.create_cloudwatch_dashboard ? aws_cloudwatch_dashboard.lambda[0].dashboard_name : null
}