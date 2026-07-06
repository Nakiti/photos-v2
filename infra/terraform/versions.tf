terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # For a real deployment, configure a remote backend (S3 + DynamoDB lock) here
  # so state is shared and not lost. Left local for the initial bring-up.
  # backend "s3" {
  #   bucket         = "focal-tfstate"
  #   key            = "backend/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "focal-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
