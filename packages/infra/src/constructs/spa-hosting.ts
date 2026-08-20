import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

export interface SpaHostingProps {
  /** Local path to the built frontend (e.g. packages/frontend/dist). */
  buildOutputPath: string;
}

/** S3 (private, OAC-only) + CloudFront SPA hosting with client-side-routing fallback to index.html. */
export class SpaHosting extends s3.Bucket {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SpaHostingProps) {
    super(scope, `${id}Bucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const distribution = new cloudfront.Distribution(scope, `${id}Distribution`, {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(10),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(10),
        },
      ],
    });
    this.distribution = distribution;

    // Hashed, immutable assets (Vite outputs these under /assets) get a long cache;
    // everything else (index.html, favicon, etc.) is short-lived so redeploys are picked up.
    new s3deploy.BucketDeployment(scope, `${id}AssetsDeployment`, {
      sources: [s3deploy.Source.asset(props.buildOutputPath, { exclude: ['index.html'] })],
      destinationBucket: this,
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(Duration.days(365)),
        s3deploy.CacheControl.immutable(),
      ],
      prune: false,
    });

    new s3deploy.BucketDeployment(scope, `${id}RootDeployment`, {
      sources: [s3deploy.Source.asset(props.buildOutputPath, { exclude: ['assets/*'] })],
      destinationBucket: this,
      distribution,
      distributionPaths: ['/*'],
      cacheControl: [s3deploy.CacheControl.noCache()],
      prune: false,
    });
  }
}
