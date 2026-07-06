# Focal backend — AWS ECS Fargate (Terraform)

Beta-sized, cost-conscious infrastructure for the Focal backend:

- **VPC** — 2 public + 2 private subnets across 2 AZs, no NAT gateway (Fargate
  tasks run in public subnets with a public IP for egress; still firewalled to
  the ALB via security groups). RDS/Redis sit in the private subnets.
- **ECS Fargate** — one service, one task (API + in-process BullMQ worker).
- **RDS MySQL 8** — single-AZ `db.t3.micro`, 7-day automated backups.
- **ElastiCache Redis 7** — single node, TLS + AUTH token.
- **ALB** — HTTP (optionally HTTPS with an ACM cert); health check on `/health`.
- **ECR** — image repo (keeps last 10 images).
- **IAM** — a **task role** (app's S3 identity, no static keys) and an
  **execution role** (pull image + read secrets + write logs).
- **Secrets Manager** — `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and optional
  `FIREBASE_SERVICE_ACCOUNT_JSON` / `SENTRY_DSN`, injected as env vars.
- **CloudWatch Logs** — `/ecs/focal-beta-backend`.

> The S3 media bucket + CloudFront are **not** created here — you already have
> them. Pass the bucket name via `s3_bucket_name`; the task role is granted
> access to it.

## Prerequisites

- Terraform ≥ 1.5, AWS CLI, credentials with permission to create the above.
- An existing S3 media bucket (and ideally CloudFront) in the same region.
- The Firebase service-account JSON, base64-encoded, if you want push.

## First bring-up

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill it in
terraform init
terraform apply
```

`apply` completes without a running task (no image exists yet — the service is
created with `wait_for_steady_state = false`). Then push the first image and run
migrations:

```bash
# outputs you'll need:
terraform output ecr_repository_url
terraform output ecs_cluster_name
terraform output ecs_service_name

# build + push (from repo root):
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <ecr_repo_url>
docker build -t <ecr_repo_url>:latest ./backend
docker push <ecr_repo_url>:latest

# apply DB migrations as a one-off task (see below), then:
aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment
```

After this, the **GitHub Actions CD workflow** (`.github/workflows/deploy.yml`)
takes over image builds and deploys on every push to `main`.

## Running migrations

Migrations run as a **one-off ECS task** (not on container start), so multiple
replicas never race. The CD workflow does this automatically; to run manually:

```bash
aws ecs run-task \
  --cluster <cluster> \
  --task-definition <task_definition_family> \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<public-subnet-ids>],securityGroups=[<ecs-sg-id>],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"focal-backend","command":["npm","run","migrate:deploy"]}]}'
```

## Notes / production hardening

- **State**: uncomment the S3 backend in `versions.tf` and create the bucket +
  lock table before real use, so state isn't local-only.
- **HTTPS**: pass `certificate_arn` (an ACM cert in this region) to add a 443
  listener + HTTP→HTTPS redirect. Point a Route53 record at `alb_dns_name`.
- **Production sizing**: set `multi_az = true` on RDS, raise `desired_count`,
  add autoscaling, and set `skip_final_snapshot = false`.
- **Costs (beta, us-east-1, rough)**: Fargate 0.5vCPU/1GB ≈ $18/mo, RDS
  t3.micro ≈ $13/mo, ElastiCache t3.micro ≈ $12/mo, ALB ≈ $16/mo. No NAT
  gateway by design.
