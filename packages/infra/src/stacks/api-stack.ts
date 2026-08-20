import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config/env.js';
import { backendHandlerEntry } from '../config/paths.js';
import { LambdaNodeFn } from '../constructs/lambda-node-fn.js';

export interface ApiStackProps extends StackProps {
  envConfig: EnvConfig;
  profilesTable: dynamodb.TableV2;
  /**
   * CloudFront's domain isn't known until FrontendStack deploys, which itself needs the API
   * URL baked into the frontend build first — a circular dependency. Auth here is a bearer JWT
   * attached by JS (not a cookie), so it isn't CSRF-exploitable via cross-origin form/script
   * submission the way cookie auth would be; allowing any origin avoids the ordering problem
   * without a meaningful security cost for this app. Tighten to the real origin once a custom
   * domain is set (see plan's "Custom Domain" decision).
   */
  frontendOrigin: string;
}

export class ApiStack extends Stack {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly uploadsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { envConfig, profilesTable, frontendOrigin } = props;

    // --- Transient uploads bucket: staging only, 1-day lifecycle expiry (plan: local-file-only
    // persistence means nothing chapter-related lives here beyond the extraction round trip). ---
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: Duration.days(envConfig.uploadsLifecycleDays) }],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: [frontendOrigin, 'http://localhost:5173'],
          allowedHeaders: ['*'],
        },
      ],
    });

    const ssmParamArn = (name: string) =>
      `arn:aws:ssm:${this.region}:${this.account}:parameter/teagent/${envConfig.envName}/${name}`;

    const commonEnv = { APP_ENV: envConfig.envName, FRONTEND_ORIGIN: frontendOrigin };

    // --- Lambda authorizer: shared JWT verification for all protected routes. ---
    const authorizerFn = new LambdaNodeFn(this, 'AuthorizerFn', {
      entry: backendHandlerEntry('handlers/authorizer.ts'),
      environment: commonEnv,
      memoryMb: 256,
      timeoutSeconds: 5,
    });
    authorizerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [ssmParamArn('jwt-signing-secret')],
      }),
    );

    const authorizer = new HttpLambdaAuthorizer('JwtAuthorizer', authorizerFn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      resultsCacheTtl: Duration.seconds(0), // JWT exp already bounds session length; no extra caching complexity
    });

    // --- Handlers ---
    const healthFn = new LambdaNodeFn(this, 'HealthFn', {
      entry: backendHandlerEntry('handlers/health.ts'),
      environment: commonEnv,
    });

    const loginFn = new LambdaNodeFn(this, 'LoginFn', {
      entry: backendHandlerEntry('handlers/auth/login.ts'),
      environment: { ...commonEnv, PROFILES_TABLE_NAME: profilesTable.tableName },
      memoryMb: 256,
      timeoutSeconds: 10,
    });
    profilesTable.grantReadWriteData(loginFn); // read (find by username) + write (touchLastLogin)
    loginFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [ssmParamArn('jwt-signing-secret')],
      }),
    );

    const familyProfilesFn = new LambdaNodeFn(this, 'FamilyProfilesFn', {
      entry: backendHandlerEntry('handlers/auth/familyProfiles.ts'),
      environment: { ...commonEnv, PROFILES_TABLE_NAME: profilesTable.tableName },
      memoryMb: 256,
      timeoutSeconds: 10,
    });
    profilesTable.grantReadData(familyProfilesFn);

    const presignFn = new LambdaNodeFn(this, 'PresignFn', {
      entry: backendHandlerEntry('handlers/uploads/presign.ts'),
      environment: { ...commonEnv, UPLOADS_BUCKET_NAME: this.uploadsBucket.bucketName },
      memoryMb: 256,
      timeoutSeconds: 10,
    });
    this.uploadsBucket.grantPut(presignFn);

    const extractFn = new LambdaNodeFn(this, 'ExtractFn', {
      entry: backendHandlerEntry('handlers/chapters/extract.ts'),
      environment: {
        ...commonEnv,
        UPLOADS_BUCKET_NAME: this.uploadsBucket.bucketName,
        PROFILES_TABLE_NAME: profilesTable.tableName,
        DAILY_EXTRACT_CAP: String(envConfig.dailyExtractCap),
      },
      memoryMb: 1024,
      timeoutSeconds: 25, // stays under HTTP API's 30s integration ceiling — plan risk #2
    });
    this.uploadsBucket.grantRead(extractFn);
    profilesTable.grantReadWriteData(extractFn); // usage counter
    extractFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [ssmParamArn('openai-api-key')],
      }),
    );

    const chatAskFn = new LambdaNodeFn(this, 'ChatAskFn', {
      entry: backendHandlerEntry('handlers/chat/ask.ts'),
      environment: {
        ...commonEnv,
        PROFILES_TABLE_NAME: profilesTable.tableName,
        DAILY_CHAT_CAP: String(envConfig.dailyChatCap),
      },
      memoryMb: 512,
      timeoutSeconds: 20,
    });
    profilesTable.grantReadWriteData(chatAskFn); // usage counter only — no lesson content stored
    chatAskFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [ssmParamArn('openai-api-key')],
      }),
    );

    // --- HTTP API + routes ---
    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowOrigins: [frontendOrigin, 'http://localhost:5173'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    this.httpApi.addRoutes({
      path: '/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('HealthIntegration', healthFn),
    });
    this.httpApi.addRoutes({
      path: '/auth/login',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('LoginIntegration', loginFn),
    });
    this.httpApi.addRoutes({
      path: '/auth/family-profiles',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('FamilyProfilesIntegration', familyProfilesFn),
      authorizer,
    });
    this.httpApi.addRoutes({
      path: '/uploads/presign',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('PresignIntegration', presignFn),
      authorizer,
    });
    this.httpApi.addRoutes({
      path: '/chapters/extract',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('ExtractIntegration', extractFn),
      authorizer,
    });
    this.httpApi.addRoutes({
      path: '/chat/ask',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('ChatAskIntegration', chatAskFn),
      authorizer,
    });

    new CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint });
  }
}
