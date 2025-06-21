# Redis Replication Group Outputs
output "redis_replication_group_id" {
  description = "ID of the ElastiCache Redis replication group"
  value       = try(aws_elasticache_replication_group.redis[0].id, "")
}

output "redis_replication_group_arn" {
  description = "ARN of the ElastiCache Redis replication group"
  value       = try(aws_elasticache_replication_group.redis[0].arn, "")
}

output "redis_primary_endpoint_address" {
  description = "Address of the endpoint for the primary node in the replication group"
  value       = try(aws_elasticache_replication_group.redis[0].primary_endpoint_address, "")
}

output "redis_reader_endpoint_address" {
  description = "Address of the endpoint for the reader node in the replication group"
  value       = try(aws_elasticache_replication_group.redis[0].reader_endpoint_address, "")
}

output "redis_configuration_endpoint_address" {
  description = "Address of the replication group configuration endpoint when cluster mode is enabled"
  value       = try(aws_elasticache_replication_group.redis[0].configuration_endpoint_address, "")
}

output "redis_member_clusters" {
  description = "Identifiers of all the nodes that are part of this replication group"
  value       = try(aws_elasticache_replication_group.redis[0].member_clusters, [])
}

# Memcached Cluster Outputs
output "memcached_cluster_id" {
  description = "ID of the ElastiCache Memcached cluster"
  value       = try(aws_elasticache_cluster.memcached[0].id, "")
}

output "memcached_cluster_arn" {
  description = "ARN of the ElastiCache Memcached cluster"
  value       = try(aws_elasticache_cluster.memcached[0].arn, "")
}

output "memcached_cluster_address" {
  description = "DNS name of the cache cluster without the port appended"
  value       = try(aws_elasticache_cluster.memcached[0].cluster_address, "")
}

output "memcached_configuration_endpoint" {
  description = "Configuration endpoint to allow host discovery"
  value       = try(aws_elasticache_cluster.memcached[0].configuration_endpoint, "")
}

output "memcached_cache_nodes" {
  description = "List of node objects including id, address, port and availability_zone"
  value       = try(aws_elasticache_cluster.memcached[0].cache_nodes, [])
}

# Common Outputs
output "cluster_id" {
  description = "ID of the ElastiCache cluster"
  value       = var.engine == "redis" ? try(aws_elasticache_replication_group.redis[0].id, "") : try(aws_elasticache_cluster.memcached[0].id, "")
}

output "cluster_arn" {
  description = "ARN of the ElastiCache cluster"
  value       = var.engine == "redis" ? try(aws_elasticache_replication_group.redis[0].arn, "") : try(aws_elasticache_cluster.memcached[0].arn, "")
}

output "port" {
  description = "Port number on which each cache node accepts connections"
  value       = var.port
}

output "engine" {
  description = "Name of the cache engine"
  value       = var.engine
}

output "engine_version_actual" {
  description = "Running version of the cache engine"
  value       = var.engine == "redis" ? try(aws_elasticache_replication_group.redis[0].engine_version_actual, "") : try(aws_elasticache_cluster.memcached[0].engine_version_actual, "")
}

# Subnet Group
output "subnet_group_name" {
  description = "Name of the cache subnet group"
  value       = try(aws_elasticache_subnet_group.main[0].name, "")
}

output "subnet_group_description" {
  description = "Description of the cache subnet group"
  value       = try(aws_elasticache_subnet_group.main[0].description, "")
}

# Parameter Group
output "parameter_group_id" {
  description = "The ElastiCache parameter group name"
  value       = try(aws_elasticache_parameter_group.main[0].id, "")
}

output "parameter_group_arn" {
  description = "The AWS ARN associated with the parameter group"
  value       = try(aws_elasticache_parameter_group.main[0].arn, "")
}

# Security Group
output "security_group_id" {
  description = "ID of the security group"
  value       = try(aws_security_group.elasticache[0].id, "")
}

output "security_group_arn" {
  description = "ARN of the security group"
  value       = try(aws_security_group.elasticache[0].arn, "")
}

output "security_group_name" {
  description = "Name of the security group"
  value       = try(aws_security_group.elasticache[0].name, "")
}

# CloudWatch Alarms
output "cloudwatch_alarm_cpu_id" {
  description = "The ID of the CloudWatch CPU alarm"
  value       = try(aws_cloudwatch_metric_alarm.cpu_utilization[0].id, "")
}

output "cloudwatch_alarm_memory_id" {
  description = "The ID of the CloudWatch memory alarm"
  value       = try(aws_cloudwatch_metric_alarm.database_memory_usage[0].id, "")
}

output "cloudwatch_alarm_swap_id" {
  description = "The ID of the CloudWatch swap alarm"
  value       = try(aws_cloudwatch_metric_alarm.swap_usage[0].id, "")
}

output "cloudwatch_alarm_evictions_id" {
  description = "The ID of the CloudWatch evictions alarm (Redis only)"
  value       = try(aws_cloudwatch_metric_alarm.evictions[0].id, "")
}

# User Group and Users (Redis only)
output "user_group_id" {
  description = "The user group identifier"
  value       = try(aws_elasticache_user_group.main[0].id, "")
}

output "user_group_arn" {
  description = "The ARN that identifies the user group"
  value       = try(aws_elasticache_user_group.main[0].arn, "")
}

output "user_ids" {
  description = "Map of user IDs"
  value       = { for k, v in aws_elasticache_user.main : k => v.id }
}

output "user_arns" {
  description = "Map of user ARNs"
  value       = { for k, v in aws_elasticache_user.main : k => v.arn }
}

# Connection Information
output "connection_info" {
  description = "ElastiCache connection information"
  value = var.engine == "redis" ? {
    engine   = var.engine
    endpoint = try(aws_elasticache_replication_group.redis[0].primary_endpoint_address, "")
    port     = var.port
    reader_endpoint = try(aws_elasticache_replication_group.redis[0].reader_endpoint_address, "")
    configuration_endpoint = try(aws_elasticache_replication_group.redis[0].configuration_endpoint_address, "")
  } : {
    engine   = var.engine
    endpoint = try(aws_elasticache_cluster.memcached[0].cluster_address, "")
    port     = var.port
    configuration_endpoint = try(aws_elasticache_cluster.memcached[0].configuration_endpoint, "")
    cache_nodes = try(aws_elasticache_cluster.memcached[0].cache_nodes, [])
  }
}

# Redis-specific Connection String
output "redis_connection_string" {
  description = "Redis connection string"
  value       = var.engine == "redis" ? "redis://${try(aws_elasticache_replication_group.redis[0].primary_endpoint_address, "")}:${var.port}" : ""
}

# Memcached-specific Connection String
output "memcached_connection_string" {
  description = "Memcached connection string"
  value       = var.engine == "memcached" ? "${try(aws_elasticache_cluster.memcached[0].cluster_address, "")}:${var.port}" : ""
}