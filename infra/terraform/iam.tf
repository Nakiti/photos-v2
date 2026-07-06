data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ---------------------------------------------------------------------------
# Execution role — used by the ECS agent to pull the image, read secrets, and
# write logs. NOT the app's identity.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow the agent to read the app secrets so it can inject them as env vars.
data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = local.secret_arns
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${local.name_prefix}-read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# ---------------------------------------------------------------------------
# Task role — the APP's runtime identity. The AWS SDK picks this up
# automatically (no AWS_ACCESS_KEY_ID needed), granting S3 access to the media
# bucket only.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "task_s3" {
  statement {
    sid     = "ObjectAccess"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${var.s3_bucket_name}/*"]
  }
  statement {
    sid       = "BucketAccess"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = ["arn:aws:s3:::${var.s3_bucket_name}"]
  }
}

resource "aws_iam_role_policy" "task_s3" {
  name   = "${local.name_prefix}-s3-access"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task_s3.json
}
