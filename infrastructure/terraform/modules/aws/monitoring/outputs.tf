# Dashboard Outputs
output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

# Log Groups Outputs
output "log_group_names" {
  description = "Names of the created log groups"
  value       = [for lg in aws_cloudwatch_log_group.application_logs : lg.name]
}

output "log_group_arns" {
  description = "ARNs of the created log groups"
  value       = [for lg in aws_cloudwatch_log_group.application_logs : lg.arn]
}

# KMS Key Outputs
output "logs_kms_key_id" {
  description = "ID of the KMS key used for log encryption"
  value       = var.enable_log_encryption ? aws_kms_key.logs[0].key_id : null
}

output "logs_kms_key_arn" {
  description = "ARN of the KMS key used for log encryption"
  value       = var.enable_log_encryption ? aws_kms_key.logs[0].arn : null
}

output "logs_kms_alias_name" {
  description = "Alias name of the KMS key used for log encryption"
  value       = var.enable_log_encryption ? aws_kms_alias.logs[0].name : null
}

# Metric Filters Outputs
output "metric_filter_names" {
  description = "Names of the created metric filters"
  value       = [for mf in aws_cloudwatch_log_metric_filter.error_filter : mf.name]
}

# Alarms Outputs
output "error_alarm_names" {
  description = "Names of the error rate alarms"
  value       = [for alarm in aws_cloudwatch_metric_alarm.error_rate_alarm : alarm.alarm_name]
}

output "error_alarm_arns" {
  description = "ARNs of the error rate alarms"
  value       = [for alarm in aws_cloudwatch_metric_alarm.error_rate_alarm : alarm.arn]
}

output "composite_alarm_arn" {
  description = "ARN of the composite alarm"
  value       = var.enable_composite_alarms ? aws_cloudwatch_composite_alarm.application_health[0].arn : null
}

output "composite_alarm_name" {
  description = "Name of the composite alarm"
  value       = var.enable_composite_alarms ? aws_cloudwatch_composite_alarm.application_health[0].alarm_name : null
}

# SNS Outputs
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = var.create_sns_topic ? aws_sns_topic.alerts[0].arn : null
}

output "sns_topic_name" {
  description = "Name of the SNS topic for alerts"
  value       = var.create_sns_topic ? aws_sns_topic.alerts[0].name : null
}

output "sns_subscription_arns" {
  description = "ARNs of the SNS topic subscriptions"
  value       = [for sub in aws_sns_topic_subscription.email_alerts : sub.arn]
}

# Configuration Summary
output "monitoring_summary" {
  description = "Summary of monitoring configuration"
  value = {
    dashboard_enabled     = true
    log_groups_count     = length(var.log_groups)
    error_tracking       = var.enable_error_tracking
    sns_alerts          = var.create_sns_topic
    composite_alarms    = var.enable_composite_alarms
    encryption_enabled  = var.enable_log_encryption
    widgets_enabled = {
      ecs      = var.enable_ecs_widgets
      alb      = var.enable_alb_widgets
      rds      = var.enable_rds_widgets
      lambda   = var.enable_lambda_widgets
      dynamodb = var.enable_dynamodb_widgets
    }
  }
}

# Synthetics Outputs
output "synthetics_canary_name" {
  description = "Name of the Synthetics canary"
  value       = var.enable_synthetics ? aws_synthetics_canary.endpoint_monitoring[0].name : null
}

output "synthetics_canary_arn" {
  description = "ARN of the Synthetics canary"
  value       = var.enable_synthetics ? aws_synthetics_canary.endpoint_monitoring[0].arn : null
}

output "synthetics_canary_status" {
  description = "Status of the Synthetics canary"
  value       = var.enable_synthetics ? aws_synthetics_canary.endpoint_monitoring[0].status : null
}

# Insights Query Outputs
output "insights_error_query_id" {
  description = "ID of the error analysis Insights query"
  value       = var.enable_insights_queries ? aws_cloudwatch_query_definition.error_analysis[0].query_definition_id : null
}

output "insights_performance_query_id" {
  description = "ID of the performance analysis Insights query"
  value       = var.enable_insights_queries ? aws_cloudwatch_query_definition.performance_analysis[0].query_definition_id : null
}

# ALB Alarm Outputs
output "alb_response_time_alarm_arn" {
  description = "ARN of the ALB response time alarm"
  value       = var.enable_alb_alarms && var.alb_name != "" ? aws_cloudwatch_metric_alarm.alb_target_response_time[0].arn : null
}

output "alb_unhealthy_hosts_alarm_arn" {
  description = "ARN of the ALB unhealthy hosts alarm"
  value       = var.enable_alb_alarms && var.alb_name != "" ? aws_cloudwatch_metric_alarm.alb_unhealthy_hosts[0].arn : null
}

# RDS Alarm Outputs
output "rds_cpu_alarm_arn" {
  description = "ARN of the RDS CPU alarm"
  value       = var.enable_rds_alarms && var.rds_instance_id != "" ? aws_cloudwatch_metric_alarm.rds_cpu[0].arn : null
}

output "rds_connections_alarm_arn" {
  description = "ARN of the RDS connections alarm"
  value       = var.enable_rds_alarms && var.rds_instance_id != "" ? aws_cloudwatch_metric_alarm.rds_connections[0].arn : null
}

output "rds_storage_alarm_arn" {
  description = "ARN of the RDS storage alarm"
  value       = var.enable_rds_alarms && var.rds_instance_id != "" ? aws_cloudwatch_metric_alarm.rds_storage[0].arn : null
}

# ECS Alarm Outputs
output "ecs_cpu_alarm_arn" {
  description = "ARN of the ECS CPU alarm"
  value       = var.enable_ecs_alarms && var.ecs_service_name != "" ? aws_cloudwatch_metric_alarm.ecs_cpu[0].arn : null
}

output "ecs_memory_alarm_arn" {
  description = "ARN of the ECS memory alarm"
  value       = var.enable_ecs_alarms && var.ecs_service_name != "" ? aws_cloudwatch_metric_alarm.ecs_memory[0].arn : null
}

# Anomaly Detection Outputs
output "anomaly_alarm_arn" {
  description = "ARN of the anomaly detection alarm"
  value       = var.enable_anomaly_detection ? aws_cloudwatch_metric_alarm.request_anomaly[0].arn : null
}

# X-Ray Outputs
output "xray_group_arn" {
  description = "ARN of the X-Ray group"
  value       = var.enable_xray ? aws_xray_group.main[0].arn : null
}

output "xray_sampling_rule_arn" {
  description = "ARN of the X-Ray sampling rule"
  value       = var.enable_xray ? aws_xray_sampling_rule.main[0].arn : null
}

# All Alarm ARNs
output "all_alarm_arns" {
  description = "List of all alarm ARNs created by this module"
  value = compact(concat(
    [for alarm in aws_cloudwatch_metric_alarm.error_rate_alarm : alarm.arn],
    var.enable_alb_alarms && var.alb_name != "" ? [aws_cloudwatch_metric_alarm.alb_target_response_time[0].arn] : [],
    var.enable_alb_alarms && var.alb_name != "" ? [aws_cloudwatch_metric_alarm.alb_unhealthy_hosts[0].arn] : [],
    var.enable_rds_alarms && var.rds_instance_id != "" ? [aws_cloudwatch_metric_alarm.rds_cpu[0].arn] : [],
    var.enable_rds_alarms && var.rds_instance_id != "" ? [aws_cloudwatch_metric_alarm.rds_connections[0].arn] : [],
    var.enable_rds_alarms && var.rds_instance_id != "" ? [aws_cloudwatch_metric_alarm.rds_storage[0].arn] : [],
    var.enable_ecs_alarms && var.ecs_service_name != "" ? [aws_cloudwatch_metric_alarm.ecs_cpu[0].arn] : [],
    var.enable_ecs_alarms && var.ecs_service_name != "" ? [aws_cloudwatch_metric_alarm.ecs_memory[0].arn] : [],
    var.enable_anomaly_detection ? [aws_cloudwatch_metric_alarm.request_anomaly[0].arn] : [],
    var.enable_composite_alarms ? [aws_cloudwatch_composite_alarm.application_health[0].arn] : []
  ))
}