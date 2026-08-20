import { App } from 'aws-cdk-lib';
import { existsSync } from 'node:fs';
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

// FrontendStack's BucketDeployment needs packages/frontend/dist to exist at CDK *synth* time —
// and synth runs for the whole App regardless of which stack names `cdk deploy` was given, so
// this can't just be "deploy Data+Api first" at the command level (that still fails: CDK
// constructs every stack in the app before filtering which ones to actually deploy). The CD
// workflow deploys Data+Api first (to get the API URL), builds the frontend with it, THEN
// deploys Frontend — so dist genuinely doesn't exist yet during that first synth. Skip
// constructing FrontendStack entirely when there's nothing built yet, rather than crashing.
if (existsSync(FRONTEND_DIST)) {
  const frontendStack = new FrontendStack(app, `${namePrefix}-Frontend`, {
    env,
    buildOutputPath: FRONTEND_DIST,
  });
  frontendStack.addStackDependency(apiStack);
}

app.synth();
