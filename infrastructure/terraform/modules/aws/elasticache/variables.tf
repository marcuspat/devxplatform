# Cluster Configuration
variable "cluster_id" {
  description = "The cluster identifier"
  type        = string
}

variable "description" {
  description = "The description of the replication group"
  type        = string
  default     = "ElastiCache cluster"
}

variable "engine" {
  description = "The name of the cache engine to be used (redis or memcached)"
  type        = string
  default     = "redis"
  validation {
    condition     = contains(["redis", "memcached"], var.engine)
    error_message = "Engine must be either 'redis' or 'memcached'."
  }
}

variable "engine_version" {
  description = "Version number of the cache engine to be used"
  type        = string
  default     = "7.0"
}

variable "node_type" {
  description = "The compute and memory capacity of the nodes"
  type        = string
  default     = "cache.t3.micro"
}

variable "port" {
  description = "The port number on which each of the cache nodes will accept connections"
  type        = number
  default     = 6379
}

# Redis Configuration
variable "num_cache_clusters" {
  description = "Number of cache clusters (primary and replicas) this replication group will have"
  type        = number
  default     = 1
}

variable "num_node_groups" {
  description = "Number of node groups (shards) for this Redis replication group"
  type        = number
  default     = null
}

variable "replicas_per_node_group" {
  description = "Number of replica nodes in each node group"
  type        = number
  default     = null
}

variable "automatic_failover_enabled" {
  description = "Specifies whether a read-only replica will be automatically promoted to read/write primary if the existing primary fails"
  type        = bool
  default     = false
}

variable "multi_az_enabled" {
  description = "Specifies whether to enable Multi-AZ Support for the replication group"
  type        = bool
  default     = false
}

# Memcached Configuration
variable "num_cache_nodes" {
  description = "The initial number of cache nodes that the cache cluster will have"
  type        = number
  default     = 1
}

variable "preferred_availability_zones" {
  description = "List of the Availability Zones in which cache nodes are created"
  type        = list(string)
  default     = null
}

variable "preferred_cache_cluster_azs" {
  description = "List of EC2 availability zones in which the replication group's cache clusters will be created"
  type        = list(string)
  default     = null
}

# Network Configuration
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of VPC subnet IDs"
  type        = list(string)
  default     = []
}

variable "subnet_group_name" {
  description = "Name of the cache subnet group to be used for the replication group"
  type        = string
  default     = ""
}

variable "create_subnet_group" {
  description = "Whether to create a cache subnet group"
  type        = bool
  default     = true
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
  default     = []
}

variable "create_security_group" {
  description = "Whether to create a security group for ElastiCache"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "A list of CIDR blocks which are allowed to access the cache cluster"
  type        = list(string)
  default     = []
}

variable "allowed_security_groups" {
  description = "A list of Security Group IDs to allow access to the cache cluster"
  type        = list(string)
  default     = []
}

# Parameter Group Configuration
variable "parameter_group_name" {
  description = "Name of the parameter group to associate with this cache cluster"
  type        = string
  default     = ""
}

variable "create_parameter_group" {
  description = "Whether to create a parameter group"
  type        = bool
  default     = true
}

variable "parameter_group_family" {
  description = "The family of the ElastiCache parameter group"
  type        = string
  default     = "redis7.x"
}

variable "parameter_group_description" {
  description = "The description of the ElastiCache parameter group"
  type        = string
  default     = "ElastiCache parameter group"
}

variable "parameters" {
  description = "A list of ElastiCache parameters to apply"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

# Backup Configuration
variable "snapshot_retention_limit" {
  description = "The number of days for which ElastiCache will retain automatic cache cluster snapshots"
  type        = number
  default     = 5
}

variable "snapshot_window" {
  description = "The daily time range during which automated backups are created"
  type        = string
  default     = "05:00-09:00"
}

variable "final_snapshot_identifier" {
  description = "The name of your final cluster snapshot"
  type        = string
  default     = null
}

# Maintenance Configuration
variable "maintenance_window" {
  description = "The weekly time range for when maintenance on the cache cluster is performed"
  type        = string
  default     = "sun:05:00-sun:09:00"
}

variable "auto_minor_version_upgrade" {
  description = "Specifies whether minor version engine upgrades will be applied automatically during the maintenance window"
  type        = bool
  default     = true
}

# Encryption Configuration
variable "at_rest_encryption_enabled" {
  description = "Whether to enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Whether to enable encryption in transit"
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "The password used to access a password protected server"
  type        = string
  default     = null
  sensitive   = true
}

variable "kms_key_id" {
  description = "The ARN of the key that you wish to use if encrypting at rest"
  type        = string
  default     = null
}

# Logging Configuration
variable "redis_slow_log_destination" {
  description = "Name of the CloudWatch Logs destination for slow logs"
  type        = string
  default     = ""
}

variable "redis_slow_log_destination_type" {
  description = "For CloudWatch Logs use cloudwatch-logs"
  type        = string
  default     = "cloudwatch-logs"
}

variable "redis_slow_log_format" {
  description = "Valid values are json or text"
  type        = string
  default     = "text"
}

# Notification Configuration
variable "notification_topic_arn" {
  description = "An Amazon Resource Name (ARN) of an SNS topic to send ElastiCache notifications to"
  type        = string
  default     = null
}

# Data Tiering
variable "data_tiering_enabled" {
  description = "Enables data tiering"
  type        = bool
  default     = false
}

# Global Datastore
variable "global_replication_group_id" {
  description = "The ID of the global replication group to which this replication group should belong"
  type        = string
  default     = null
}

# User Group and Authentication
variable "create_user_group" {
  description = "Whether to create a user group for Redis AUTH"
  type        = bool
  default     = false
}

variable "redis_users" {
  description = "Map of Redis users"
  type = map(object({
    user_name     = string
    access_string = string
    passwords     = list(string)
  }))
  default = {}
}

# CloudWatch Alarms
variable "create_cloudwatch_alarms" {
  description = "Whether to create CloudWatch alarms"
  type        = bool
  default     = false
}

variable "alarm_actions" {
  description = "The list of actions to execute when this alarm transitions to the ALARM state"
  type        = list(string)
  default     = []
}

variable "cpu_threshold" {
  description = "The maximum percentage of CPU utilization"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "The maximum percentage of memory utilization"
  type        = number
  default     = 80
}

variable "swap_threshold" {
  description = "The maximum amount of swap usage in bytes"
  type        = number
  default     = 50000000 # 50MB
}

variable "evictions_threshold" {
  description = "The maximum number of evictions"
  type        = number
  default     = 10
}

# Tags
variable "tags" {
  description = "A mapping of tags to assign to the resource"
  type        = map(string)
  default     = {}
}