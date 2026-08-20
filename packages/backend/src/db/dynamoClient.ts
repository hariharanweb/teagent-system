import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const localEndpoint = process.env.DYNAMODB_ENDPOINT;

// When DYNAMODB_ENDPOINT is set (local dev against DynamoDB Local, see docker-compose.yml),
// use dummy static credentials so this works with no real AWS account/credentials at all.
// DynamoDB Local doesn't validate them, but the SDK's default credential provider chain will
// otherwise try to resolve real ones and fail if none are configured.
const rawClient = new DynamoDBClient(
  localEndpoint
    ? {
        endpoint: localEndpoint,
        region: process.env.AWS_REGION ?? 'us-east-1',
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      }
    : {},
);

export const dynamoDocumentClient = DynamoDBDocumentClient.from(rawClient);
