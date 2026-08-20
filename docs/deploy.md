# Deploying Teagent

This app deploys via GitHub Actions (`.github/workflows/cd.yml`) using OIDC — no long-lived AWS
access keys are stored anywhere. A few things must be set up once, manually, before the first CD
run, because they're exactly the trust relationship the CD pipeline needs to already exist.

## 1. One-time AWS setup

Run these locally with your own AWS credentials (an admin/bootstrap session, not the CI role).

```bash
# Bootstrap CDK in your account/region (creates the CDK deploy roles + asset bucket)
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 --app "npx tsx packages/infra/src/bin/app.ts"

# Create the GitHub OIDC identity provider (skip if your account already has one)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# Create the deploy role, trusted only for pushes to main on this repo.
#
# NOTE: GitHub's OIDC token `sub` claim isn't reliably just "repo:OWNER/REPO:ref:refs/heads/main"
# — GitHub has been rolling out "immutable ID" subjects, which look like
# "repo:OWNER@ORG_ID/REPO@REPO_ID:ref:refs/heads/main" instead (confirmed via CloudTrail's
# AssumeRoleWithWebIdentity error logs when this bit us — the errorMessage doesn't say which
# format was sent, but the request's userIdentity.userName does). Trust BOTH shapes so this
# doesn't silently break depending on which one your account/repo gets:
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": [
          "repo:<GITHUB_ORG>/<GITHUB_REPO>:ref:refs/heads/main",
          "repo:<GITHUB_ORG>@*/<GITHUB_REPO>@*:ref:refs/heads/main"
        ]
      }
    }
  }]
}
EOF

aws iam create-role \
  --role-name teagent-github-deploy \
  --assume-role-policy-document file://trust-policy.json

# Standard CDK+OIDC pattern: let the deploy role assume the CDK bootstrap's execution role,
# rather than granting broad permissions directly.
aws iam put-role-policy \
  --role-name teagent-github-deploy \
  --policy-name AssumeCdkExecutionRole \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/cdk-*-cfn-exec-role-*"
    }]
  }'
```

Add the resulting role ARN as a GitHub Actions secret: **`AWS_DEPLOY_ROLE_ARN`**
(Settings → Secrets and variables → Actions).

## 2. Seed application secrets in SSM Parameter Store

The Lambdas read these at runtime (SecureString, not Secrets Manager — free tier, see plan). Do
this once per environment (`dev`, `prod`):

```bash
aws ssm put-parameter --name /teagent/prod/openai-api-key --type SecureString --value "sk-..."
aws ssm put-parameter --name /teagent/prod/jwt-signing-secret --type SecureString --value "$(openssl rand -base64 48)"
```

## 3. Seed at least one profile

The app has no self-serve signup (deliberately — it's a family app), so nothing logs in until you
put a profile in DynamoDB yourself. The quickest way is the seed script, which creates a demo
`parent` / `parent1234` and `kid` / `1234` pair (skips any that already exist, so it's safe to
re-run):

```bash
PROFILES_TABLE_NAME=TeagentProfiles-prod npm run seed -w @teagent/backend
```

Requires AWS credentials in your shell with write access to that table. Change the usernames,
passwords, and other fields in `packages/backend/src/scripts/seedProfiles.ts` (or replace them
after login — there's no self-service profile editing UI yet either) — treat the demo credentials
as a starting point, not what you'd want live long-term.

For a one-off custom profile instead, put an item shaped like
`packages/backend/src/db/profilesRepo.ts`'s `ProfileRecord` (`PK=FAMILY#<uuid>`,
`SK=PROFILE#<uuid>`, `GSI1PK=USERNAME#<username>`, `GSI1SK=PROFILE`, plus the other fields,
password hashed with `bcryptjs`) directly via the AWS Console or CLI.

## 4. Push to `main`

From here on, every push to `main` runs `.github/workflows/cd.yml`: deploys `DataStack` and
`ApiStack`, builds the frontend with the live API URL baked in, then deploys `FrontendStack`. The
frontend URL is printed as a CloudFormation output (`FrontendUrl`) on the `Teagent-prod-Frontend`
stack.
