# Optional: an IAM role GitHub Actions assumes via OIDC to deploy (no static
# keys). Enabled only when var.github_repo is set. Put the output role ARN into
# the repo secret AWS_DEPLOY_ROLE_ARN.

locals {
  enable_github_oidc   = var.github_repo != ""
  create_oidc_provider = local.enable_github_oidc && var.github_oidc_provider_arn == ""
  oidc_provider_arn = local.create_oidc_provider ? (
    length(aws_iam_openid_connect_provider.github) > 0 ? aws_iam_openid_connect_provider.github[0].arn : ""
  ) : var.github_oidc_provider_arn
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = local.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume" {
  count = local.enable_github_oidc ? 1 : 0

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  count              = local.enable_github_oidc ? 1 : 0
  name               = "${local.name_prefix}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume[0].json
}

data "aws_iam_policy_document" "github_deploy" {
  count = local.enable_github_oidc ? 1 : 0

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }

  statement {
    sid = "EcsDeploy"
    actions = [
      "ecs:RegisterTaskDefinition",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeServices",
      "ecs:UpdateService",
      "ecs:RunTask",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
    ]
    resources = ["*"]
  }

  # ECS needs to pass the task/execution roles when registering/running tasks.
  statement {
    sid       = "PassRoles"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.task.arn, aws_iam_role.execution.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  count  = local.enable_github_oidc ? 1 : 0
  name   = "${local.name_prefix}-github-deploy"
  role   = aws_iam_role.github_deploy[0].id
  policy = data.aws_iam_policy_document.github_deploy[0].json
}

output "github_deploy_role_arn" {
  description = "Put this into the GitHub repo secret AWS_DEPLOY_ROLE_ARN."
  value       = local.enable_github_oidc ? aws_iam_role.github_deploy[0].arn : ""
}
