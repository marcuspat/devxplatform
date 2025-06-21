# DB Instance
output "db_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_status" {
  description = "The RDS instance status"
  value       = aws_db_instance.main.status
}

output "db_instance_name" {
  description = "The database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_instance_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_hosted_zone_id" {
  description = "The canonical hosted zone ID of the DB instance (to be used in a Route 53 Alias record)"
  value       = aws_db_instance.main.hosted_zone_id
}

output "db_instance_port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "db_instance_engine" {
  description = "The database engine"
  value       = aws_db_instance.main.engine
}

output "db_instance_engine_version" {
  description = "The running version of the database"
  value       = aws_db_instance.main.engine_version
}

output "db_instance_ca_cert_identifier" {
  description = "Specifies the identifier of the CA certificate for the DB instance"
  value       = aws_db_instance.main.ca_cert_identifier
}

output "db_instance_domain" {
  description = "The ID of the Directory Service Active Directory domain the instance is joined to"
  value       = aws_db_instance.main.domain
}

output "db_instance_domain_iam_role_name" {
  description = "The name of the IAM role to be used when making API calls to the Directory Service"
  value       = aws_db_instance.main.domain_iam_role_name
}

output "db_instance_allocated_storage" {
  description = "The amount of allocated storage"
  value       = aws_db_instance.main.allocated_storage
}

output "db_instance_storage_encrypted" {
  description = "Specifies whether the DB instance is encrypted"
  value       = aws_db_instance.main.storage_encrypted
}

output "db_instance_kms_key_id" {
  description = "The ARN for the KMS encryption key"
  value       = aws_db_instance.main.kms_key_id
}

output "db_instance_multi_az" {
  description = "If the RDS instance is multi AZ enabled"
  value       = aws_db_instance.main.multi_az
}

output "db_instance_availability_zone" {
  description = "The availability zone of the instance"
  value       = aws_db_instance.main.availability_zone
}

output "db_instance_backup_retention_period" {
  description = "The backup retention period"
  value       = aws_db_instance.main.backup_retention_period
}

output "db_instance_backup_window" {
  description = "The backup window"
  value       = aws_db_instance.main.backup_window
}

output "db_instance_maintenance_window" {
  description = "The instance maintenance window"
  value       = aws_db_instance.main.maintenance_window
}

output "db_instance_latest_restorable_time" {
  description = "The latest time, in UTC RFC3339 format, to which a database can be restored with point-in-time restore"
  value       = aws_db_instance.main.latest_restorable_time
}

output "db_instance_resource_id" {
  description = "The RDS Resource ID of this instance"
  value       = aws_db_instance.main.resource_id
}

output "db_instance_class" {
  description = "The RDS instance class"
  value       = aws_db_instance.main.instance_class
}

output "db_instance_performance_insights_enabled" {
  description = "True if Performance Insights is enabled, false otherwise"
  value       = aws_db_instance.main.performance_insights_enabled
}

output "db_instance_performance_insights_kms_key_id" {
  description = "The ARN for the KMS key to encrypt Performance Insights data"
  value       = aws_db_instance.main.performance_insights_kms_key_id
}

output "db_instance_monitoring_interval" {
  description = "The interval, in seconds, between points when Enhanced Monitoring metrics are collected"
  value       = aws_db_instance.main.monitoring_interval
}

output "db_instance_monitoring_role_arn" {
  description = "The ARN for the IAM role that permits RDS to send enhanced monitoring metrics to CloudWatch Logs"
  value       = aws_db_instance.main.monitoring_role_arn
}

# DB Subnet Group
output "db_subnet_group_id" {
  description = "The database subnet group name"
  value       = try(aws_db_subnet_group.main[0].id, "")
}

output "db_subnet_group_arn" {
  description = "The ARN of the database subnet group"
  value       = try(aws_db_subnet_group.main[0].arn, "")
}

# DB Parameter Group
output "db_parameter_group_id" {
  description = "The database parameter group name"
  value       = try(aws_db_parameter_group.main[0].id, "")
}

output "db_parameter_group_arn" {
  description = "The ARN of the database parameter group"
  value       = try(aws_db_parameter_group.main[0].arn, "")
}

# DB Option Group
output "db_option_group_id" {
  description = "The database option group name"
  value       = try(aws_db_option_group.main[0].id, "")
}

output "db_option_group_arn" {
  description = "The ARN of the database option group"
  value       = try(aws_db_option_group.main[0].arn, "")
}

# Security Group
output "security_group_id" {
  description = "The ID of the security group"
  value       = try(aws_security_group.rds[0].id, "")
}

output "security_group_arn" {
  description = "The ARN of the security group"
  value       = try(aws_security_group.rds[0].arn, "")
}

# Enhanced Monitoring
output "enhanced_monitoring_iam_role_name" {
  description = "The name of the monitoring role"
  value       = try(aws_iam_role.enhanced_monitoring[0].name, "")
}

output "enhanced_monitoring_iam_role_arn" {
  description = "The Amazon Resource Name (ARN) specifying the monitoring role"
  value       = try(aws_iam_role.enhanced_monitoring[0].arn, "")
}

# CloudWatch Log Groups
output "db_instance_cloudwatch_log_groups" {
  description = "Map of CloudWatch log groups created and their attributes"
  value       = aws_cloudwatch_log_group.rds
}

# Secrets Manager
output "db_instance_secret_arn" {
  description = "The ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "db_instance_secret_name" {
  description = "The name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_password.name
}

# Read Replica
output "db_replica_id" {
  description = "The RDS replica instance ID"
  value       = try(aws_db_instance.replica[0].id, "")
}

output "db_replica_arn" {
  description = "The ARN of the RDS replica instance"
  value       = try(aws_db_instance.replica[0].arn, "")
}

output "db_replica_endpoint" {
  description = "The RDS replica instance endpoint"
  value       = try(aws_db_instance.replica[0].endpoint, "")
}

output "db_replica_engine_version" {
  description = "The running version of the replica database"
  value       = try(aws_db_instance.replica[0].engine_version, "")
}

# CloudWatch Alarms
output "cloudwatch_alarm_cpu_id" {
  description = "The ID of the CloudWatch CPU alarm"
  value       = try(aws_cloudwatch_metric_alarm.database_cpu[0].id, "")
}

output "cloudwatch_alarm_disk_queue_id" {
  description = "The ID of the CloudWatch disk queue alarm"
  value       = try(aws_cloudwatch_metric_alarm.database_disk_queue[0].id, "")
}

output "cloudwatch_alarm_free_memory_id" {
  description = "The ID of the CloudWatch free memory alarm"
  value       = try(aws_cloudwatch_metric_alarm.database_free_memory[0].id, "")
}

output "cloudwatch_alarm_free_storage_space_id" {
  description = "The ID of the CloudWatch free storage space alarm"
  value       = try(aws_cloudwatch_metric_alarm.database_free_storage_space[0].id, "")
}

# Connection Information (for use with applications)
output "db_connection_string" {
  description = "Database connection string"
  value       = "postgresql://${aws_db_instance.main.username}:PASSWORD@${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "db_connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
    username = aws_db_instance.main.username
  }
  sensitive = true
}