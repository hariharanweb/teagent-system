import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config/env.js';

export interface DataStackProps extends StackProps {
  envConfig: EnvConfig;
}

export class DataStack extends Stack {
  public readonly profilesTable: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // Profiles/auth + daily-usage-counter data only — no lesson content ever lives here
    // (chapters are local-file only, see plan). On-demand billing: near-zero cost at this scale.
    this.profilesTable = new dynamodb.TableV2(this, 'ProfilesTable', {
      tableName: `TeagentProfiles-${props.envConfig.envName}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      removalPolicy:
        props.envConfig.envName === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1',
          partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
        },
      ],
    });
  }
}
