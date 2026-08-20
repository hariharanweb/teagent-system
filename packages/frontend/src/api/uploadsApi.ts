import type { LanguageCode, PresignRequest, PresignResponse } from '@teagent/shared';
import { apiRequest } from './client';

function presign(request: PresignRequest): Promise<PresignResponse> {
  return apiRequest<PresignResponse>('/uploads/presign', { method: 'POST', body: request });
}

/** Requests a presigned S3 URL, then PUTs the image bytes directly to S3, and returns the s3Key. */
export async function uploadChapterImage(file: File, language: LanguageCode): Promise<string> {
  const { uploadUrl, s3Key } = await presign({
    contentType: file.type as PresignRequest['contentType'],
    language,
  });

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putResponse.ok) {
    throw new Error('Upload failed — please try again');
  }

  return s3Key;
}
