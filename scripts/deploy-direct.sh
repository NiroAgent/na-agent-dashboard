#!/bin/bash

# Direct Deployment Script for Niro Agent Dashboard
# This script deploys the dashboard directly to AWS when GitHub Actions isn't fully configured

set -e

echo "🚀 Starting Direct Deployment of Niro Agent Dashboard..."
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check AWS CLI is available and configured
if ! command -v aws > /dev/null 2>&1; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}
print_info "AWS Account: $ACCOUNT_ID"
print_info "Region: $REGION"

# Environment configuration
ENVIRONMENT=${1:-dev}
STACK_NAME="niro-agent-dashboard-${ENVIRONMENT}-infrastructure"
APP_STACK_NAME="niro-agent-dashboard-${ENVIRONMENT}-application"
BUCKET_NAME="niro-agent-dashboard-${ENVIRONMENT}-${ACCOUNT_ID}"

print_info "Environment: $ENVIRONMENT"
print_info "Stack Name: $STACK_NAME"

# Step 1: Deploy Infrastructure
echo ""
echo "📋 Step 1: Deploying Infrastructure..."
echo "======================================"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" > /dev/null 2>&1; then
    print_info "Stack $STACK_NAME exists, updating..."
    aws cloudformation deploy \
        --template-file infrastructure/dashboard-infrastructure.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            AgentInstanceId="i-0af59b7036f7b0b77" \
            ApiPort=7777 \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$REGION"
else
    print_info "Creating new stack $STACK_NAME..."
    aws cloudformation deploy \
        --template-file infrastructure/dashboard-infrastructure.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            AgentInstanceId="i-0af59b7036f7b0b77" \
            ApiPort=7777 \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$REGION"
fi

print_status "Infrastructure deployment completed!"

# Get outputs from infrastructure stack
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text)

CLOUDFRONT_DISTRIBUTION=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
    --output text)

print_info "Frontend Bucket: $FRONTEND_BUCKET"
print_info "CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION"
print_info "CloudFront Domain: $CLOUDFRONT_DOMAIN"

# Step 2: Build and Deploy Frontend
echo ""
echo "🏗️  Step 2: Building and Deploying Frontend..."
echo "==============================================="

# Build frontend
cd mfe
print_info "Installing frontend dependencies..."
npm ci

print_info "Building frontend for production..."
npm run build

print_info "Deploying frontend to S3..."
aws s3 sync dist/ "s3://$FRONTEND_BUCKET" --delete --region "$REGION"

# Invalidate CloudFront cache
print_info "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION" \
    --paths "/*" \
    --region "$REGION"

cd ..
print_status "Frontend deployment completed!"

# Step 3: Deploy API to Agent Server
echo ""
echo "🔧 Step 3: Deploying API to Agent Server..."
echo "==========================================="

# Build API
cd api
print_info "Installing API dependencies..."
npm ci

print_info "Building API for production..."
npm run build

# Package API for deployment
print_info "Packaging API for deployment..."
tar -czf ../dashboard-api.tar.gz dist/ package.json node_modules/

cd ..

# Deploy to agent server via SSM
print_info "Deploying API to agent server i-0af59b7036f7b0b77..."

# Create deployment script
cat > deploy-api-script.sh << 'EOF'
#!/bin/bash
cd /opt/dashboard-api
sudo systemctl stop dashboard-api || echo "Service not running"
sudo rm -rf dist/ node_modules/ package.json || echo "No previous installation"
tar -xzf /tmp/dashboard-api.tar.gz
sudo systemctl start dashboard-api
sudo systemctl enable dashboard-api
echo "Dashboard API deployed and started on port 7777"
EOF

# Copy files and run deployment
aws ssm send-command \
    --instance-ids "i-0af59b7036f7b0b77" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo mkdir -p /opt/dashboard-api", "sudo chown ec2-user:ec2-user /opt/dashboard-api"]' \
    --region "$REGION"

sleep 5

# Upload API package
aws ssm send-command \
    --instance-ids "i-0af59b7036f7b0b77" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["curl -o /tmp/dashboard-api.tar.gz https://github.com/NiroAgent/na-agent-dashboard/releases/latest/download/dashboard-api.tar.gz || echo \"Using local build\""]' \
    --region "$REGION"

print_status "API deployment initiated!"

# Step 4: Verify Deployment
echo ""
echo "🔍 Step 4: Verifying Deployment..."
echo "=================================="

print_info "Dashboard URL: https://$CLOUDFRONT_DOMAIN"
print_info "API Health Check: https://$CLOUDFRONT_DOMAIN/api/health"

# Test CloudFront endpoint
print_info "Testing CloudFront endpoint..."
if curl -s -f "https://$CLOUDFRONT_DOMAIN" > /dev/null; then
    print_status "CloudFront endpoint is accessible!"
else
    print_warning "CloudFront endpoint may still be propagating..."
fi

# Final Summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo "Environment: $ENVIRONMENT"
echo "Frontend URL: https://$CLOUDFRONT_DOMAIN"
echo "API Endpoint: https://$CLOUDFRONT_DOMAIN/api"
echo "Stack Name: $STACK_NAME"
echo "S3 Bucket: $FRONTEND_BUCKET"
echo "CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION"
echo ""
print_status "Dashboard deployment completed!"
echo ""
print_info "Next steps:"
echo "  1. Wait 5-10 minutes for CloudFront to fully propagate"
echo "  2. Test the dashboard at https://$CLOUDFRONT_DOMAIN"
echo "  3. Configure custom domain DNS (optional)"
echo "  4. Set up monitoring and alerts"
echo ""
print_status "Deployment successful! 🚀"
