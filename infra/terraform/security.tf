# ALB — public HTTP(S) ingress.
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "ALB ingress from the internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  dynamic "ingress" {
    for_each = var.certificate_arn == "" ? [] : [1]
    content {
      description = "HTTPS"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-alb" }
}

# ECS tasks — only reachable from the ALB, on the app port.
resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs"
  description = "Fargate tasks; ingress only from the ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from ALB"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-ecs" }
}

# RDS — only reachable from the ECS tasks.
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds"
  description = "MySQL; ingress only from ECS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from ECS"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = { Name = "${local.name_prefix}-rds" }
}

# ElastiCache Redis — only reachable from the ECS tasks.
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis"
  description = "Redis; ingress only from ECS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = { Name = "${local.name_prefix}-redis" }
}
