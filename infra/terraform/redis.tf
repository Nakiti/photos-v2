resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis"
  subnet_ids = aws_subnet.private[*].id
}

# Redis AUTH token. ElastiCache requires 16-128 chars; keep it to a URL-safe set
# so it embeds cleanly in REDIS_URL.
resource "random_password" "redis" {
  length  = 48
  special = false
}

# Replication group (not aws_elasticache_cluster) because in-transit encryption
# + AUTH token require it. Single node, cluster-mode disabled — the beta shape.
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "${local.name_prefix} redis"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = var.redis_node_type
  port           = 6379

  num_cache_clusters = 1

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # The app builds rediss:// (TLS) URLs — transit encryption + AUTH must be on.
  transit_encryption_enabled = true
  auth_token                 = random_password.redis.result

  automatic_failover_enabled = false # single node
  apply_immediately          = true

  tags = { Name = "${local.name_prefix}-redis" }
}
