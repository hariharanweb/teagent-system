import { presignRequestSchema, type PresignResponse } from '@teagent/shared';
import { createPresignedUploadUrl, PRESIGN_UPLOAD_TTL_SECONDS } from '../../s3/presign.js';
import { ValidationError } from '../../lib/errors.js';
import { okResponse } from '../../lib/httpResponse.js';
import { withErrorHandling } from '../../lib/handlerWrapper.js';
import { getAuthContext, type AuthenticatedEvent } from '../../lib/authContext.js';

async function presignHandler(event: AuthenticatedEvent) {
  const { profileId } = getAuthContext(event);
  const parsed = presignRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) throw new ValidationError('contentType and language are required');

  const { uploadUrl, s3Key } = await createPresignedUploadUrl(profileId, parsed.data.contentType);

  const response: PresignResponse = {
    uploadUrl,
    s3Key,
    expiresInSeconds: PRESIGN_UPLOAD_TTL_SECONDS,
  };
  return okResponse(response);
}

export const handler = withErrorHandling(presignHandler);
