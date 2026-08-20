import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction, OutputFormat, type NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';

export interface LambdaNodeFnProps extends Partial<NodejsFunctionProps> {
  entry: string;
  memoryMb?: number;
  timeoutSeconds?: number;
  environment?: Record<string, string>;
}

/** NodejsFunction wrapper with the app's shared defaults (Node 22, ESM bundling, log retention). */
export class LambdaNodeFn extends NodejsFunction {
  constructor(scope: Construct, id: string, props: LambdaNodeFnProps) {
    super(scope, id, {
      runtime: Runtime.NODEJS_22_X,
      architecture: props.architecture,
      entry: props.entry,
      handler: props.handler ?? 'handler',
      memorySize: props.memoryMb ?? 256,
      timeout: Duration.seconds(props.timeoutSeconds ?? 10),
      environment: props.environment,
      logGroup: new logs.LogGroup(scope, `${id}LogGroup`, {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      bundling: {
        format: OutputFormat.ESM,
        mainFields: ['module', 'main'],
        target: 'node22',
        externalModules: [],
        ...props.bundling,
      },
    });
  }
}
