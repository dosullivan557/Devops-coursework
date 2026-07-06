# Deploy to AWS Lab (ECR via GitHub Actions)

This repo includes a workflow at `.github/workflows/push-ecr.yml` that builds your Docker image and pushes it to Amazon ECR.

## 1. Add GitHub repository secrets

Add these in **GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (for example `eu-west-2`)
- `AWS_ACCOUNT_ID` (your AWS lab account id)
- `ECR_REPOSITORY` (for example `change-audit`)

## 2. Trigger deployment

The workflow runs automatically on pushes to `main`.

You can also run it manually from:

- **GitHub -> Actions -> Build and Push to ECR -> Run workflow**

## 3. Output image tags

The workflow pushes:

- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest`
- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${GITHUB_SHA}`

## 4. Next step (runtime deployment)

This workflow only pushes to ECR.

To run it in AWS, deploy the image from ECR to one of:

- ECS Fargate (recommended)
- EC2 / Elastic Beanstalk

## 5. Runtime database secret

The ECS task definition injects `DATABASE_URL` from AWS Secrets Manager. The
secret value must be the full PostgreSQL connection string for the deployed
database, using the RDS endpoint as the host.

Example shape:

```text
postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/DB_NAME
```

Do not use Docker Compose service names such as `db` or local-only hostnames
such as `base` in the deployed secret. ECS tasks can only resolve hostnames that
exist in the AWS network, such as an RDS endpoint or a configured service
discovery name.
