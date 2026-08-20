import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});

// Cached at module scope so warm Lambda invocations don't re-fetch on every request.
const cache = new Map<string, string>();

async function getParameter(name: string): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const result = await ssmClient.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  const value = result.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${name} has no value`);

  cache.set(name, value);
  return value;
}

const ENV = process.env.APP_ENV ?? 'dev';

export async function getOpenAiApiKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY; // local dev via .env
  return getParameter(`/teagent/${ENV}/openai-api-key`);
}

export async function getJwtSigningSecret(): Promise<string> {
  if (process.env.JWT_SIGNING_SECRET) return process.env.JWT_SIGNING_SECRET; // local dev via .env
  return getParameter(`/teagent/${ENV}/jwt-signing-secret`);
}
