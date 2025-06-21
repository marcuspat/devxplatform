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

# Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  count      = var.create_subnet_group ? 1 : 0
  name       = var.subnet_group_name != "" ? var.subnet_group_name : "${var.cluster_id}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = var.subnet_group_name != "" ? var.subnet_group_name : "${var.cluster_id}-subnet-group"
  })
}

# Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  count       = var.create_parameter_group ? 1 : 0
  family      = var.parameter_group_family
  name        = var.parameter_group_name != "" ? var.parameter_group_name : "${var.cluster_id}-params"
  description = var.parameter_group_description

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(var.tags, {
    Name = var.parameter_group_name != "" ? var.parameter_group_name : "${var.cluster_id}-params"
  })
}

# Security Group
resource "aws_security_group" "elasticache" {
  count       = var.create_security_group ? 1 : 0
  name_prefix = "${var.cluster_id}-elasticache-"
  description = "Security group for ElastiCache cluster ${var.cluster_id}"
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
    Name = "${var.cluster_id}-elasticache"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "redis" {
  count = var.engine == "redis" ? 1 : 0

  replication_group_id       = var.cluster_id
  description               = var.description
  port                      = var.port
  parameter_group_name      = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].name : var.parameter_group_name
  node_type                 = var.node_type
  num_cache_clusters        = var.num_cache_clusters
  engine_version            = var.engine_version
  subnet_group_name         = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name
  security_group_ids        = var.create_security_group ? [aws_security_group.elasticache[0].id] : var.security_group_ids
  
  # Multi-AZ and clustering
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled          = var.multi_az_enabled
  num_node_groups           = var.num_node_groups
  replicas_per_node_group   = var.replicas_per_node_group

  # Backup and maintenance
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window         = var.snapshot_window
  maintenance_window      = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Encryption
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.auth_token
  kms_key_id                = var.kms_key_id

  # Logging
  log_delivery_configuration {
    destination      = var.redis_slow_log_destination
    destination_type = var.redis_slow_log_destination_type
    log_format      = var.redis_slow_log_format
    log_type        = "slow-log"
  }

  # Notification
  notification_topic_arn = var.notification_topic_arn

  # Data tiering
  data_tiering_enabled = var.data_tiering_enabled

  # Global datastore
  global_replication_group_id = var.global_replication_group_id

  # Preferred cache cluster AZs
  preferred_cache_cluster_azs = var.preferred_cache_cluster_azs

  # Final snapshot identifier
  final_snapshot_identifier = var.final_snapshot_identifier

  tags = merge(var.tags, {
    Name = var.cluster_id
  })

  depends_on = [
    aws_elasticache_subnet_group.main,
    aws_elasticache_parameter_group.main
  ]
}

# ElastiCache Memcached Cluster
resource "aws_elasticache_cluster" "memcached" {
  count = var.engine == "memcached" ? 1 : 0

  cluster_id           = var.cluster_id
  engine              = "memcached"
  node_type           = var.node_type
  num_cache_nodes     = var.num_cache_nodes
  parameter_group_name = var.create_parameter_group ? aws_elasticache_parameter_group.main[0].name : var.parameter_group_name
  port                = var.port
  subnet_group_name   = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name
  security_group_ids  = var.create_security_group ? [aws_security_group.elasticache[0].id] : var.security_group_ids
  engine_version      = var.engine_version
  maintenance_window  = var.maintenance_window
  notification_topic_arn = var.notification_topic_arn
  preferred_availability_zones = var.preferred_availability_zones

  tags = merge(var.tags, {
    Name = var.cluster_id
  })

  depends_on = [
    aws_elasticache_subnet_group.main,
    aws_elasticache_parameter_group.main
  ]
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.cluster_id}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "This metric monitors elasticache cpu utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = var.engine == "redis" ? aws_elasticache_replication_group.redis[0].id : aws_elasticache_cluster.memcached[0].id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_memory_usage" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.cluster_id}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.memory_threshold
  alarm_description   = "This metric monitors elasticache memory usage"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = var.engine == "redis" ? aws_elasticache_replication_group.redis[0].id : aws_elasticache_cluster.memcached[0].id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "swap_usage" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.cluster_id}-high-swap"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SwapUsage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.swap_threshold
  alarm_description   = "This metric monitors elasticache swap usage"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = var.engine == "redis" ? aws_elasticache_replication_group.redis[0].id : aws_elasticache_cluster.memcached[0].id
  }

  tags = var.tags
}

# Redis-specific alarms
resource "aws_cloudwatch_metric_alarm" "evictions" {
  count = var.create_cloudwatch_alarms && var.engine == "redis" ? 1 : 0

  alarm_name          = "${var.cluster_id}-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.evictions_threshold
  alarm_description   = "This metric monitors elasticache evictions"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis[0].id
  }

  tags = var.tags
}

# User Group for Redis AUTH
resource "aws_elasticache_user_group" "main" {
  count = var.engine == "redis" && var.create_user_group ? 1 : 0

  engine          = "REDIS"
  user_group_id   = "${var.cluster_id}-user-group"
  user_ids        = ["default"]

  tags = var.tags
}

# Users for Redis AUTH
resource "aws_elasticache_user" "main" {
  for_each = var.engine == "redis" ? var.redis_users : {}

  user_id       = each.key
  user_name     = each.value.user_name
  access_string = each.value.access_string
  engine        = "REDIS"
  passwords     = each.value.passwords

  tags = var.tags
}