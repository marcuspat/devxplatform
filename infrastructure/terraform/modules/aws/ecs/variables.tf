# Cluster Configuration
variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for the cluster"
  type        = bool
  default     = true
}

variable "enable_fargate" {
  description = "Enable Fargate capacity provider"
  type        = bool
  default     = true
}

variable "enable_ec2" {
  description = "Enable EC2 capacity provider"
  type        = bool
  default     = false
}

variable "autoscaling_group_arn" {
  description = "ARN of the Auto Scaling Group for EC2 capacity provider"
  type        = string
  default     = ""
}

variable "default_capacity_provider_strategy" {
  description = "Default capacity provider strategy"
  type = list(object({
    capacity_provider = string
    weight            = number
    base              = number
  }))
  default = [
    {
      capacity_provider = "FARGATE"
      weight            = 1
      base              = 0
    }
  ]
}

# Capacity Provider Configuration
variable "target_capacity" {
  description = "Target capacity for EC2 capacity provider"
  type        = number
  default     = 100
}

variable "minimum_scaling_step_size" {
  description = "Minimum scaling step size for EC2 capacity provider"
  type        = number
  default     = 1
}

variable "maximum_scaling_step_size" {
  description = "Maximum scaling step size for EC2 capacity provider"
  type        = number
  default     = 10
}

variable "instance_warmup_period" {
  description = "Instance warmup period in seconds"
  type        = number
  default     = 300
}

# Service Configuration
variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 3
}

variable "launch_type" {
  description = "Launch type for the service (FARGATE or EC2)"
  type        = string
  default     = "FARGATE"
}

variable "capacity_provider_strategy" {
  description = "Capacity provider strategy for the service"
  type = list(object({
    capacity_provider = string
    weight           = number
    base             = number
  }))
  default = []
}

# Task Definition Configuration
variable "task_cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "Memory for the task in MB"
  type        = string
  default     = "512"
}

variable "operating_system_family" {
  description = "Operating system family for the task"
  type        = string
  default     = "LINUX"
}

variable "cpu_architecture" {
  description = "CPU architecture for the task"
  type        = string
  default     = "X86_64"
}

# Container Configuration
variable "container_name" {
  description = "Name of the container"
  type        = string
}

variable "container_image" {
  description = "Docker image for the container"
  type        = string
}

variable "container_cpu" {
  description = "CPU units for the container"
  type        = number
  default     = null
}

variable "container_memory" {
  description = "Memory for the container in MB"
  type        = number
  default     = null
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 8080
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "Secrets from AWS Systems Manager Parameter Store or Secrets Manager"
  type        = map(string)
  default     = {}
}

# Health Check Configuration
variable "enable_health_check" {
  description = "Enable container health check"
  type        = bool
  default     = true
}

variable "health_check_command" {
  description = "Health check command"
  type        = list(string)
  default     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "health_check_retries" {
  description = "Health check retries"
  type        = number
  default     = 3
}

variable "health_check_start_period" {
  description = "Health check start period in seconds"
  type        = number
  default     = 60
}

variable "health_check_grace_period" {
  description = "Health check grace period for the service in seconds"
  type        = number
  default     = 60
}

# Mount Points and Volumes
variable "mount_points" {
  description = "Mount points for the container"
  type = list(object({
    source_volume  = string
    container_path = string
    read_only      = bool
  }))
  default = []
}

variable "volumes" {
  description = "Volumes for the task definition"
  type = list(object({
    name = string
    efs_volume_configuration = optional(object({
      file_system_id          = string
      root_directory          = string
      transit_encryption_port = number
      authorization_config = optional(object({
        access_point_id = string
        iam            = string
      }))
    }))
  }))
  default = []
}

variable "tmpfs_mounts" {
  description = "Tmpfs mounts for the container"
  type = list(object({
    container_path = string
    size          = number
    mount_options = list(string)
  }))
  default = []
}

# Container Configuration
variable "ulimits" {
  description = "Container ulimits"
  type = list(object({
    name      = string
    hardLimit = number
    softLimit = number
  }))
  default = []
}

variable "enable_init_process" {
  description = "Enable init process for the container"
  type        = bool
  default     = true
}

variable "container_dependencies" {
  description = "Container dependencies"
  type = list(object({
    containerName = string
    condition     = string
  }))
  default = []
}

# Networking Configuration
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the service"
  type        = list(string)
}

variable "security_group_ingress_rules" {
  description = "Security group ingress rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = []
}

# Load Balancer Configuration
variable "enable_load_balancer" {
  description = "Enable load balancer for the service"
  type        = bool
  default     = false
}

variable "target_group_arn" {
  description = "Target group ARN for the load balancer"
  type        = string
  default     = ""
}

# Service Discovery Configuration
variable "enable_service_discovery" {
  description = "Enable service discovery"
  type        = bool
  default     = false
}

variable "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  type        = string
  default     = ""
}

# Deployment Configuration
variable "deployment_maximum_percent" {
  description = "Maximum percent of tasks to run during deployment"
  type        = number
  default     = 200
}

variable "deployment_minimum_healthy_percent" {
  description = "Minimum healthy percent of tasks during deployment"
  type        = number
  default     = 100
}

variable "enable_circuit_breaker" {
  description = "Enable deployment circuit breaker"
  type        = bool
  default     = true
}

variable "enable_circuit_breaker_rollback" {
  description = "Enable automatic rollback on deployment failure"
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = true
}

# Auto Scaling Configuration
variable "enable_autoscaling" {
  description = "Enable auto scaling for the service"
  type        = bool
  default     = true
}

variable "autoscaling_min_capacity" {
  description = "Minimum number of tasks for auto scaling"
  type        = number
  default     = 2
}

variable "autoscaling_max_capacity" {
  description = "Maximum number of tasks for auto scaling"
  type        = number
  default     = 10
}

variable "autoscaling_cpu_target" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_memory_target" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80
}

variable "autoscaling_scale_in_cooldown" {
  description = "Scale in cooldown period in seconds"
  type        = number
  default     = 300
}

variable "autoscaling_scale_out_cooldown" {
  description = "Scale out cooldown period in seconds"
  type        = number
  default     = 60
}

# Logging Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}