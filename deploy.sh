#!/bin/bash
set -e

# Replace these with actual values before running
AWS_REGION="us-east-1"
ECR_REPO_NAME="claude-code-gui-sandbox"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "ERROR: Could not get AWS Account ID. Are you logged in via AWS CLI?"
    exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${ECR_URI}/${ECR_REPO_NAME}:${IMAGE_TAG}"

echo "================================================="
echo " Deploying Claude Code GUI Sandbox to App Runner "
echo "================================================="

echo "0. Building GUI frontend and backend payloads locally..."
npm install
npm run build:frontend
npm run build:backend

echo "1. Authenticating to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "2. Ensuring ECR repository exists..."
aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION > /dev/null 2>&1 || echo "Repository ready."

echo "3. Building Docker image for linux/amd64 (App Runner requirement)..."
docker buildx build --platform linux/amd64 -t $ECR_REPO_NAME:$IMAGE_TAG .

echo "4. Tagging and Pushing image to ECR..."
docker tag $ECR_REPO_NAME:$IMAGE_TAG $FULL_IMAGE_NAME
docker push $FULL_IMAGE_NAME

echo "5. Triggering App Runner deployment (or update)..."
SERVICE_ARN=$(aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='${ECR_REPO_NAME}'].ServiceArn" --output text)

if [ -n "$SERVICE_ARN" ] && [ "$SERVICE_ARN" != "None" ]; then
    echo "Service exists. Starting update pipeline..."
    # Note: If auto-deploy is enabled on ECR push, this step might be redundant.
    # But it's good practice to force the update if auto-deploy is off.
    aws apprunner start-deployment --service-arn $SERVICE_ARN --region $AWS_REGION
else
    echo "** Note: Please create the App Runner service via the AWS Console the first time."
    echo "** Point it to ECR image: $FULL_IMAGE_NAME"
    echo "** Set Port to: 8080"
fi

echo "================================================="
echo " Done! "
echo "================================================="
echo ""
echo "!!! NEXT STEPS for Cognito !!!"
echo "1. Go to AWS App Runner Console -> Configuration -> Environment Variables"
echo "2. Add your Cognito details:"
echo "   COGNITO_USER_POOL_ID=us-east-1_xxxxx"
echo "   COGNITO_CLIENT_ID=xxxxxxxxxxxxxx"
echo "3. Redeploy."
