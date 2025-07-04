terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = merge(var.tags, {
    Name        = "Terraform State"
    Description = "S3 bucket for storing Terraform state files"
  })
}

# Enable versioning for state history
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption for state files
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access to state bucket
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name        = "Terraform State Locks"
    Description = "DynamoDB table for Terraform state locking"
  })
}

# Create backend configuration file
resource "local_file" "backend_config" {
  filename = "${path.module}/backend.hcl"
  content  = <<-EOT
    bucket         = "${aws_s3_bucket.terraform_state.id}"
    key            = "terraform.tfstate"
    region         = "${data.aws_region.current.name}"
    encrypt        = true
    dynamodb_table = "${aws_dynamodb_table.terraform_locks.id}"
  EOT

  depends_on = [
    aws_s3_bucket.terraform_state,
    aws_dynamodb_table.terraform_locks
  ]
}

# Data sources
data "aws_region" "current" {}