import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { LanguageCode, ProfileRole, ProfileSummary } from '@teagent/shared';
import { dynamoDocumentClient as client } from './dynamoClient.js';

const TABLE_NAME = process.env.PROFILES_TABLE_NAME ?? 'TeagentProfiles-dev';

export interface ProfileRecord {
  profileId: string;
  familyId: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarKey: string;
  role: ProfileRole;
  preferredLanguage: LanguageCode;
  createdAt: number;
  lastLoginAt: number | null;
}

function toSummary(record: ProfileRecord): ProfileSummary {
  return {
    profileId: record.profileId,
    displayName: record.displayName,
    role: record.role,
    avatarKey: record.avatarKey,
    preferredLanguage: record.preferredLanguage,
  };
}

export async function findProfileByUsername(
  username: string,
): Promise<ProfileRecord | undefined> {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `USERNAME#${username.toLowerCase()}` },
      Limit: 1,
    }),
  );
  return result.Items?.[0] as ProfileRecord | undefined;
}

export async function getProfile(
  familyId: string,
  profileId: string,
): Promise<ProfileRecord | undefined> {
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `FAMILY#${familyId}`, SK: `PROFILE#${profileId}` },
    }),
  );
  return result.Item as ProfileRecord | undefined;
}

export async function listFamilyProfiles(familyId: string): Promise<ProfileSummary[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `FAMILY#${familyId}`,
        ':skPrefix': 'PROFILE#',
      },
    }),
  );
  return (result.Items as ProfileRecord[] | undefined)?.map(toSummary) ?? [];
}

export async function touchLastLogin(familyId: string, profileId: string): Promise<void> {
  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `FAMILY#${familyId}`, SK: `PROFILE#${profileId}` },
      UpdateExpression: 'SET lastLoginAt = :now',
      ExpressionAttributeValues: { ':now': Date.now() },
    }),
  );
}

/**
 * Per-profile daily usage counter for /chapters/extract and /chat/ask, to bound OpenAI
 * spend from repeated use (plan risk #3). Stored as usage metadata, not lesson content.
 */
export async function incrementAndCheckDailyUsage(
  profileId: string,
  dailyCap: number,
): Promise<{ count: number; withinCap: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  const ttlEpochSeconds = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;

  const result = await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PROFILE#${profileId}`, SK: `USAGE#${today}` },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :one, #ttl = :ttl',
      ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':ttl': ttlEpochSeconds },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  const count = (result.Attributes?.count as number) ?? 1;
  return { count, withinCap: count <= dailyCap };
}
