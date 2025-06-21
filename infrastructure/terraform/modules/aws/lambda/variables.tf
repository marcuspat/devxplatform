# Function Configuration
variable "function_name" {
  description = "The name of the Lambda function"
  type        = string
}

variable "description" {
  description = "Description of the Lambda function"
  type        = string
  default     = ""
}

variable "handler" {
  description = "The function handler (default depends on runtime)"
  type        = string
  default     = null
}

variable "runtime" {
  description = "The runtime environment for the Lambda function"
  type        = string
  default     = "nodejs18.x"
}

variable "timeout" {
  description = "The timeout in seconds (default depends on runtime)"
  type        = number
  default     = null
}

variable "memory_size" {
  description = "The amount of memory in MB (default depends on runtime)"
  type        = number
  default     = null
}

variable "ephemeral_storage_size" {
  description = "The size of ephemeral storage in MB (512-10240)"
  type        = number
  default     = null
}

variable "reserved_concurrent_executions" {
  description = "The number of concurrent executions reserved for this function"
  type        = number
  default     = null
}

variable "provisioned_concurrent_executions" {
  description = "The number of provisioned concurrent executions"
  type        = number
  default     = null
}

variable "architectures" {
  description = "CPU architectures (x86_64 or arm64)"
  type        = list(string)
  default     = ["x86_64"]
}

variable "package_type" {
  description = "Lambda deployment package type (Zip or Image)"
  type        = string
  default     = "Zip"
}

variable "publish" {
  description = "Whether to publish creation/change as new Lambda function version"
  type        = bool
  default     = false
}

variable "layers" {
  description = "List of Lambda layer ARNs to attach"
  type        = list(string)
  default     = []
}

# Code Source
variable "filename" {
  description = "Path to the function's deployment package"
  type        = string
  default     = null
}

variable "source_code_hash" {
  description = "Base64-encoded SHA256 hash of the package file"
  type        = string
  default     = null
}

variable "s3_bucket" {
  description = "S3 bucket containing the deployment package"
  type        = string
  default     = null
}

variable "s3_key" {
  description = "S3 key of the deployment package"
  type        = string
  default     = null
}

variable "s3_object_version" {
  description = "S3 object version of the deployment package"
  type        = string
  default     = null
}

variable "image_uri" {
  description = "ECR image URI containing the function's deployment package"
  type        = string
  default     = null
}

# Environment Variables
variable "environment_variables" {
  description = "Map of environment variables"
  type        = map(string)
  default     = {}
}

# VPC Configuration
variable "vpc_subnet_ids" {
  description = "List of subnet IDs for VPC configuration"
  type        = list(string)
  default     = null
}

variable "vpc_security_group_ids" {
  description = "List of security group IDs for VPC configuration"
  type        = list(string)
  default     = null
}

# Dead Letter Configuration
variable "dead_letter_target_arn" {
  description = "ARN of SNS topic or SQS queue for dead letter queue"
  type        = string
  default     = null
}

# Tracing Configuration
variable "tracing_mode" {
  description = "X-Ray tracing mode (Active or PassThrough)"
  type        = string
  default     = null
}

# File System Configuration
variable "file_system_config" {
  description = "EFS file system configuration"
  type = object({
    arn              = string
    local_mount_path = string
  })
  default = null
}

# Snap Start (Java)
variable "snap_start" {
  description = "Enable Lambda SnapStart for Java functions"
  type        = bool
  default     = false
}

# Alias Configuration
variable "create_alias" {
  description = "Whether to create an alias"
  type        = bool
  default     = false
}

variable "alias_name" {
  description = "Name for the Lambda alias"
  type        = string
  default     = "live"
}

variable "alias_description" {
  description = "Description of the alias"
  type        = string
  default     = ""
}

variable "alias_function_version" {
  description = "Function version for the alias"
  type        = string
  default     = null
}

variable "alias_routing_config" {
  description = "The Lambda alias routing configuration"
  type = object({
    additional_version_weights = map(number)
  })
  default = null
}

# Permissions
variable "allowed_triggers" {
  description = "Map of allowed triggers to create Lambda permissions"
  type = map(object({
    action             = string
    principal          = string
    source_arn         = string
    source_account     = string
    event_source_token = string
  }))
  default = {}
}

# Event Source Mappings
variable "event_source_mappings" {
  description = "Map of event source mappings"
  type = map(object({
    event_source_arn                   = string
    enabled                            = optional(bool, true)
    batch_size                         = optional(number)
    maximum_batching_window_in_seconds = optional(number)
    parallelization_factor            = optional(number)
    starting_position                 = optional(string)
    starting_position_timestamp       = optional(string)
    maximum_record_age_in_seconds     = optional(number)
    bisect_batch_on_function_error    = optional(bool)
    maximum_retry_attempts            = optional(number)
    tumbling_window_in_seconds        = optional(number)
    destination_config = optional(object({
      on_failure = optional(object({
        destination_arn = string
      }))
    }))
    filter_criteria = optional(object({
      filters = list(object({
        pattern = string
      }))
    }))
    self_managed_event_source = optional(object({
      endpoints = map(list(string))
    }))
    source_access_configurations = optional(list(object({
      type = string
      uri  = string
    })), [])
  }))
  default = {}
}

# Async Invocation Configuration
variable "maximum_event_age_in_seconds" {
  description = "Maximum age of a request that Lambda sends to a function for async invocation"
  type        = number
  default     = null
}

variable "maximum_retry_attempts" {
  description = "Maximum number of times to retry when function returns an error for async invocation"
  type        = number
  default     = null
}

variable "destination_on_failure" {
  description = "ARN of destination for failed async invocations"
  type        = string
  default     = null
}

variable "destination_on_success" {
  description = "ARN of destination for successful async invocations"
  type        = string
  default     = null
}

# Function URL
variable "create_function_url" {
  description = "Whether to create a function URL"
  type        = bool
  default     = false
}

variable "function_url_authorization_type" {
  description = "Type of authentication for function URL (AWS_IAM or NONE)"
  type        = string
  default     = "AWS_IAM"
}

variable "function_url_cors" {
  description = "CORS configuration for function URL"
  type = object({
    allow_credentials = optional(bool)
    allow_headers     = optional(list(string))
    allow_methods     = optional(list(string))
    allow_origins     = optional(list(string))
    expose_headers    = optional(list(string))
    max_age          = optional(number)
  })
  default = null
}

# CloudWatch Logs
variable "cloudwatch_logs_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "cloudwatch_logs_kms_key_id" {
  description = "KMS Key ID for CloudWatch logs encryption"
  type        = string
  default     = null
}

# IAM Role Configuration
variable "role_path" {
  description = "Path for the IAM role"
  type        = string
  default     = "/"
}

variable "role_permissions_boundary" {
  description = "ARN of the policy used to set permissions boundary"
  type        = string
  default     = null
}

variable "role_force_detach_policies" {
  description = "Whether to force detaching policies from the role"
  type        = bool
  default     = true
}

variable "role_max_session_duration" {
  description = "Maximum session duration in seconds"
  type        = number
  default     = 3600
}

# IAM Policies
variable "attach_policy_arns" {
  description = "List of IAM policy ARNs to attach to the Lambda role"
  type        = list(string)
  default     = []
}

variable "attach_policy_json" {
  description = "Whether to attach an inline policy to the Lambda role"
  type        = bool
  default     = false
}

variable "policy_json" {
  description = "JSON policy document for inline policy"
  type        = string
  default     = ""
}

# Service-specific policies
variable "attach_dynamodb_policy" {
  description = "Whether to attach DynamoDB policy"
  type        = bool
  default     = false
}

variable "dynamodb_actions" {
  description = "List of DynamoDB actions to allow"
  type        = list(string)
  default = [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:Query",
    "dynamodb:Scan"
  ]
}

variable "dynamodb_table_arns" {
  description = "List of DynamoDB table ARNs"
  type        = list(string)
  default     = []
}

variable "attach_s3_policy" {
  description = "Whether to attach S3 policy"
  type        = bool
  default     = false
}

variable "s3_actions" {
  description = "List of S3 object actions to allow"
  type        = list(string)
  default = [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject"
  ]
}

variable "s3_bucket_actions" {
  description = "List of S3 bucket actions to allow"
  type        = list(string)
  default = [
    "s3:ListBucket"
  ]
}

variable "s3_bucket_names" {
  description = "List of S3 bucket names"
  type        = list(string)
  default     = []
}

variable "attach_sqs_policy" {
  description = "Whether to attach SQS policy"
  type        = bool
  default     = false
}

variable "sqs_actions" {
  description = "List of SQS actions to allow"
  type        = list(string)
  default = [
    "sqs:SendMessage",
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ]
}

variable "sqs_queue_arns" {
  description = "List of SQS queue ARNs"
  type        = list(string)
  default     = []
}

variable "attach_sns_policy" {
  description = "Whether to attach SNS policy"
  type        = bool
  default     = false
}

variable "sns_actions" {
  description = "List of SNS actions to allow"
  type        = list(string)
  default = [
    "sns:Publish"
  ]
}

variable "sns_topic_arns" {
  description = "List of SNS topic ARNs"
  type        = list(string)
  default     = []
}

variable "attach_secrets_policy" {
  description = "Whether to attach Secrets Manager policy"
  type        = bool
  default     = false
}

variable "secrets_arns" {
  description = "List of Secrets Manager secret ARNs"
  type        = list(string)
  default     = []
}

variable "attach_ssm_policy" {
  description = "Whether to attach SSM Parameter Store policy"
  type        = bool
  default     = false
}

variable "ssm_parameter_arns" {
  description = "List of SSM Parameter ARNs"
  type        = list(string)
  default     = []
}

variable "attach_kinesis_policy" {
  description = "Whether to attach Kinesis policy"
  type        = bool
  default     = false
}

variable "kinesis_actions" {
  description = "List of Kinesis actions to allow"
  type        = list(string)
  default = [
    "kinesis:DescribeStream",
    "kinesis:GetShardIterator",
    "kinesis:GetRecords",
    "kinesis:ListShards"
  ]
}

variable "kinesis_stream_arns" {
  description = "List of Kinesis stream ARNs"
  type        = list(string)
  default     = []
}

variable "attach_cloudwatch_logs_policy" {
  description = "Whether to attach CloudWatch Logs policy"
  type        = bool
  default     = false
}

variable "cloudwatch_logs_arns" {
  description = "List of CloudWatch Logs ARNs"
  type        = list(string)
  default     = []
}

# Tags
variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}

# Security Group Configuration
variable "vpc_id" {
  description = "VPC ID for the Lambda security group"
  type        = string
  default     = null
}

variable "create_security_group" {
  description = "Whether to create a security group for Lambda"
  type        = bool
  default     = true
}

variable "security_group_egress_rules" {
  description = "Map of custom egress rules for Lambda security group"
  type = map(object({
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string))
    prefix_list_ids = optional(list(string))
    description     = string
  }))
  default = {}
}

# CloudWatch Alarms
variable "enable_cloudwatch_alarms" {
  description = "Whether to create CloudWatch alarms"
  type        = bool
  default     = false
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm transitions to ALARM state"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to notify when alarm transitions to OK state"
  type        = list(string)
  default     = []
}

# Error Alarm Configuration
variable "error_alarm_threshold" {
  description = "Threshold for Lambda error alarm"
  type        = number
  default     = 5
}

variable "error_alarm_evaluation_periods" {
  description = "Evaluation periods for error alarm"
  type        = number
  default     = 2
}

variable "error_alarm_period" {
  description = "Period in seconds for error alarm"
  type        = number
  default     = 300
}

# Throttle Alarm Configuration
variable "throttle_alarm_threshold" {
  description = "Threshold for Lambda throttle alarm"
  type        = number
  default     = 5
}

variable "throttle_alarm_evaluation_periods" {
  description = "Evaluation periods for throttle alarm"
  type        = number
  default     = 2
}

variable "throttle_alarm_period" {
  description = "Period in seconds for throttle alarm"
  type        = number
  default     = 300
}

# Duration Alarm Configuration
variable "duration_alarm_threshold" {
  description = "Threshold for Lambda duration alarm in milliseconds"
  type        = number
  default     = 3000
}

variable "duration_alarm_evaluation_periods" {
  description = "Evaluation periods for duration alarm"
  type        = number
  default     = 2
}

variable "duration_alarm_period" {
  description = "Period in seconds for duration alarm"
  type        = number
  default     = 300
}

# Concurrent Executions Alarm Configuration
variable "concurrent_alarm_threshold" {
  description = "Threshold for concurrent executions alarm"
  type        = number
  default     = null
}

variable "concurrent_alarm_evaluation_periods" {
  description = "Evaluation periods for concurrent executions alarm"
  type        = number
  default     = 2
}

variable "concurrent_alarm_period" {
  description = "Period in seconds for concurrent executions alarm"
  type        = number
  default     = 60
}

# Dead Letter Queue Alarm Configuration
variable "dlq_alarm_threshold" {
  description = "Threshold for dead letter queue errors"
  type        = number
  default     = 1
}

variable "dlq_alarm_evaluation_periods" {
  description = "Evaluation periods for DLQ alarm"
  type        = number
  default     = 1
}

variable "dlq_alarm_period" {
  description = "Period in seconds for DLQ alarm"
  type        = number
  default     = 300
}

# CloudWatch Dashboard
variable "create_cloudwatch_dashboard" {
  description = "Whether to create a CloudWatch dashboard"
  type        = bool
  default     = false
}