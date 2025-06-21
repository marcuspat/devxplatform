# Table Configuration
variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "billing_mode" {
  description = "Billing mode for the table (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.billing_mode)
    error_message = "Billing mode must be either PROVISIONED or PAY_PER_REQUEST."
  }
}

variable "hash_key" {
  description = "Hash key (partition key) for the table"
  type        = string
}

variable "range_key" {
  description = "Range key (sort key) for the table"
  type        = string
  default     = null
}

variable "read_capacity" {
  description = "Read capacity units for the table (only used with PROVISIONED billing)"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "Write capacity units for the table (only used with PROVISIONED billing)"
  type        = number
  default     = 5
}

# Attributes
variable "attributes" {
  description = "List of nested attribute definitions"
  type = list(object({
    name = string
    type = string
  }))
}

# Global Secondary Indexes
variable "global_secondary_indexes" {
  description = "List of global secondary indexes"
  type = list(object({
    name               = string
    hash_key           = string
    range_key          = string
    projection_type    = string
    non_key_attributes = list(string)
    read_capacity      = number
    write_capacity     = number
  }))
  default = []
}

# Local Secondary Indexes
variable "local_secondary_indexes" {
  description = "List of local secondary indexes"
  type = list(object({
    name               = string
    range_key          = string
    projection_type    = string
    non_key_attributes = list(string)
  }))
  default = []
}

# Streams
variable "stream_enabled" {
  description = "Enable DynamoDB Streams"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "Stream view type (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES)"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
  validation {
    condition     = contains(["KEYS_ONLY", "NEW_IMAGE", "OLD_IMAGE", "NEW_AND_OLD_IMAGES"], var.stream_view_type)
    error_message = "Stream view type must be one of: KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES."
  }
}

# TTL
variable "ttl_enabled" {
  description = "Enable Time to Live (TTL)"
  type        = bool
  default     = false
}

variable "ttl_attribute_name" {
  description = "Name of the TTL attribute"
  type        = string
  default     = "ttl"
}

# Encryption
variable "server_side_encryption_enabled" {
  description = "Enable server-side encryption"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for server-side encryption"
  type        = string
  default     = null
}

# Backup
variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

# Global Tables (Replicas)
variable "replica_regions" {
  description = "List of replica regions for global tables"
  type = list(object({
    region_name            = string
    kms_key_arn           = string
    point_in_time_recovery = bool
    propagate_tags        = bool
  }))
  default = []
}

# Auto Scaling
variable "autoscaling_enabled" {
  description = "Enable auto scaling for the table"
  type        = bool
  default     = false
}

variable "autoscaling_read_min_capacity" {
  description = "Minimum read capacity for auto scaling"
  type        = number
  default     = 5
}

variable "autoscaling_read_max_capacity" {
  description = "Maximum read capacity for auto scaling"
  type        = number
  default     = 100
}

variable "autoscaling_read_target_value" {
  description = "Target value for read capacity auto scaling"
  type        = number
  default     = 70.0
}

variable "autoscaling_write_min_capacity" {
  description = "Minimum write capacity for auto scaling"
  type        = number
  default     = 5
}

variable "autoscaling_write_max_capacity" {
  description = "Maximum write capacity for auto scaling"
  type        = number
  default     = 100
}

variable "autoscaling_write_target_value" {
  description = "Target value for write capacity auto scaling"
  type        = number
  default     = 70.0
}

# CloudWatch Alarms
variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms for the table"
  type        = bool
  default     = false
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# IAM Policy
variable "create_iam_policy" {
  description = "Whether to create IAM policy for DynamoDB access"
  type        = bool
  default     = true
}

# SNS Topic
variable "enable_sns_topic" {
  description = "Enable SNS topic for CloudWatch alarms"
  type        = bool
  default     = false
}

variable "sns_kms_key_id" {
  description = "KMS key ID for SNS topic encryption"
  type        = string
  default     = null
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = null
}

# Additional CloudWatch Alarm Thresholds
variable "system_errors_threshold" {
  description = "Threshold for system errors alarm"
  type        = number
  default     = 5
}

variable "consumed_read_threshold_percentage" {
  description = "Percentage threshold for consumed read capacity"
  type        = number
  default     = 0.8
}

variable "consumed_write_threshold_percentage" {
  description = "Percentage threshold for consumed write capacity"
  type        = number
  default     = 0.8
}

# Backup Configuration
variable "enable_backup_plan" {
  description = "Enable AWS Backup plan for the DynamoDB table"
  type        = bool
  default     = false
}

variable "backup_schedule" {
  description = "Backup schedule in cron expression format"
  type        = string
  default     = "cron(0 2 * * ? *)" # Daily at 2 AM
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_vault_kms_key_arn" {
  description = "KMS key ARN for backup vault encryption"
  type        = string
  default     = null
}