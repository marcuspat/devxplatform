# Security Groups
output "security_group_ids" {
  description = "Map of security group IDs"
  value       = { for k, v in aws_security_group.main : k => v.id }
}

output "security_group_arns" {
  description = "Map of security group ARNs"
  value       = { for k, v in aws_security_group.main : k => v.arn }
}

output "security_group_names" {
  description = "Map of security group names"
  value       = { for k, v in aws_security_group.main : k => v.name }
}

# KMS Key
output "kms_key_id" {
  description = "The globally unique identifier for the key"
  value       = try(aws_kms_key.main[0].key_id, "")
}

output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the key"
  value       = try(aws_kms_key.main[0].arn, "")
}

output "kms_alias_arn" {
  description = "The Amazon Resource Name (ARN) of the key alias"
  value       = try(aws_kms_alias.main[0].arn, "")
}

output "kms_alias_name" {
  description = "The display name of the alias"
  value       = try(aws_kms_alias.main[0].name, "")
}

# WAF
output "waf_web_acl_id" {
  description = "The ID of the WAF WebACL"
  value       = try(aws_wafv2_web_acl.main[0].id, "")
}

output "waf_web_acl_arn" {
  description = "The ARN of the WAF WebACL"
  value       = try(aws_wafv2_web_acl.main[0].arn, "")
}

output "waf_web_acl_capacity" {
  description = "The web ACL capacity units (WCUs) currently being used by this web ACL"
  value       = try(aws_wafv2_web_acl.main[0].capacity, 0)
}

output "waf_ip_set_ids" {
  description = "Map of IP set IDs"
  value       = { for k, v in aws_wafv2_ip_set.main : k => v.id }
}

output "waf_ip_set_arns" {
  description = "Map of IP set ARNs"
  value       = { for k, v in aws_wafv2_ip_set.main : k => v.arn }
}

# IAM Roles
output "iam_role_arns" {
  description = "Map of IAM role ARNs"
  value       = { for k, v in aws_iam_role.security_roles : k => v.arn }
}

output "iam_role_names" {
  description = "Map of IAM role names"
  value       = { for k, v in aws_iam_role.security_roles : k => v.name }
}

output "iam_role_unique_ids" {
  description = "Map of IAM role unique IDs"
  value       = { for k, v in aws_iam_role.security_roles : k => v.unique_id }
}

# Secrets Manager
output "secret_arns" {
  description = "Map of secret ARNs"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.arn }
}

output "secret_ids" {
  description = "Map of secret IDs"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.id }
}

output "secret_names" {
  description = "Map of secret names"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.name }
}

output "secret_version_ids" {
  description = "Map of secret version IDs"
  value       = { for k, v in aws_secretsmanager_secret_version.main : k => v.version_id }
}

# CloudTrail
output "cloudtrail_id" {
  description = "The ID of the trail"
  value       = try(aws_cloudtrail.main[0].id, "")
}

output "cloudtrail_arn" {
  description = "The ARN of the trail"
  value       = try(aws_cloudtrail.main[0].arn, "")
}

output "cloudtrail_home_region" {
  description = "The region in which the trail was created"
  value       = try(aws_cloudtrail.main[0].home_region, "")
}

output "cloudtrail_s3_bucket_name" {
  description = "The S3 bucket name for CloudTrail logs"
  value       = try(aws_s3_bucket.cloudtrail[0].id, "")
}

output "cloudtrail_s3_bucket_arn" {
  description = "The S3 bucket ARN for CloudTrail logs"
  value       = try(aws_s3_bucket.cloudtrail[0].arn, "")
}

# AWS Config
output "config_configuration_recorder_name" {
  description = "The name of the recorder"
  value       = try(aws_config_configuration_recorder.main[0].name, "")
}

output "config_delivery_channel_id" {
  description = "The name of the delivery channel"
  value       = try(aws_config_delivery_channel.main[0].id, "")
}

output "config_iam_role_arn" {
  description = "The ARN of the IAM role used by the delivery channel"
  value       = try(aws_iam_role.config[0].arn, "")
}

output "config_s3_bucket_name" {
  description = "The S3 bucket name for Config"
  value       = try(aws_s3_bucket.config[0].id, "")
}

output "config_s3_bucket_arn" {
  description = "The S3 bucket ARN for Config"
  value       = try(aws_s3_bucket.config[0].arn, "")
}