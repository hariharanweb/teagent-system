import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_SRC = join(HERE, '..', '..', '..', 'backend', 'src');

export function backendHandlerEntry(relativePath: string): string {
  return join(BACKEND_SRC, relativePath);
}
