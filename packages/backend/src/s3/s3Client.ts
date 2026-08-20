import { S3Client } from '@aws-sdk/client-s3';

const localEndpoint = process.env.S3_ENDPOINT;

// Mirrors db/dynamoClient.ts: when S3_ENDPOINT is set (local dev against MinIO, see
// docker-compose.yml), use dummy static credentials and path-style addressing (MinIO doesn't
// support virtual-hosted-style bucket URLs the way real S3 does).
export const s3Client = new S3Client(
  localEndpoint
    ? {
        endpoint: localEndpoint,
        region: process.env.AWS_REGION ?? 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'minioadmin',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin',
        },
        forcePathStyle: true,
      }
    : {},
);

export const isLocalS3 = Boolean(localEndpoint);
