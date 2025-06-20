terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = merge(var.tags, {
    Name = var.cluster_name
  })
}

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = concat(
    var.enable_fargate ? ["FARGATE", "FARGATE_SPOT"] : [],
    var.enable_ec2 ? [aws_ecs_capacity_provider.ec2[0].name] : []
  )

  dynamic "default_capacity_provider_strategy" {
    for_each = var.default_capacity_provider_strategy
    content {
      capacity_provider = default_capacity_provider_strategy.value.capacity_provider
      weight            = default_capacity_provider_strategy.value.weight
      base              = default_capacity_provider_strategy.value.base
    }
  }
}

# EC2 Capacity Provider (optional)
resource "aws_ecs_capacity_provider" "ec2" {
  count = var.enable_ec2 ? 1 : 0
  name  = "${var.cluster_name}-ec2"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = var.autoscaling_group_arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = var.target_capacity
      minimum_scaling_step_size = var.minimum_scaling_step_size
      maximum_scaling_step_size = var.maximum_scaling_step_size
      instance_warmup_period    = var.instance_warmup_period
    }
  }

  tags = var.tags
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = var.launch_type == "FARGATE" ? ["FARGATE"] : ["EC2", "FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = var.container_name
      image = var.container_image

      cpu    = var.container_cpu
      memory = var.container_memory

      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = var.environment_variables

      secrets = [
        for key, value in var.secrets : {
          name      = key
          valueFrom = value
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = var.enable_health_check ? {
        command     = var.health_check_command
        interval    = var.health_check_interval
        timeout     = var.health_check_timeout
        retries     = var.health_check_retries
        startPeriod = var.health_check_start_period
      } : null

      mountPoints = [
        for mount in var.mount_points : {
          sourceVolume  = mount.source_volume
          containerPath = mount.container_path
          readOnly      = mount.read_only
        }
      ]

      ulimits = var.ulimits

      linuxParameters = {
        initProcessEnabled = var.enable_init_process
        
        tmpfs = [
          for tmpfs in var.tmpfs_mounts : {
            containerPath = tmpfs.container_path
            size          = tmpfs.size
            mountOptions  = tmpfs.mount_options
          }
        ]
      }

      dependsOn = var.container_dependencies
    }
  ])

  dynamic "volume" {
    for_each = var.volumes
    content {
      name = volume.value.name

      dynamic "efs_volume_configuration" {
        for_each = volume.value.efs_volume_configuration != null ? [volume.value.efs_volume_configuration] : []
        content {
          file_system_id          = efs_volume_configuration.value.file_system_id
          root_directory          = efs_volume_configuration.value.root_directory
          transit_encryption      = "ENABLED"
          transit_encryption_port = efs_volume_configuration.value.transit_encryption_port

          dynamic "authorization_config" {
            for_each = efs_volume_configuration.value.authorization_config != null ? [efs_volume_configuration.value.authorization_config] : []
            content {
              access_point_id = authorization_config.value.access_point_id
              iam             = authorization_config.value.iam
            }
          }
        }
      }
    }
  }

  runtime_platform {
    operating_system_family = var.operating_system_family
    cpu_architecture       = var.cpu_architecture
  }

  tags = var.tags
}

# ECS Service
resource "aws_ecs_service" "app" {
  name    = var.service_name
  cluster = aws_ecs_cluster.main.id
  
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  launch_type = var.launch_type == "FARGATE" ? "FARGATE" : null

  dynamic "capacity_provider_strategy" {
    for_each = var.capacity_provider_strategy
    content {
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight           = capacity_provider_strategy.value.weight
      base             = capacity_provider_strategy.value.base
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = var.enable_load_balancer ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.container_name
      container_port   = var.container_port
    }
  }

  dynamic "service_registries" {
    for_each = var.enable_service_discovery ? [1] : []
    content {
      registry_arn = aws_service_discovery_service.app[0].arn
    }
  }

  deployment_configuration {
    maximum_percent         = var.deployment_maximum_percent
    minimum_healthy_percent = var.deployment_minimum_healthy_percent

    deployment_circuit_breaker {
      enable   = var.enable_circuit_breaker
      rollback = var.enable_circuit_breaker_rollback
    }
  }

  enable_ecs_managed_tags = true
  enable_execute_command  = var.enable_execute_command

  health_check_grace_period_seconds = var.health_check_grace_period

  propagate_tags = "TASK_DEFINITION"

  tags = var.tags

  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution,
    aws_iam_role_policy_attachment.ecs_task
  ]
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU-based Auto Scaling
resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.service_name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.autoscaling_cpu_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Memory-based Auto Scaling
resource "aws_appautoscaling_policy" "memory" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.service_name}-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.autoscaling_memory_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.cluster_name}/${var.service_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/${var.cluster_name}/exec"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# Security Group
resource "aws_security_group" "ecs_service" {
  name_prefix = "${var.service_name}-ecs-"
  description = "Security group for ECS service ${var.service_name}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.service_name}-ecs"
  })
}

# Security Group Rules
resource "aws_security_group_rule" "ecs_ingress" {
  count = length(var.security_group_ingress_rules)

  type              = "ingress"
  from_port         = var.security_group_ingress_rules[count.index].from_port
  to_port           = var.security_group_ingress_rules[count.index].to_port
  protocol          = var.security_group_ingress_rules[count.index].protocol
  cidr_blocks       = var.security_group_ingress_rules[count.index].cidr_blocks
  security_group_id = aws_security_group.ecs_service.id
}

resource "aws_security_group_rule" "ecs_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ecs_service.id
}

# Service Discovery (optional)
resource "aws_service_discovery_service" "app" {
  count = var.enable_service_discovery ? 1 : 0

  name = var.service_name

  dns_config {
    namespace_id = var.service_discovery_namespace_id

    dns_records {
      ttl  = 60
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Data sources
data "aws_region" "current" {}

data "aws_caller_identity" "current" {}