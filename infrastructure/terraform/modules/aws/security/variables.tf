# General Configuration
variable "vpc_id" {
  description = "VPC ID where security groups will be created"
  type        = string
  default     = ""
}

# Security Groups
variable "security_groups" {
  description = "Map of security group configurations"
  type = map(object({
    description = string
    ingress_rules = list(object({
      from_port        = number
      to_port          = number
      protocol         = string
      cidr_blocks      = optional(list(string))
      ipv6_cidr_blocks = optional(list(string))
      security_groups  = optional(list(string))
      self             = optional(bool)
      description      = optional(string)
    }))
    egress_rules = list(object({
      from_port        = number
      to_port          = number
      protocol         = string
      cidr_blocks      = optional(list(string))
      ipv6_cidr_blocks = optional(list(string))
      security_groups  = optional(list(string))
      self             = optional(bool)
      description      = optional(string)
    }))
  }))
  default = {}
}

# KMS Configuration
variable "create_kms_key" {
  description = "Whether to create a KMS key"
  type        = bool
  default     = false
}

variable "kms_key_description" {
  description = "Description for the KMS key"
  type        = string
  default     = "KMS key for encryption"
}

variable "kms_key_alias" {
  description = "Alias for the KMS key"
  type        = string
  default     = "security-key"
}

variable "kms_key_deletion_window" {
  description = "The waiting period, specified in number of days"
  type        = number
  default     = 30
}

variable "kms_key_enable_rotation" {
  description = "Specifies whether key rotation is enabled"
  type        = bool
  default     = true
}

# WAF Configuration
variable "create_waf" {
  description = "Whether to create a WAF Web ACL"
  type        = bool
  default     = false
}

variable "waf_name" {
  description = "Name of the WAF Web ACL"
  type        = string
  default     = "security-waf"
}

variable "waf_scope" {
  description = "Scope of the WAF Web ACL (CLOUDFRONT or REGIONAL)"
  type        = string
  default     = "REGIONAL"
}

variable "waf_rules" {
  description = "List of WAF rules"
  type = list(object({
    name               = string
    priority           = number
    action             = string
    type               = string
    rule_group_name    = optional(string)
    vendor_name        = optional(string)
    limit              = optional(number)
    aggregate_key_type = optional(string)
    ip_set_arn         = optional(string)
  }))
  default = []
}

variable "waf_ip_sets" {
  description = "Map of IP sets for WAF"
  type = map(object({
    ip_address_version = string
    addresses          = list(string)
  }))
  default = {}
}

# IAM Roles
variable "iam_roles" {
  description = "Map of IAM roles to create"
  type = map(object({
    trusted_services = list(string)
    policy_arns      = list(string)
  }))
  default = {}
}

# Secrets Manager
variable "secrets" {
  description = "Map of secrets to create in Secrets Manager"
  type = map(object({
    description             = string
    secret_string           = string
    recovery_window_in_days = optional(number, 7)
    kms_key_id             = optional(string)
  }))
  default = {}
}

# CloudTrail Configuration
variable "create_cloudtrail" {
  description = "Whether to create CloudTrail"
  type        = bool
  default     = false
}

variable "cloudtrail_name" {
  description = "Name of the CloudTrail"
  type        = string
  default     = "security-trail"
}

variable "cloudtrail_bucket_name" {
  description = "S3 bucket name for CloudTrail logs"
  type        = string
  default     = ""
}

variable "cloudtrail_force_destroy" {
  description = "Whether to force destroy CloudTrail S3 bucket"
  type        = bool
  default     = false
}

# AWS Config
variable "create_config" {
  description = "Whether to create AWS Config"
  type        = bool
  default     = false
}

variable "config_recorder_name" {
  description = "Name of the Config recorder"
  type        = string
  default     = "security-config"
}

variable "config_delivery_channel_name" {
  description = "Name of the Config delivery channel"
  type        = string
  default     = "security-config-channel"
}

variable "config_bucket_name" {
  description = "S3 bucket name for Config"
  type        = string
  default     = ""
}

variable "config_force_destroy" {
  description = "Whether to force destroy Config S3 bucket"
  type        = bool
  default     = false
}

# Tags
variable "tags" {
  description = "A map of tags to assign to resources"
  type        = map(string)
  default     = {}
}