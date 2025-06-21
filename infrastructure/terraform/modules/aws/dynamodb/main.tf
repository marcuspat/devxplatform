terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# DynamoDB Table
resource "aws_dynamodb_table" "main" {
  name           = var.table_name
  billing_mode   = var.billing_mode
  hash_key       = var.hash_key
  range_key      = var.range_key
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  stream_enabled   = var.stream_enabled
  stream_view_type = var.stream_enabled ? var.stream_view_type : null

  dynamic "attribute" {
    for_each = var.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  dynamic "global_secondary_index" {
    for_each = var.global_secondary_indexes
    content {
      name               = global_secondary_index.value.name
      hash_key           = global_secondary_index.value.hash_key
      range_key          = global_secondary_index.value.range_key
      projection_type    = global_secondary_index.value.projection_type
      non_key_attributes = global_secondary_index.value.non_key_attributes
      read_capacity      = var.billing_mode == "PROVISIONED" ? global_secondary_index.value.read_capacity : null
      write_capacity     = var.billing_mode == "PROVISIONED" ? global_secondary_index.value.write_capacity : null
    }
  }

  dynamic "local_secondary_index" {
    for_each = var.local_secondary_indexes
    content {
      name               = local_secondary_index.value.name
      range_key          = local_secondary_index.value.range_key
      projection_type    = local_secondary_index.value.projection_type
      non_key_attributes = local_secondary_index.value.non_key_attributes
    }
  }

  dynamic "ttl" {
    for_each = var.ttl_enabled ? [1] : []
    content {
      attribute_name = var.ttl_attribute_name
      enabled        = var.ttl_enabled
    }
  }

  dynamic "server_side_encryption" {
    for_each = var.server_side_encryption_enabled ? [1] : []
    content {
      enabled     = var.server_side_encryption_enabled
      kms_key_arn = var.kms_key_arn
    }
  }

  dynamic "point_in_time_recovery" {
    for_each = var.point_in_time_recovery_enabled ? [1] : []
    content {
      enabled = var.point_in_time_recovery_enabled
    }
  }

  dynamic "replica" {
    for_each = var.replica_regions
    content {
      region_name                = replica.value.region_name
      kms_key_arn               = replica.value.kms_key_arn
      point_in_time_recovery    = replica.value.point_in_time_recovery
      propagate_tags            = replica.value.propagate_tags
    }
  }

  tags = merge(var.tags, {
    Name = var.table_name
  })

  lifecycle {
    ignore_changes = [
      read_capacity,
      write_capacity,
    ]
  }
}

# Auto Scaling for Read Capacity
resource "aws_appautoscaling_target" "read_target" {
  count              = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  max_capacity       = var.autoscaling_read_max_capacity
  min_capacity       = var.autoscaling_read_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "read_policy" {
  count              = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  name               = "${var.table_name}-read-autoscaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.read_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.read_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.read_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = var.autoscaling_read_target_value
  }
}

# Auto Scaling for Write Capacity
resource "aws_appautoscaling_target" "write_target" {
  count              = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  max_capacity       = var.autoscaling_write_max_capacity
  min_capacity       = var.autoscaling_write_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "write_policy" {
  count              = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  name               = "${var.table_name}-write-autoscaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.write_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.write_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.write_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = var.autoscaling_write_target_value
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "read_throttled_events" {
  count                     = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name                = "${var.table_name}-read-throttled-events"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = "2"
  metric_name               = "ReadThrottledEvents"
  namespace                 = "AWS/DynamoDB"
  period                    = "300"
  statistic                 = "Sum"
  threshold                 = "0"
  alarm_description         = "This metric monitors DynamoDB read throttled events"
  insufficient_data_actions = []

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "write_throttled_events" {
  count                     = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name                = "${var.table_name}-write-throttled-events"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = "2"
  metric_name               = "WriteThrottledEvents"
  namespace                 = "AWS/DynamoDB"
  period                    = "300"
  statistic                 = "Sum"
  threshold                 = "0"
  alarm_description         = "This metric monitors DynamoDB write throttled events"
  insufficient_data_actions = []

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.tags
}

# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# IAM Policy Document for DynamoDB Access
data "aws_iam_policy_document" "dynamodb_access" {
  statement {
    sid    = "DynamoDBTableAccess"
    effect = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
      "dynamodb:DescribeTable",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:ListTagsOfResource",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
      "dynamodb:DescribeStream",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams",
      "dynamodb:DescribeReservedCapacity",
      "dynamodb:DescribeReservedCapacityOfferings"
    ]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/*"
    ]
  }

  dynamic "statement" {
    for_each = var.stream_enabled ? [1] : []
    content {
      sid    = "DynamoDBStreamAccess"
      effect = "Allow"
      actions = [
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:ListStreams"
      ]
      resources = [
        aws_dynamodb_table.main.stream_arn
      ]
    }
  }

  dynamic "statement" {
    for_each = var.kms_key_arn != null ? [1] : []
    content {
      sid    = "KMSAccess"
      effect = "Allow"
      actions = [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ]
      resources = [var.kms_key_arn]
      condition {
        test     = "StringEquals"
        variable = "kms:ViaService"
        values   = ["dynamodb.${data.aws_region.current.name}.amazonaws.com"]
      }
    }
  }
}

# IAM Policy for DynamoDB Access
resource "aws_iam_policy" "dynamodb_access" {
  count       = var.create_iam_policy ? 1 : 0
  name        = "${var.table_name}-dynamodb-access-policy"
  description = "IAM policy for accessing DynamoDB table ${var.table_name}"
  policy      = data.aws_iam_policy_document.dynamodb_access.json
  tags        = var.tags
}

# SNS Topic for Alarms
resource "aws_sns_topic" "dynamodb_alarms" {
  count             = var.enable_sns_topic ? 1 : 0
  name              = "${var.table_name}-dynamodb-alarms"
  display_name      = "DynamoDB Alarms for ${var.table_name}"
  kms_master_key_id = var.sns_kms_key_id
  tags              = var.tags
}

resource "aws_sns_topic_subscription" "dynamodb_alarms_email" {
  count     = var.enable_sns_topic && var.alarm_email != null ? 1 : 0
  topic_arn = aws_sns_topic.dynamodb_alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# Additional CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "system_errors" {
  count                     = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name                = "${var.table_name}-system-errors"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = "2"
  metric_name               = "SystemErrors"
  namespace                 = "AWS/DynamoDB"
  period                    = "300"
  statistic                 = "Sum"
  threshold                 = var.system_errors_threshold
  alarm_description         = "This metric monitors DynamoDB system errors"
  insufficient_data_actions = []
  alarm_actions             = var.enable_sns_topic ? [aws_sns_topic.dynamodb_alarms[0].arn] : []
  ok_actions                = var.enable_sns_topic ? [aws_sns_topic.dynamodb_alarms[0].arn] : []

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "consumed_read_capacity" {
  count                     = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? 1 : 0
  alarm_name                = "${var.table_name}-consumed-read-capacity"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = "2"
  metric_name               = "ConsumedReadCapacityUnits"
  namespace                 = "AWS/DynamoDB"
  period                    = "300"
  statistic                 = "Sum"
  threshold                 = var.consumed_read_threshold_percentage * var.read_capacity * 5
  alarm_description         = "This metric monitors consumed read capacity"
  insufficient_data_actions = []
  alarm_actions             = var.enable_sns_topic ? [aws_sns_topic.dynamodb_alarms[0].arn] : []

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "consumed_write_capacity" {
  count                     = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? 1 : 0
  alarm_name                = "${var.table_name}-consumed-write-capacity"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = "2"
  metric_name               = "ConsumedWriteCapacityUnits"
  namespace                 = "AWS/DynamoDB"
  period                    = "300"
  statistic                 = "Sum"
  threshold                 = var.consumed_write_threshold_percentage * var.write_capacity * 5
  alarm_description         = "This metric monitors consumed write capacity"
  insufficient_data_actions = []
  alarm_actions             = var.enable_sns_topic ? [aws_sns_topic.dynamodb_alarms[0].arn] : []

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.tags
}

# Backup Configuration
resource "aws_backup_plan" "dynamodb" {
  count = var.enable_backup_plan ? 1 : 0
  name  = "${var.table_name}-backup-plan"

  rule {
    rule_name         = "${var.table_name}-daily-backup"
    target_vault_name = aws_backup_vault.dynamodb[0].name
    schedule          = var.backup_schedule
    start_window      = 60
    completion_window = 120

    lifecycle {
      delete_after = var.backup_retention_days
    }

    recovery_point_tags = merge(var.tags, {
      BackupPlan = "${var.table_name}-backup-plan"
    })
  }

  tags = var.tags
}

resource "aws_backup_vault" "dynamodb" {
  count       = var.enable_backup_plan ? 1 : 0
  name        = "${var.table_name}-backup-vault"
  kms_key_arn = var.backup_vault_kms_key_arn
  tags        = var.tags
}

resource "aws_backup_selection" "dynamodb" {
  count        = var.enable_backup_plan ? 1 : 0
  name         = "${var.table_name}-backup-selection"
  plan_id      = aws_backup_plan.dynamodb[0].id
  iam_role_arn = aws_iam_role.backup[0].arn

  resources = [
    aws_dynamodb_table.main.arn
  ]
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  count              = var.enable_backup_plan ? 1 : 0
  name               = "${var.table_name}-backup-role"
  assume_role_policy = data.aws_iam_policy_document.backup_assume_role[0].json
  tags               = var.tags
}

data "aws_iam_policy_document" "backup_assume_role" {
  count = var.enable_backup_plan ? 1 : 0
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role_policy_attachment" "backup" {
  count      = var.enable_backup_plan ? 1 : 0
  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_dynamodb" {
  count      = var.enable_backup_plan ? 1 : 0
  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}