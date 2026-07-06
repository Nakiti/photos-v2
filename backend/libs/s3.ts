import { S3Client } from '@aws-sdk/client-s3';
import config from '../config/config.js';

// Shared S3 client for the whole backend.
//
// Credentials resolution: when explicit AWS keys are present (local dev, via
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) we pass them through. When they are
// absent we OMIT `credentials` entirely so the AWS SDK v3 default provider chain
// resolves them — in production on ECS Fargate that is the container's task role
// (no long-lived keys to rotate or leak). `region` is likewise left to the SDK
// (AWS_REGION) when unset.
const buildS3Client = (): S3Client => {
  const { accessKeyId, secretAccessKey, region } = config.aws;
  return new S3Client({
    ...(region ? { region } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
};

export const s3Client = buildS3Client();
