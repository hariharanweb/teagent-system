import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { SpaHosting } from '../constructs/spa-hosting.js';

export interface FrontendStackProps extends StackProps {
  /** Local path to the already-built frontend (packages/frontend/dist), built with VITE_API_BASE_URL baked in. */
  buildOutputPath: string;
}

export class FrontendStack extends Stack {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const hosting = new SpaHosting(this, 'Frontend', {
      buildOutputPath: props.buildOutputPath,
    });
    this.distributionDomainName = hosting.distribution.distributionDomainName;

    new CfnOutput(this, 'FrontendUrl', {
      value: `https://${hosting.distribution.distributionDomainName}`,
    });
  }
}
