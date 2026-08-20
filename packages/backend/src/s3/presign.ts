import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, isLocalS3 } from './s3Client.js';

const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET_NAME ?? 'teagent-uploads-dev';

const PRESIGN_UPLOAD_TTL_SECONDS = 300;
const PRESIGN_DOWNLOAD_TTL_SECONDS = 300;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export async function createPresignedUploadUrl(
  profileId: string,
  contentType: string,
): Promise<{ uploadUrl: string; s3Key: string }> {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType] ?? 'bin';
  const s3Key = `uploads/${profileId}/${randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({ Bucket: UPLOADS_BUCKET, Key: s3Key, ContentType: contentType }),
    { expiresIn: PRESIGN_UPLOAD_TTL_SECONDS },
  );

  return { uploadUrl, s3Key };
}

async function createPresignedDownloadUrl(s3Key: string): Promise<string> {
  return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: s3Key }), {
    expiresIn: PRESIGN_DOWNLOAD_TTL_SECONDS,
  });
}

async function readObjectAsDataUrl(s3Key: string): Promise<string> {
  const result = await s3Client.send(new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: s3Key }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Could not read uploaded object ${s3Key}`);
  const contentType = result.ContentType ?? 'image/jpeg';
  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * Returns a URL the OpenAI vision API can fetch the uploaded image from. Real S3 (production)
 * gives a publicly reachable presigned HTTPS URL, which is lean — no need to pull the bytes
 * through the Lambda. Local S3 (MinIO, see docker-compose.yml) is only reachable on localhost,
 * which OpenAI's servers can't reach at all, so instead the bytes are read here and inlined as a
 * base64 data URL — slightly heavier, but the only way this can work outside a real deployment.
 */
export async function resolveVisionImageUrl(s3Key: string): Promise<string> {
  return isLocalS3 ? readObjectAsDataUrl(s3Key) : createPresignedDownloadUrl(s3Key);
}

export { PRESIGN_UPLOAD_TTL_SECONDS };
