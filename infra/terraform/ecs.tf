resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
}

locals {
  container_name = "${var.project}-backend"

  # Non-secret environment. Secrets are injected separately (see below).
  container_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "4000" },
    { name = "LOG_LEVEL", value = var.log_level },
    { name = "ALLOWED_ORIGINS", value = var.allowed_origins },
    { name = "TRUST_PROXY", value = "1" }, # single ALB hop in front of the app
    { name = "AWS_REGION", value = var.aws_region },
    { name = "AWS_S3_BUCKET", value = var.s3_bucket_name },
    { name = "CLOUDFRONT_BASE_URL", value = var.cloudfront_base_url },
    # NOTE: AWS_ACCESS_KEY_ID / SECRET are intentionally absent — the app uses
    # the ECS task role for S3 (see libs/s3.ts).
  ]
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = local.container_name
      image     = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"
      essential = true

      portMappings = [{ containerPort = 4000, protocol = "tcp" }]

      environment = local.container_environment
      secrets     = local.container_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      # Mirrors the Dockerfile HEALTHCHECK (liveness).
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 20
      }
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Don't block `terraform apply` waiting for a healthy task — on first bring-up
  # no image exists in ECR yet. Push an image (CD) and the service converges.
  wait_for_steady_state = false

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true # required for egress (ECR/S3/Secrets) without a NAT
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = local.container_name
    container_port   = 4000
  }

  # The CD pipeline registers new task-definition revisions and updates the
  # service. Ignore those fields so a later `terraform apply` doesn't revert the
  # deployed image or scale.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
}
