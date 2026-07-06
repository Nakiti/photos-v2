output "alb_dns_name" {
  description = "Public DNS name of the load balancer — point your app / a CNAME here."
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "ECR repo to push the backend image to (used by CD)."
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "task_definition_family" {
  value = aws_ecs_task_definition.backend.family
}

output "db_endpoint" {
  description = "RDS endpoint (host:port). The full DATABASE_URL is in Secrets Manager."
  value       = aws_db_instance.main.endpoint
}

output "redis_primary_endpoint" {
  description = "ElastiCache primary endpoint. The full REDIS_URL is in Secrets Manager."
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "log_group" {
  value = aws_cloudwatch_log_group.backend.name
}
