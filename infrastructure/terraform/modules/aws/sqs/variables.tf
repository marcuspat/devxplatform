# Queue Configuration
variable "queue_name" {
  description = "The name of the SQS queue"
  type        = string
}

variable "delay_seconds" {
  description = "The time in seconds that the delivery of all messages in the queue will be delayed"
  type        = number
  default     = 0
}

variable "max_message_size" {
  description = "The limit of how many bytes a message can contain before Amazon SQS rejects it"
  type        = number
  default     = 262144
}

variable "message_retention_seconds" {
  description = "The number of seconds Amazon SQS retains a message"
  type        = number
  default     = 345600
}

variable "receive_wait_time_seconds" {
  description = "The time for which a ReceiveMessage call will wait for a message to arrive"
  type        = number
  default     = 0
}

variable "visibility_timeout_seconds" {
  description = "The visibility timeout for the queue"
  type        = number
  default     = 30
}

# Encryption Configuration
variable "sqs_managed_sse_enabled" {
  description = "Boolean to enable server-side encryption (SSE) of message content with SQS-owned encryption keys"
  type        = bool
  default     = true
}

variable "kms_master_key_id" {
  description = "The ID of an AWS-managed customer master key (CMK) for Amazon SQS or a custom CMK"
  type        = string
  default     = null
}

variable "kms_data_key_reuse_period_seconds" {
  description = "The length of time, in seconds, for which Amazon SQS can reuse a data key to encrypt or decrypt messages"
  type        = number
  default     = 300
}

# FIFO Configuration
variable "fifo_queue" {
  description = "Boolean designating a FIFO queue"
  type        = bool
  default     = false
}

variable "content_based_deduplication" {
  description = "Enables content-based deduplication for FIFO queues"
  type        = bool
  default     = false
}

variable "deduplication_scope" {
  description = "Specifies whether message deduplication occurs at the message group or queue level"
  type        = string
  default     = null
}

variable "fifo_throughput_limit" {
  description = "Specifies whether the FIFO queue throughput quota applies to the entire queue or per message group"
  type        = string
  default     = null
}

# Dead Letter Queue Configuration
variable "create_dlq" {
  description = "Whether to create a dead letter queue"
  type        = bool
  default     = false
}

variable "dlq_name" {
  description = "The name of the dead letter queue (defaults to {queue_name}-dlq)"
  type        = string
  default     = ""
}

variable "max_receive_count" {
  description = "The number of times a message is delivered to the source queue before being moved to the dead-letter queue"
  type        = number
  default     = 3
}

variable "redrive_policy" {
  description = "The JSON policy to set up the Dead Letter Queue redrive policy"
  type        = string
  default     = null
}

variable "redrive_allow_policy" {
  description = "The JSON policy to set up the Dead Letter Queue redrive allow policy"
  type        = string
  default     = null
}

variable "redrive_allow_policy_permission" {
  description = "Permission for the redrive allow policy"
  type        = string
  default     = "allowAll"
}

# Dead Letter Queue specific settings
variable "dlq_delay_seconds" {
  description = "The time in seconds that the delivery of all messages in the DLQ will be delayed"
  type        = number
  default     = 0
}

variable "dlq_max_message_size" {
  description = "The limit of how many bytes a message can contain in the DLQ"
  type        = number
  default     = 262144
}

variable "dlq_message_retention_seconds" {
  description = "The number of seconds Amazon SQS retains a message in the DLQ"
  type        = number
  default     = 1209600
}

variable "dlq_receive_wait_time_seconds" {
  description = "The time for which a ReceiveMessage call will wait for a message to arrive in the DLQ"
  type        = number
  default     = 0
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

variable "dlq_kms_data_key_reuse_period_seconds" {
  description = "The KMS data key reuse period for DLQ"
  type        = number
  default     = 300
}

variable "dlq_fifo_queue" {
  description = "Boolean designating the DLQ as a FIFO queue"
  type        = bool
  default     = false
}

variable "dlq_content_based_deduplication" {
  description = "Enables content-based deduplication for DLQ FIFO queues"
  type        = bool
  default     = false
}

variable "dlq_deduplication_scope" {
  description = "Specifies whether message deduplication occurs at the message group or queue level for DLQ"
  type        = string
  default     = null
}

variable "dlq_fifo_throughput_limit" {
  description = "Specifies whether the DLQ FIFO queue throughput quota applies to the entire queue or per message group"
  type        = string
  default     = null
}

# IAM Policy Configuration
variable "policy_statements" {
  description = "List of IAM policy statements for the SQS queue"
  type        = any
  default     = []
}

variable "dlq_policy_statements" {
  description = "List of IAM policy statements for the DLQ"
  type        = any
  default     = []
}

variable "create_iam_policy" {
  description = "Whether to create an IAM policy for SQS access"
  type        = bool
  default     = false
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

variable "queue_depth_threshold" {
  description = "The threshold for the queue depth alarm"
  type        = number
  default     = 100
}

variable "message_age_threshold" {
  description = "The threshold for the message age alarm (in seconds)"
  type        = number
  default     = 600
}

variable "dlq_depth_threshold" {
  description = "The threshold for the DLQ depth alarm"
  type        = number
  default     = 1
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

# EventBridge Configuration
variable "create_eventbridge_rule" {
  description = "Whether to create an EventBridge rule for SQS events"
  type        = bool
  default     = false
}

variable "eventbridge_event_names" {
  description = "List of SQS event names to capture"
  type        = list(string)
  default     = ["DeleteMessage", "SendMessage", "ReceiveMessage"]
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

# Lambda Integration
variable "lambda_function_arn" {
  description = "The ARN of the Lambda function to trigger from this SQS queue"
  type        = string
  default     = ""
}

variable "lambda_event_source_mapping_enabled" {
  description = "Whether the Lambda event source mapping is enabled"
  type        = bool
  default     = true
}

variable "lambda_batch_size" {
  description = "The largest number of records that Lambda will retrieve from the queue at one time"
  type        = number
  default     = 10
}

variable "lambda_maximum_batching_window" {
  description = "The maximum amount of time to gather records before invoking the function, in seconds"
  type        = number
  default     = null
}

variable "lambda_scaling_config" {
  description = "Scaling configuration for the Lambda event source mapping"
  type = object({
    maximum_concurrency = number
  })
  default = null
}

variable "lambda_filter_criteria" {
  description = "Filter criteria for the Lambda event source mapping"
  type = object({
    filters = list(object({
      pattern = string
    }))
  })
  default = null
}

# SNS Topic for Alarms
variable "create_sns_topic" {
  description = "Whether to create an SNS topic for alarms"
  type        = bool
  default     = false
}

variable "alarm_email" {
  description = "Email address to send alarm notifications"
  type        = string
  default     = ""
}

variable "sns_kms_key_id" {
  description = "The KMS key ID for SNS topic encryption"
  type        = string
  default     = null
}

# Tags
variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}