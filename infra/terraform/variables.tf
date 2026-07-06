variable "aws_region" {
  description = "AWS region to deploy into. Keep it in the same region as your S3 bucket."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name, used as a prefix for resource names."
  type        = string
  default     = "focal"
}

variable "environment" {
  description = "Environment name (beta, staging, production)."
  type        = string
  default     = "beta"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

# ---------------------------------------------------------------------------
# Application configuration (non-secret env for the container)
# ---------------------------------------------------------------------------

variable "image_tag" {
  description = "ECR image tag the ECS service runs. The CD pipeline pushes and updates this; 'latest' is fine for the first bring-up."
  type        = string
  default     = "latest"
}

variable "allowed_origins" {
  description = "Comma-separated CORS allow-list (ALLOWED_ORIGINS). Required by the app in production."
  type        = string
  default     = "*"
}

variable "s3_bucket_name" {
  description = "Name of the EXISTING S3 bucket the app stores media in (AWS_S3_BUCKET). The task role is granted access to it."
  type        = string
}

variable "cloudfront_base_url" {
  description = "CloudFront base URL for media (CLOUDFRONT_BASE_URL). Optional; falls back to direct S3 URLs if empty."
  type        = string
  default     = ""
}

variable "log_level" {
  description = "pino LOG_LEVEL."
  type        = string
  default     = "info"
}

# ---------------------------------------------------------------------------
# Secrets (stored in Secrets Manager, injected into the container)
# ---------------------------------------------------------------------------

variable "firebase_service_account_json_base64" {
  description = "base64 of the Firebase service-account JSON (FIREBASE_SERVICE_ACCOUNT_JSON). Leave empty to disable push notifications."
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Backend Sentry DSN (SENTRY_DSN). Leave empty to disable error tracking."
  type        = string
  default     = ""
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Sizing (beta defaults — small + cheap)
# ---------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS MySQL instance class."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB."
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type."
  type        = string
  default     = "cache.t3.micro"
}

variable "container_cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)."
  type        = number
  default     = 512
}

variable "container_memory" {
  description = "Fargate task memory in MB."
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Number of ECS tasks. 1 for beta."
  type        = number
  default     = 1
}

# ---------------------------------------------------------------------------
# HTTPS (optional). Provide an ACM certificate ARN (in this region) to enable a
# 443 listener + HTTP->HTTPS redirect. Leave empty for HTTP-only beta.
# ---------------------------------------------------------------------------

variable "certificate_arn" {
  description = "ACM certificate ARN for the ALB HTTPS listener. Empty = HTTP only."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC deploy role (optional). Set github_repo to "owner/repo"
# to provision an IAM role the CD workflow can assume with no static keys.
# ---------------------------------------------------------------------------

variable "github_repo" {
  description = "GitHub repo (owner/repo) allowed to assume the deploy role. Empty = don't create the deploy role."
  type        = string
  default     = ""
}

variable "github_oidc_provider_arn" {
  description = "ARN of an existing GitHub OIDC provider to reuse. Empty = create one (an account can only have a single provider for this URL)."
  type        = string
  default     = ""
}
