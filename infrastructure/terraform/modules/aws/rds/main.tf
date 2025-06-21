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

# Random password for database
resource "random_password" "master_password" {
  length  = 16
  special = true
}

# Secrets Manager secret for database password
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.identifier}-password"
  description             = "Password for RDS instance ${var.identifier}"
  recovery_window_in_days = var.secret_recovery_window_in_days

  tags = merge(var.tags, {
    Name = "${var.identifier}-password"
  })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.username
    password = random_password.master_password.result
    endpoint = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = var.database_name
  })
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  count      = var.create_db_subnet_group ? 1 : 0
  name       = var.db_subnet_group_name != "" ? var.db_subnet_group_name : "${var.identifier}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = var.db_subnet_group_name != "" ? var.db_subnet_group_name : "${var.identifier}-subnet-group"
  })
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  count       = var.create_security_group ? 1 : 0
  name_prefix = "${var.identifier}-rds-"
  description = "Security group for RDS instance ${var.identifier}"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  dynamic "ingress" {
    for_each = var.allowed_security_groups
    content {
      from_port       = var.port
      to_port         = var.port
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.identifier}-rds"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  count  = var.create_db_parameter_group ? 1 : 0
  family = var.family
  name   = var.parameter_group_name != "" ? var.parameter_group_name : "${var.identifier}-params"

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(var.tags, {
    Name = var.parameter_group_name != "" ? var.parameter_group_name : "${var.identifier}-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Option Group
resource "aws_db_option_group" "main" {
  count                    = var.create_db_option_group ? 1 : 0
  name                     = var.option_group_name != "" ? var.option_group_name : "${var.identifier}-options"
  option_group_description = var.option_group_description
  engine_name              = var.engine
  major_engine_version     = var.major_engine_version

  dynamic "option" {
    for_each = var.options
    content {
      option_name                    = option.value.option_name
      port                          = lookup(option.value, "port", null)
      version                       = lookup(option.value, "version", null)
      db_security_group_memberships = lookup(option.value, "db_security_group_memberships", null)
      vpc_security_group_memberships = lookup(option.value, "vpc_security_group_memberships", null)

      dynamic "option_settings" {
        for_each = lookup(option.value, "option_settings", [])
        content {
          name  = option_settings.value.name
          value = option_settings.value.value
        }
      }
    }
  }

  tags = merge(var.tags, {
    Name = var.option_group_name != "" ? var.option_group_name : "${var.identifier}-options"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = var.identifier

  # Engine configuration
  engine                      = var.engine
  engine_version              = var.engine_version
  instance_class              = var.instance_class
  license_model               = var.license_model
  character_set_name          = var.character_set_name
  timezone                    = var.timezone
  custom_iam_instance_profile = var.custom_iam_instance_profile

  # Database configuration
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  storage_type           = var.storage_type
  storage_encrypted      = var.storage_encrypted
  kms_key_id            = var.kms_key_id
  iops                  = var.iops
  storage_throughput    = var.storage_throughput

  # Database name and credentials
  db_name  = var.database_name
  username = var.username
  password = random_password.master_password.result
  port     = var.port

  # Network configuration
  db_subnet_group_name   = var.create_db_subnet_group ? aws_db_subnet_group.main[0].name : var.db_subnet_group_name
  vpc_security_group_ids = var.create_security_group ? concat([aws_security_group.rds[0].id], var.vpc_security_group_ids) : var.vpc_security_group_ids
  publicly_accessible    = var.publicly_accessible

  # Availability and maintenance
  availability_zone   = var.availability_zone
  multi_az           = var.multi_az
  ca_cert_identifier = var.ca_cert_identifier

  # Parameter groups
  parameter_group_name = var.create_db_parameter_group ? aws_db_parameter_group.main[0].name : var.parameter_group_name
  option_group_name    = var.create_db_option_group ? aws_db_option_group.main[0].name : var.option_group_name

  # Backup configuration
  backup_retention_period   = var.backup_retention_period
  backup_window            = var.backup_window
  copy_tags_to_snapshot    = var.copy_tags_to_snapshot
  delete_automated_backups = var.delete_automated_backups
  skip_final_snapshot      = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : var.final_snapshot_identifier

  # Maintenance configuration
  maintenance_window         = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  allow_major_version_upgrade = var.allow_major_version_upgrade
  apply_immediately          = var.apply_immediately

  # Monitoring and logging
  monitoring_interval    = var.monitoring_interval
  monitoring_role_arn    = var.monitoring_interval > 0 ? var.monitoring_role_arn : null
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_kms_key_id
  performance_insights_retention_period = var.performance_insights_retention_period
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  # Deletion protection
  deletion_protection = var.deletion_protection

  # Blue/Green deployment
  blue_green_update {
    enabled = var.blue_green_update_enabled
  }

  # Replicate source DB
  replicate_source_db = var.replicate_source_db

  # Domain and IAM
  domain               = var.domain
  domain_iam_role_name = var.domain_iam_role_name

  # Network Type
  network_type = var.network_type

  # Manage master user password via AWS Secrets Manager
  manage_master_user_password = var.manage_master_user_password
  master_user_secret_kms_key_id = var.master_user_secret_kms_key_id

  tags = merge(var.tags, {
    Name = var.identifier
  })

  depends_on = [aws_cloudwatch_log_group.rds]

  lifecycle {
    ignore_changes = [password, final_snapshot_identifier]
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "rds" {
  for_each = toset(var.enabled_cloudwatch_logs_exports)

  name              = "/aws/rds/instance/${var.identifier}/${each.value}"
  retention_in_days = var.cloudwatch_log_group_retention_in_days
  kms_key_id        = var.cloudwatch_log_group_kms_key_id

  tags = var.tags
}

# Read Replica
resource "aws_db_instance" "replica" {
  count = var.create_replica ? 1 : 0

  identifier = "${var.identifier}-replica"

  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.replica_instance_class != "" ? var.replica_instance_class : var.instance_class

  # Override settings for replica
  availability_zone    = var.replica_availability_zone
  multi_az            = var.replica_multi_az
  publicly_accessible = var.replica_publicly_accessible

  # Monitoring for replica
  monitoring_interval = var.replica_monitoring_interval
  monitoring_role_arn = var.replica_monitoring_interval > 0 ? var.monitoring_role_arn : null

  # Performance Insights for replica
  performance_insights_enabled = var.replica_performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_kms_key_id
  performance_insights_retention_period = var.performance_insights_retention_period

  # Backup settings (replicas inherit from source)
  skip_final_snapshot = var.replica_skip_final_snapshot

  auto_minor_version_upgrade = var.replica_auto_minor_version_upgrade

  tags = merge(var.tags, {
    Name = "${var.identifier}-replica"
    Type = "Replica"
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "This metric monitors database cpu utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_disk_queue" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-high-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskQueueDepth"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.disk_queue_threshold
  alarm_description   = "This metric monitors database disk queue depth"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_free_memory" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-low-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.free_memory_threshold
  alarm_description   = "This metric monitors database free memory"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_free_storage_space" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.free_storage_threshold
  alarm_description   = "This metric monitors database free storage space"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

# Enhanced Monitoring IAM Role
resource "aws_iam_role" "enhanced_monitoring" {
  count = var.monitoring_interval > 0 && var.create_monitoring_role ? 1 : 0

  name_prefix = "${var.identifier}-rds-monitoring-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "enhanced_monitoring" {
  count = var.monitoring_interval > 0 && var.create_monitoring_role ? 1 : 0

  role       = aws_iam_role.enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}