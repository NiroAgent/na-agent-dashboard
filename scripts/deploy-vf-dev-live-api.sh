#!/bin/bash

# Deploy VF-Dev Live TypeScript API with Agent Management
# This script deploys the complete live agent system to vf-dev environment

set -e

STACK_NAME="niro-agent-live-api-dev"
TEMPLATE_FILE="infrastructure/live-typescript-api-infrastructure.yaml" 
PARAMETERS_FILE="infrastructure/parameters-dev.json"
REGION="us-east-1"

echo "🚀 Deploying VF-Dev Live Agent API..."
echo "Stack: $STACK_NAME"
echo "Template: $TEMPLATE_FILE"
echo "Parameters: $PARAMETERS_FILE"
echo "Region: $REGION"
echo ""

# Check if we're in the right directory
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    echo "❌ CloudFormation template not found: $TEMPLATE_FILE"
    echo "Current directory: $(pwd)"
    echo "Please run from na-agent-dashboard root directory"
    exit 1
fi

# Validate template
echo "🔍 Validating CloudFormation template..."
aws cloudformation validate-template \
    --template-body file://$TEMPLATE_FILE \
    --region $REGION

if [[ $? -ne 0 ]]; then
    echo "❌ Template validation failed"
    exit 1
fi

echo "✅ Template validation passed"

# Deploy or update stack
echo "📦 Deploying stack..."
aws cloudformation deploy \
    --template-file $TEMPLATE_FILE \
    --stack-name $STACK_NAME \
    --parameter-overrides file://$PARAMETERS_FILE \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --no-fail-on-empty-changeset

if [[ $? -ne 0 ]]; then
    echo "❌ Stack deployment failed"
    exit 1
fi

echo "✅ Stack deployment completed"

# Get outputs
echo "📊 Getting stack outputs..."
STACK_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs')

if [[ $? -eq 0 ]]; then
    echo "$STACK_OUTPUTS" | jq '.'
    
    # Extract key values
    PUBLIC_IP=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="LivePublicIp") | .OutputValue')
    HEALTH_ENDPOINT=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="HealthEndpoint") | .OutputValue')
    API_ENDPOINT=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="LiveApiEndpoint") | .OutputValue')
    WEBSOCKET_ENDPOINT=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="WebSocketEndpoint") | .OutputValue')
    
    echo ""
    echo "🌟 VF-Dev Live API Deployment Complete!"
    echo "🔗 Health Check: $HEALTH_ENDPOINT"
    echo "🔗 Live Agents API: $API_ENDPOINT"  
    echo "🔌 WebSocket: $WEBSOCKET_ENDPOINT"
    echo "📍 Public IP: $PUBLIC_IP"
    echo ""
    
    # Test the deployment
    echo "🧪 Testing deployment..."
    echo "Health check:"
    curl -f "$HEALTH_ENDPOINT" | jq '.'
    
    echo ""
    echo "Live agents:"
    curl -f "$API_ENDPOINT" | jq '.agents | length'
    
    echo ""
    echo "✅ VF-Dev Live API is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update frontend configuration to use: $PUBLIC_IP:7777"
    echo "2. Deploy full TypeScript API: ./scripts/deploy-full-typescript-to-instance.sh $PUBLIC_IP"
    echo "3. Deploy updated frontend to S3"
    echo ""
    
else
    echo "⚠️ Could not retrieve stack outputs, but deployment may have succeeded"
fi

echo "🎯 VF-Dev deployment script completed!"