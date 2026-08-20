import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { HttpError } from './errors.js';
import { errorResponse } from './httpResponse.js';

export function withErrorHandling<Event>(
  fn: (event: Event) => Promise<APIGatewayProxyStructuredResultV2>,
): (event: Event) => Promise<APIGatewayProxyStructuredResultV2> {
  return async (event) => {
    try {
      return await fn(event);
    } catch (err) {
      if (err instanceof HttpError) {
        return errorResponse(err.statusCode, err.message);
      }
      console.error('Unhandled error', err);
      return errorResponse(500, 'Internal server error');
    }
  };
}
