# Dashboard Configuration
variable "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  type        = string
}

# Widget Configuration
variable "enable_ecs_widgets" {
  description = "Enable ECS monitoring widgets"
  type        = bool
  default     = false
}

variable "enable_alb_widgets" {
  description = "Enable ALB monitoring widgets"
  type        = bool
  default     = false
}

variable "enable_rds_widgets" {
  description = "Enable RDS monitoring widgets"
  type        = bool
  default     = false
}

variable "enable_lambda_widgets" {
  description = "Enable Lambda monitoring widgets"
  type        = bool
  default     = false
}

variable "enable_dynamodb_widgets" {
  description = "Enable DynamoDB monitoring widgets"
  type        = bool
  default     = false
}

# Service Names for Widgets
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster for monitoring"
  type        = string
  default     = ""
}

variable "ecs_service_name" {
  description = "Name of the ECS service for monitoring"
  type        = string
  default     = ""
}

variable "alb_name" {
  description = "Name of the ALB for monitoring"
  type        = string
  default     = ""
}

variable "rds_instance_id" {
  description = "RDS instance identifier for monitoring"
  type        = string
  default     = ""
}

variable "lambda_function_name" {
  description = "Lambda function name for monitoring"
  type        = string
  default     = ""
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for monitoring"
  type        = string
  default     = ""
}

# Custom Widgets
variable "custom_widgets" {
  description = "List of custom widgets to add to the dashboard"
  type        = list(any)
  default     = []
}

# Log Groups Configuration
variable "log_groups" {
  description = "Map of log groups to create"
  type = map(object({
    name           = string
    retention_days = number
  }))
  default = {}
}

variable "enable_log_encryption" {
  description = "Enable encryption for CloudWatch logs"
  type        = bool
  default     = true
}

# Metrics and Alerting
variable "metrics_namespace" {
  description = "Namespace for custom metrics"
  type        = string
  default     = "Custom/Application"
}

variable "enable_error_tracking" {
  description = "Enable error tracking from log groups"
  type        = bool
  default     = true
}

variable "error_threshold" {
  description = "Threshold for error count alarms"
  type        = number
  default     = 10
}

# SNS Configuration
variable "create_sns_topic" {
  description = "Create SNS topic for alerts"
  type        = bool
  default     = false
}

variable "sns_topic_name" {
  description = "Name of the SNS topic for alerts"
  type        = string
  default     = "monitoring-alerts"
}

variable "alert_email_addresses" {
  description = "List of email addresses for alert notifications"
  type        = list(string)
  default     = []
}

variable "alarm_actions" {
  description = "List of ARNs for alarm actions"
  type        = list(string)
  default     = []
}

# Composite Alarms
variable "enable_composite_alarms" {
  description = "Enable composite alarms for application health"
  type        = bool
  default     = false
}

variable "composite_alarm_rule" {
  description = "Rule for composite alarm (e.g., 'ALARM(alarm1) OR ALARM(alarm2)')"
  type        = string
  default     = ""
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# CloudWatch Synthetics
variable "enable_synthetics" {
  description = "Enable CloudWatch Synthetics for endpoint monitoring"
  type        = bool
  default     = false
}

variable "synthetics_s3_bucket" {
  description = "S3 bucket for Synthetics artifacts"
  type        = string
  default     = ""
}

variable "synthetics_zip_file" {
  description = "Path to the Synthetics canary zip file"
  type        = string
  default     = ""
}

variable "synthetics_runtime_version" {
  description = "Runtime version for Synthetics canary"
  type        = string
  default     = "syn-nodejs-puppeteer-3.9"
}

variable "synthetics_schedule" {
  description = "Schedule expression for Synthetics canary"
  type        = string
  default     = "rate(5 minutes)"
}

variable "synthetics_timeout" {
  description = "Timeout in seconds for Synthetics canary"
  type        = number
  default     = 60
}

variable "synthetics_success_retention" {
  description = "Days to retain successful Synthetics run data"
  type        = number
  default     = 7
}

variable "synthetics_failure_retention" {
  description = "Days to retain failed Synthetics run data"
  type        = number
  default     = 31
}

# CloudWatch Insights
variable "enable_insights_queries" {
  description = "Enable CloudWatch Insights query definitions"
  type        = bool
  default     = false
}

# ALB Alarms
variable "enable_alb_alarms" {
  description = "Enable ALB-specific alarms"
  type        = bool
  default     = false
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the ALB (from ALB ARN)"
  type        = string
  default     = ""
}

variable "alb_target_group_arn_suffix" {
  description = "ARN suffix of the ALB target group"
  type        = string
  default     = ""
}

variable "alb_response_time_threshold" {
  description = "Threshold for ALB response time alarm (seconds)"
  type        = number
  default     = 1
}

variable "alb_unhealthy_host_threshold" {
  description = "Threshold for ALB unhealthy host count"
  type        = number
  default     = 1
}

# RDS Alarms
variable "enable_rds_alarms" {
  description = "Enable RDS-specific alarms"
  type        = bool
  default     = false
}

variable "rds_cpu_threshold" {
  description = "CPU utilization threshold for RDS alarm (%)"
  type        = number
  default     = 80
}

variable "rds_connection_threshold" {
  description = "Database connection count threshold"
  type        = number
  default     = 80
}

variable "rds_storage_threshold_bytes" {
  description = "Free storage space threshold in bytes"
  type        = number
  default     = 10737418240 # 10 GB
}

# ECS Alarms
variable "enable_ecs_alarms" {
  description = "Enable ECS-specific alarms"
  type        = bool
  default     = false
}

variable "ecs_cpu_threshold" {
  description = "CPU utilization threshold for ECS alarm (%)"
  type        = number
  default     = 80
}

variable "ecs_memory_threshold" {
  description = "Memory utilization threshold for ECS alarm (%)"
  type        = number
  default     = 80
}

# Anomaly Detection
variable "enable_anomaly_detection" {
  description = "Enable CloudWatch anomaly detection"
  type        = bool
  default     = false
}

# X-Ray
variable "enable_xray" {
  description = "Enable AWS X-Ray tracing"
  type        = bool
  default     = false
}

variable "xray_filter_expression" {
  description = "Filter expression for X-Ray group"
  type        = string
  default     = ""
}

variable "xray_sampling_rate" {
  description = "Sampling rate for X-Ray (0.0 to 1.0)"
  type        = number
  default     = 0.1
}