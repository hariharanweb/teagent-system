import { App } from 'aws-cdk-lib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadEnvConfig } from '../config/env.js';
import { DataStack } from '../stacks/data-stack.js';
import { ApiStack } from '../stacks/api-stack.js';
import { FrontendStack } from '../stacks/frontend-stack.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = join(HERE, '..', '..', '..', 'frontend', 'dist');

const app = new App();
const envName = app.node.tryGetContext('envName') ?? process.env.APP_ENV ?? 'dev';
const envConfig = loadEnvConfig(envName);

const env = { account: envConfig.account, region: envConfig.region };
const namePrefix = `Teagent-${envConfig.envName}`;

// No custom domain yet (shipping on the default *.cloudfront.net domain — see plan). Auth is a
// bearer JWT attached by JS, not a cookie, so a wildcard CORS origin here doesn't carry the
// CSRF risk cookie-based auth would; see ApiStack's frontendOrigin doc comment.
const frontendOrigin = '*';

const dataStack = new DataStack(app, `${namePrefix}-Data`, { env, envConfig });

const apiStack = new ApiStack(app, `${namePrefix}-Api`, {
  env,
  envConfig,
  profilesTable: dataStack.profilesTable,
  frontendOrigin,
});
apiStack.addStackDependency(dataStack);

// FrontendStack expects packages/frontend/dist to already be built (with VITE_API_BASE_URL
// pointed at apiStack.httpApi.apiEndpoint) by the CD workflow before this runs — see cd.yml.
const frontendStack = new FrontendStack(app, `${namePrefix}-Frontend`, {
  env,
  buildOutputPath: FRONTEND_DIST,
});
frontendStack.addStackDependency(apiStack);

app.synth();
