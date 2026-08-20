import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';

export const ALLOWED_UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png'] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export const presignRequestSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_CONTENT_TYPES),
  language: z.enum(LANGUAGE_CODES),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const presignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresInSeconds: z.number(),
});
export type PresignResponse = z.infer<typeof presignResponseSchema>;
