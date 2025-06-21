terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Security Groups
resource "aws_security_group" "main" {
  for_each = var.security_groups

  name_prefix = "${each.key}-"
  description = each.value.description
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = each.value.ingress_rules
    content {
      from_port       = ingress.value.from_port
      to_port         = ingress.value.to_port
      protocol        = ingress.value.protocol
      cidr_blocks     = lookup(ingress.value, "cidr_blocks", null)
      ipv6_cidr_blocks = lookup(ingress.value, "ipv6_cidr_blocks", null)
      security_groups = lookup(ingress.value, "security_groups", null)
      self            = lookup(ingress.value, "self", null)
      description     = lookup(ingress.value, "description", "")
    }
  }

  dynamic "egress" {
    for_each = each.value.egress_rules
    content {
      from_port       = egress.value.from_port
      to_port         = egress.value.to_port
      protocol        = egress.value.protocol
      cidr_blocks     = lookup(egress.value, "cidr_blocks", null)
      ipv6_cidr_blocks = lookup(egress.value, "ipv6_cidr_blocks", null)
      security_groups = lookup(egress.value, "security_groups", null)
      self            = lookup(egress.value, "self", null)
      description     = lookup(egress.value, "description", "")
    }
  }

  tags = merge(var.tags, {
    Name = each.key
  })

  lifecycle {
    create_before_destroy = true
  }
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  count = var.create_kms_key ? 1 : 0

  description             = var.kms_key_description
  deletion_window_in_days = var.kms_key_deletion_window
  enable_key_rotation     = var.kms_key_enable_rotation

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = var.kms_key_alias
  })
}

resource "aws_kms_alias" "main" {
  count = var.create_kms_key ? 1 : 0

  name          = "alias/${var.kms_key_alias}"
  target_key_id = aws_kms_key.main[0].key_id
}

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  count = var.create_waf ? 1 : 0

  name  = var.waf_name
  scope = var.waf_scope

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = var.waf_rules
    content {
      name     = rule.value.name
      priority = rule.value.priority

      action {
        dynamic "allow" {
          for_each = rule.value.action == "allow" ? [1] : []
          content {}
        }
        dynamic "block" {
          for_each = rule.value.action == "block" ? [1] : []
          content {}
        }
        dynamic "count" {
          for_each = rule.value.action == "count" ? [1] : []
          content {}
        }
      }

      statement {
        dynamic "managed_rule_group_statement" {
          for_each = rule.value.type == "managed_rule_group" ? [rule.value] : []
          content {
            name        = managed_rule_group_statement.value.rule_group_name
            vendor_name = managed_rule_group_statement.value.vendor_name
          }
        }

        dynamic "rate_based_statement" {
          for_each = rule.value.type == "rate_based" ? [rule.value] : []
          content {
            limit              = rate_based_statement.value.limit
            aggregate_key_type = rate_based_statement.value.aggregate_key_type
          }
        }

        dynamic "ip_set_reference_statement" {
          for_each = rule.value.type == "ip_set" ? [rule.value] : []
          content {
            arn = ip_set_reference_statement.value.ip_set_arn
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = rule.value.name
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = var.waf_name
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

# IP Set for WAF
resource "aws_wafv2_ip_set" "main" {
  for_each = var.waf_ip_sets

  name  = each.key
  scope = var.waf_scope

  ip_address_version = each.value.ip_address_version
  addresses         = each.value.addresses

  tags = var.tags
}

# IAM Roles for security
resource "aws_iam_role" "security_roles" {
  for_each = var.iam_roles

  name = each.key

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = each.value.trusted_services
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "security_role_policies" {
  for_each = {
    for attachment in flatten([
      for role_name, role_config in var.iam_roles : [
        for policy_arn in role_config.policy_arns : {
          role = role_name
          policy = policy_arn
        }
      ]
    ]) : "${attachment.role}-${attachment.policy}" => attachment
  }

  role       = aws_iam_role.security_roles[each.value.role].name
  policy_arn = each.value.policy
}

# Secrets Manager secrets
resource "aws_secretsmanager_secret" "main" {
  for_each = var.secrets

  name                    = each.key
  description             = each.value.description
  recovery_window_in_days = each.value.recovery_window_in_days
  kms_key_id             = var.create_kms_key ? aws_kms_key.main[0].arn : each.value.kms_key_id

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "main" {
  for_each = var.secrets

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = each.value.secret_string
}

# CloudTrail for auditing
resource "aws_cloudtrail" "main" {
  count = var.create_cloudtrail ? 1 : 0

  name           = var.cloudtrail_name
  s3_bucket_name = aws_s3_bucket.cloudtrail[0].id

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::*/*"]
    }
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]

  tags = var.tags
}

# S3 bucket for CloudTrail
resource "aws_s3_bucket" "cloudtrail" {
  count = var.create_cloudtrail ? 1 : 0

  bucket        = var.cloudtrail_bucket_name
  force_destroy = var.cloudtrail_force_destroy

  tags = var.tags
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  count = var.create_cloudtrail ? 1 : 0

  bucket = aws_s3_bucket.cloudtrail[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail[0].arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Config for compliance
resource "aws_config_configuration_recorder" "main" {
  count = var.create_config ? 1 : 0

  name     = var.config_recorder_name
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  count = var.create_config ? 1 : 0

  name           = var.config_delivery_channel_name
  s3_bucket_name = aws_s3_bucket.config[0].bucket
}

resource "aws_iam_role" "config" {
  count = var.create_config ? 1 : 0

  name = "${var.config_recorder_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "config" {
  count = var.create_config ? 1 : 0

  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

resource "aws_s3_bucket" "config" {
  count = var.create_config ? 1 : 0

  bucket        = var.config_bucket_name
  force_destroy = var.config_force_destroy

  tags = var.tags
}