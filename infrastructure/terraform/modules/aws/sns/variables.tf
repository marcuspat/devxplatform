# Topic Configuration
variable "topic_name" {
  description = "The name of the SNS topic"
  type        = string
}

variable "display_name" {
  description = "The display name for the topic"
  type        = string
  default     = null
}

variable "policy" {
  description = "The fully-formed AWS policy as JSON"
  type        = string
  default     = null
}

variable "delivery_policy" {
  description = "The SNS delivery policy"
  type        = string
  default     = null
}

variable "topic_policy" {
  description = "An externally created fully-formed AWS policy as JSON"
  type        = string
  default     = ""
}

# FIFO Configuration
variable "fifo_topic" {
  description = "Boolean indicating whether or not to create a FIFO (first-in-first-out) topic"
  type        = bool
  default     = false
}

variable "content_based_deduplication" {
  description = "Enables content-based deduplication for FIFO topics"
  type        = bool
  default     = false
}

# Encryption
variable "kms_master_key_id" {
  description = "The ID of an AWS-managed customer master key (CMK) for Amazon SNS or a custom CMK"
  type        = string
  default     = null
}

# Feedback Configuration
variable "application_success_feedback_role_arn" {
  description = "The IAM role permitted to receive success feedback for this topic"
  type        = string
  default     = null
}

variable "application_success_feedback_sample_rate" {
  description = "Percentage of success to sample"
  type        = number
  default     = null
}

variable "application_failure_feedback_role_arn" {
  description = "IAM role for failure feedback"
  type        = string
  default     = null
}

variable "http_success_feedback_role_arn" {
  description = "The IAM role permitted to receive success feedback for this topic"
  type        = string
  default     = null
}

variable "http_success_feedback_sample_rate" {
  description = "Percentage of success to sample"
  type        = number
  default     = null
}

variable "http_failure_feedback_role_arn" {
  description = "IAM role for failure feedback"
  type        = string
  default     = null
}

variable "lambda_success_feedback_role_arn" {
  description = "The IAM role permitted to receive success feedback for this topic"
  type        = string
  default     = null
}

variable "lambda_success_feedback_sample_rate" {
  description = "Percentage of success to sample"
  type        = number
  default     = null
}

variable "lambda_failure_feedback_role_arn" {
  description = "IAM role for failure feedback"
  type        = string
  default     = null
}

variable "sqs_success_feedback_role_arn" {
  description = "The IAM role permitted to receive success feedback for this topic"
  type        = string
  default     = null
}

variable "sqs_success_feedback_sample_rate" {
  description = "Percentage of success to sample"
  type        = number
  default     = null
}

variable "sqs_failure_feedback_role_arn" {
  description = "IAM role for failure feedback"
  type        = string
  default     = null
}

variable "firehose_success_feedback_role_arn" {
  description = "The IAM role permitted to receive success feedback for this topic"
  type        = string
  default     = null
}

variable "firehose_success_feedback_sample_rate" {
  description = "Percentage of success to sample"
  type        = number
  default     = null
}

variable "firehose_failure_feedback_role_arn" {
  description = "IAM role for failure feedback"
  type        = string
  default     = null
}

# Message Configuration
variable "signature_version" {
  description = "If SignatureVersion should be 1 (SHA1) or 2 (SHA256)"
  type        = number
  default     = null
}

variable "tracing_config" {
  description = "Tracing mode of an Amazon SNS topic"
  type        = string
  default     = null
}

# Subscriptions
variable "subscriptions" {
  description = "A list of subscription configurations for the SNS topic"
  type = list(object({
    protocol                        = string
    endpoint                        = string
    endpoint_auto_confirms          = optional(bool)
    confirmation_timeout_in_minutes = optional(number)
    raw_message_delivery           = optional(bool)
    filter_policy                  = optional(string)
    filter_policy_scope            = optional(string)
    delivery_policy                = optional(string)
    redrive_policy                 = optional(string)
    subscription_role_arn          = optional(string)
    replay_policy                  = optional(string)
  }))
  default = []
}

# Cross-region subscriptions
variable "cross_region_subscriptions" {
  description = "Map of cross-region subscription configurations"
  type = map(object({
    topic_arn = string
    protocol  = string
  }))
  default = {}
}

# IAM Policy
variable "create_iam_policy" {
  description = "Whether to create an IAM policy for SNS access"
  type        = bool
  default     = false
}

# Dead Letter Queue
variable "create_dlq" {
  description = "Whether to create a dead letter queue for failed deliveries"
  type        = bool
  default     = false
}

variable "dlq_message_retention_seconds" {
  description = "The number of seconds Amazon SQS retains a message in the DLQ"
  type        = number
  default     = 1209600
}

variable "dlq_visibility_timeout_seconds" {
  description = "The visibility timeout for the DLQ"
  type        = number
  default     = 30
}

variable "dlq_sqs_managed_sse_enabled" {
  description = "Boolean to enable SSE for DLQ"
  type        = bool
  default     = true
}

variable "dlq_kms_master_key_id" {
  description = "The KMS key ID for DLQ encryption"
  type        = string
  default     = null
}

# CloudWatch Alarms
variable "create_cloudwatch_alarms" {
  description = "Whether to create CloudWatch alarms"
  type        = bool
  default     = false
}

variable "alarm_actions" {
  description = "The list of actions to execute when this alarm transitions to the ALARM state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "The list of actions to execute when this alarm transitions to the OK state"
  type        = list(string)
  default     = []
}

variable "messages_published_threshold" {
  description = "The threshold for the messages published alarm"
  type        = number
  default     = 1000
}

variable "notifications_delivered_threshold" {
  description = "The threshold for the notifications delivered alarm"
  type        = number
  default     = 100
}

variable "notifications_failed_threshold" {
  description = "The threshold for the notifications failed alarm"
  type        = number
  default     = 10
}

variable "alarm_evaluation_periods" {
  description = "The number of periods over which data is compared to the specified threshold"
  type        = number
  default     = 2
}

variable "alarm_period" {
  description = "The period in seconds over which the specified statistic is applied"
  type        = number
  default     = 300
}

# Auto Scaling
variable "enable_auto_scaling" {
  description = "Whether to enable auto scaling for the SNS topic"
  type        = bool
  default     = false
}

variable "auto_scaling_min_capacity" {
  description = "The minimum capacity for auto scaling"
  type        = number
  default     = 1
}

variable "auto_scaling_max_capacity" {
  description = "The maximum capacity for auto scaling"
  type        = number
  default     = 10
}

variable "auto_scaling_target_value" {
  description = "The target value for the auto scaling metric"
  type        = number
  default     = 70.0
}

# EventBridge Configuration
variable "create_eventbridge_rule" {
  description = "Whether to create an EventBridge rule for SNS events"
  type        = bool
  default     = false
}

variable "eventbridge_target_arn" {
  description = "The ARN of the target for the EventBridge rule"
  type        = string
  default     = ""
}

variable "eventbridge_input_transformer" {
  description = "Input transformer for EventBridge target"
  type = object({
    input_paths    = map(string)
    input_template = string
  })
  default = null
}

# CloudTrail Configuration
variable "enable_cloudtrail_logging" {
  description = "Whether to enable CloudTrail logging for SNS data events"
  type        = bool
  default     = false
}

variable "cloudtrail_multi_region_enabled" {
  description = "Whether the CloudTrail data store should be multi-region"
  type        = bool
  default     = true
}

variable "cloudtrail_organization_enabled" {
  description = "Whether the CloudTrail data store should be organization-enabled"
  type        = bool
  default     = false
}

variable "cloudtrail_termination_protection_enabled" {
  description = "Whether termination protection is enabled for the CloudTrail data store"
  type        = bool
  default     = false
}

# Lambda Permissions
variable "lambda_function_permissions" {
  description = "Map of Lambda function permissions for SNS invocation"
  type = map(object({
    function_name = string
  }))
  default = {}
}

# Tags
variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}