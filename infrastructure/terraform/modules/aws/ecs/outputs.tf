output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "service_id" {
  description = "The ID of the ECS service"
  value       = aws_ecs_service.app.id
}

output "service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "task_definition_arn" {
  description = "The ARN of the task definition"
  value       = aws_ecs_task_definition.app.arn
}

output "task_definition_family" {
  description = "The family of the task definition"
  value       = aws_ecs_task_definition.app.family
}

output "task_definition_revision" {
  description = "The revision of the task definition"
  value       = aws_ecs_task_definition.app.revision
}

output "execution_role_arn" {
  description = "The ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "task_role_arn" {
  description = "The ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

output "security_group_id" {
  description = "The ID of the ECS service security group"
  value       = aws_security_group.ecs_service.id
}

output "cloudwatch_log_group_name" {
  description = "The name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.name
}

output "cloudwatch_log_group_arn" {
  description = "The ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.arn
}

output "service_discovery_arn" {
  description = "The ARN of the service discovery service"
  value       = var.enable_service_discovery ? aws_service_discovery_service.app[0].arn : null
}

output "autoscaling_target_id" {
  description = "The ID of the autoscaling target"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.ecs[0].id : null
}

output "autoscaling_policy_cpu_arn" {
  description = "The ARN of the CPU autoscaling policy"
  value       = var.enable_autoscaling ? aws_appautoscaling_policy.cpu[0].arn : null
}

output "autoscaling_policy_memory_arn" {
  description = "The ARN of the memory autoscaling policy"
  value       = var.enable_autoscaling ? aws_appautoscaling_policy.memory[0].arn : null
}