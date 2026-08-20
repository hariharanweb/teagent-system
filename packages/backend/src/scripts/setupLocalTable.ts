/**
 * Creates the TeagentProfiles table against DynamoDB Local, mirroring the schema defined in
 * packages/infra/src/stacks/data-stack.ts. Run once after `docker compose up -d dynamodb-local`.
 * Idempotent — does nothing if the table already exists.
 *
 * Usage: npm run dynamodb:setup -w @teagent/backend
 */
import '../lib/loadEnv.js';
import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.PROFILES_TABLE_NAME ?? 'TeagentProfiles-dev';
const endpoint = process.env.DYNAMODB_ENDPOINT;

if (!endpoint) {
  console.error(
    'DYNAMODB_ENDPOINT is not set — this script is for DynamoDB Local only. Set it in .env (see .env.example), e.g. http://localhost:8000.',
  );
  process.exit(1);
}

const client = new DynamoDBClient({
  endpoint,
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function main() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    );
    console.log(`Created table "${TABLE_NAME}" on ${endpoint}.`);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`Table "${TABLE_NAME}" already exists on ${endpoint} — nothing to do.`);
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exitCode = 1;
});
