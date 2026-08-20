/**
 * Loads the repo-root .env regardless of the current working directory. Plain `dotenv/config`
 * loads `${cwd}/.env`, which breaks when npm workspace scripts run with cwd set to the package
 * directory (e.g. `npm run seed -w @teagent/backend` runs from packages/backend, not the root).
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_ENV_PATH = join(HERE, '..', '..', '..', '..', '.env');

config({ path: ROOT_ENV_PATH });
