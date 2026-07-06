resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name_prefix}-db" }
}

resource "random_password" "db" {
  length  = 32
  special = false # keep the password URL-safe for DATABASE_URL
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-mysql"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2 # storage autoscaling headroom
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "focal"
  username = "focal_admin"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false # beta: single-AZ. Flip to true for production.

  backup_retention_period = 7 # daily automated backups, 7-day window
  deletion_protection     = false
  skip_final_snapshot     = true # beta convenience; set false + final_snapshot_identifier for prod

  apply_immediately = true

  tags = { Name = "${local.name_prefix}-mysql" }
}
