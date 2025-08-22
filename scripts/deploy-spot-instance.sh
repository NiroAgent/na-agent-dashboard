#!/bin/bash

# 💰 Cost Optimization: Deploy t3.micro Spot Instance for Niro Agent Dashboard
# Reduces costs by ~90% from t3.large to t3.micro spot (~$60/month to ~$3-6/month)

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_NAME="niro-agent-dashboard-spot-$ENVIRONMENT"

echo "🚀 Deploying Niro Agent Dashboard with t3.micro spot instance"
echo "💰 Expected savings: ~$54-58/month (90% cost reduction)"
echo "📍 Environment: $ENVIRONMENT"
echo "🌐 Region: $REGION"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ Error: AWS CLI not configured or credentials not available"
    exit 1
fi

# Deploy the infrastructure
echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file infrastructure/spot-instance-infrastructure.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        ApiPort=7778 \
        SpotMaxPrice=0.010 \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags \
        Environment=$ENVIRONMENT \
        Project=NiroAgentDashboard \
        CostOptimization=true

if [ $? -eq 0 ]; then
    echo "✅ Infrastructure deployed successfully!"
    
    # Get outputs
    echo "📊 Getting deployment information..."
    
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
        --output text)
    
    WEBSITE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
        --output text)
    
    SPOT_FLEET_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SpotFleetRequestId`].OutputValue' \
        --output text)
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💰 COST SAVINGS: ~90% reduction vs t3.large"
    echo "📦 Frontend Bucket: $FRONTEND_BUCKET"
    echo "🌐 Website URL: $WEBSITE_URL"
    echo "🚀 Spot Fleet ID: $SPOT_FLEET_ID"
    echo ""
    echo "🔍 Getting spot instance details (may take 1-2 minutes to launch)..."
    
    # Wait for spot instance to launch and get IP
    for i in {1..12}; do
        INSTANCE_ID=$(aws ec2 describe-spot-fleet-instances \
            --spot-fleet-request-id $SPOT_FLEET_ID \
            --region $REGION \
            --query 'ActiveInstances[0].InstanceId' \
            --output text 2>/dev/null || echo "None")
        
        if [ "$INSTANCE_ID" != "None" ] && [ "$INSTANCE_ID" != "" ]; then
            PUBLIC_IP=$(aws ec2 describe-instances \
                --instance-ids $INSTANCE_ID \
                --region $REGION \
                --query 'Reservations[0].Instances[0].PublicIpAddress' \
                --output text)
            
            if [ "$PUBLIC_IP" != "None" ] && [ "$PUBLIC_IP" != "" ]; then
                echo "✅ Spot instance launched!"
                echo "🖥️  Instance ID: $INSTANCE_ID"
                echo "🌐 Public IP: $PUBLIC_IP"
                echo "🔗 API Endpoint: http://$PUBLIC_IP:7778"
                echo ""
                echo "📊 Test the API:"
                echo "   curl http://$PUBLIC_IP:7778/health"
                echo "   curl http://$PUBLIC_IP:7778/api/agents"
                echo ""
                echo "💡 Update your frontend configuration:"
                echo "   VITE_API_BASE_URL=http://$PUBLIC_IP:7778"
                
                # Update SSM parameter
                aws ssm put-parameter \
                    --name "/niro-agent-dashboard/$ENVIRONMENT/api-endpoint" \
                    --value "http://$PUBLIC_IP:7778" \
                    --overwrite \
                    --region $REGION \
                    --description "API endpoint for spot instance"
                
                break
            fi
        fi
        
        echo "⏳ Waiting for spot instance to launch... ($i/12)"
        sleep 10
    done
    
    if [ "$INSTANCE_ID" == "None" ] || [ "$INSTANCE_ID" == "" ]; then
        echo "⚠️  Spot instance not yet available. Check AWS console in a few minutes."
        echo "   aws ec2 describe-spot-fleet-instances --spot-fleet-request-id $SPOT_FLEET_ID"
    fi
    
    echo ""
    echo "📈 Next Steps:"
    echo "1. Update frontend environment variables with new API endpoint"
    echo "2. Deploy frontend to S3 bucket: $FRONTEND_BUCKET"
    echo "3. Test the dashboard at: $WEBSITE_URL"
    echo "4. Monitor spot instance costs in AWS Cost Explorer"
    echo ""
    echo "💰 Expected Monthly Cost:"
    echo "   t3.micro spot: ~$3-6/month (vs t3.large: ~$60/month)"
    echo "   Total savings: ~$54-57/month"
    
else
    echo "❌ Deployment failed. Check CloudFormation console for details."
    exit 1
fi
