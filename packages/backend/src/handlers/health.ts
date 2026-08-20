import { okResponse } from '../lib/httpResponse.js';

export async function handler() {
  return okResponse({ status: 'ok' });
}
