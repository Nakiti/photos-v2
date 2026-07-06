# Application secrets live in Secrets Manager and are injected into the container
# as environment variables (see ecs.tf `secrets`). Nothing sensitive is baked
# into the task definition or the image.

resource "random_password" "jwt" {
  length  = 64
  special = false
}

locals {
  database_url = "mysql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  redis_url    = "rediss://default:${random_password.redis.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"

  # recovery_window_in_days=0 lets a destroyed secret be recreated immediately
  # (convenient for a beta you may tear down/rebuild). Raise it for production.
  secret_recovery_days = 0
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${local.name_prefix}/DATABASE_URL"
  recovery_window_in_days = local.secret_recovery_days
}
resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "${local.name_prefix}/REDIS_URL"
  recovery_window_in_days = local.secret_recovery_days
}
resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = local.redis_url
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name_prefix}/JWT_SECRET"
  recovery_window_in_days = local.secret_recovery_days
}
resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt.result
}

# Optional secrets — only created when a value is supplied.
resource "aws_secretsmanager_secret" "firebase" {
  count                   = var.firebase_service_account_json_base64 == "" ? 0 : 1
  name                    = "${local.name_prefix}/FIREBASE_SERVICE_ACCOUNT_JSON"
  recovery_window_in_days = local.secret_recovery_days
}
resource "aws_secretsmanager_secret_version" "firebase" {
  count         = var.firebase_service_account_json_base64 == "" ? 0 : 1
  secret_id     = aws_secretsmanager_secret.firebase[0].id
  secret_string = var.firebase_service_account_json_base64
}

resource "aws_secretsmanager_secret" "sentry" {
  count                   = var.sentry_dsn == "" ? 0 : 1
  name                    = "${local.name_prefix}/SENTRY_DSN"
  recovery_window_in_days = local.secret_recovery_days
}
resource "aws_secretsmanager_secret_version" "sentry" {
  count         = var.sentry_dsn == "" ? 0 : 1
  secret_id     = aws_secretsmanager_secret.sentry[0].id
  secret_string = var.sentry_dsn
}

locals {
  # Secrets wired into the container as `name -> valueFrom(ARN)`.
  container_secrets = concat(
    [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
      { name = "REDIS_URL", valueFrom = aws_secretsmanager_secret.redis_url.arn },
      { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
    ],
    var.firebase_service_account_json_base64 == "" ? [] : [
      { name = "FIREBASE_SERVICE_ACCOUNT_JSON", valueFrom = aws_secretsmanager_secret.firebase[0].arn }
    ],
    var.sentry_dsn == "" ? [] : [
      { name = "SENTRY_DSN", valueFrom = aws_secretsmanager_secret.sentry[0].arn }
    ],
  )

  # ARNs the execution role is allowed to read.
  secret_arns = concat(
    [
      aws_secretsmanager_secret.database_url.arn,
      aws_secretsmanager_secret.redis_url.arn,
      aws_secretsmanager_secret.jwt_secret.arn,
    ],
    var.firebase_service_account_json_base64 == "" ? [] : [aws_secretsmanager_secret.firebase[0].arn],
    var.sentry_dsn == "" ? [] : [aws_secretsmanager_secret.sentry[0].arn],
  )
}
