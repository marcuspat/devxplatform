output "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "ARN of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "lock_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.id
}

output "lock_table_arn" {
  description = "ARN of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "kms_key_id" {
  description = "ID of the KMS key for state encryption"
  value       = aws_kms_key.terraform_state.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key for state encryption"
  value       = aws_kms_key.terraform_state.arn
}

output "kms_key_alias" {
  description = "Alias of the KMS key for state encryption"
  value       = aws_kms_alias.terraform_state.name
}

output "terraform_state_policy_arn" {
  description = "ARN of the IAM policy for Terraform state access"
  value       = aws_iam_policy.terraform_state.arn
}

output "backend_config" {
  description = "Backend configuration for Terraform"
  value = {
    bucket         = aws_s3_bucket.terraform_state.id
    region         = data.aws_region.current.name
    encrypt        = true
    kms_key_id     = aws_kms_key.terraform_state.arn
    dynamodb_table = aws_dynamodb_table.terraform_locks.id
  }
}