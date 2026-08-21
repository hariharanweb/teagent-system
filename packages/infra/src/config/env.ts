export interface EnvConfig {
  envName: 'dev' | 'prod';
  account?: string;
  region: string;
  dailyExtractCap: number;
  dailyChatCap: number;
  dailyLessonPlanCap: number;
  uploadsLifecycleDays: number;
}

export function loadEnvConfig(envName: string): EnvConfig {
  if (envName !== 'dev' && envName !== 'prod') {
    throw new Error(`Unknown environment "${envName}" — expected "dev" or "prod"`);
  }
  return {
    envName,
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
    dailyExtractCap: envName === 'prod' ? 20 : 50,
    dailyChatCap: envName === 'prod' ? 200 : 500,
    dailyLessonPlanCap: envName === 'prod' ? 20 : 50,
    uploadsLifecycleDays: 1,
  };
}
