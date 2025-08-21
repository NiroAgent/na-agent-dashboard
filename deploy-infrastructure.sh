#!/bin/bash

# CloudFormation Deployment Script
# Deploys infrastructure using CloudFormation templates

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="niro-agent-dashboard-${ENVIRONMENT}"
TEMPLATE_FILE="infrastructure/dashboard-infrastructure.yaml"
PARAMETERS_FILE="infrastructure/parameters-${ENVIRONMENT}.json"

echo "🚀 Deploying CloudFormation stack for environment: $ENVIRONMENT"

# Validate template
echo "📋 Validating CloudFormation template..."
aws cloudformation validate-template --template-body file://$TEMPLATE_FILE

# Deploy stack
echo "☁️ Deploying stack: $STACK_NAME"
aws cloudformation deploy \
  --template-file $TEMPLATE_FILE \
  --stack-name $STACK_NAME \
  --parameter-overrides file://$PARAMETERS_FILE \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags Environment=$ENVIRONMENT Project=NiroAgentDashboard \
  --no-fail-on-empty-changeset

# Get outputs
echo "📊 Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table

# Save outputs to file
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs' \
  --output json > "stack-outputs-${ENVIRONMENT}.json"

echo "✅ Infrastructure deployment complete!"
echo "📝 Outputs saved to: stack-outputs-${ENVIRONMENT}.json"
