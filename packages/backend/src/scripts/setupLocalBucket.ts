/**
 * Creates the uploads bucket in MinIO (local S3-compatible storage, see docker-compose.yml).
 * Idempotent — does nothing if the bucket already exists.
 *
 * Usage: npm run s3:setup -w @teagent/backend
 */
import '../lib/loadEnv.js';
import { BucketAlreadyOwnedByYou, CreateBucketCommand } from '@aws-sdk/client-s3';
import { s3Client, isLocalS3 } from '../s3/s3Client.js';

const BUCKET_NAME = process.env.UPLOADS_BUCKET_NAME ?? 'teagent-uploads-dev';

if (!isLocalS3) {
  console.error(
    'S3_ENDPOINT is not set — this script is for local MinIO only. Set it in .env (see .env.example), e.g. http://localhost:9100.',
  );
  process.exit(1);
}

async function main() {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`Created bucket "${BUCKET_NAME}".`);
  } catch (err) {
    if (err instanceof BucketAlreadyOwnedByYou) {
      console.log(`Bucket "${BUCKET_NAME}" already exists — nothing to do.`);
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exitCode = 1;
});
