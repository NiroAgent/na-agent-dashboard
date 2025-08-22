#!/bin/bash

# AWS OIDC Setup for GitHub Actions
# Run this script once to configure GitHub Actions OIDC authentication

set -e

echo "🔐 Setting up AWS OIDC for GitHub Actions..."
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if AWS CLI is installed and configured
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
print_status "AWS Account ID: $ACCOUNT_ID"

# Get GitHub repository information
read -p "Enter GitHub repository (owner/repo, e.g., 'YourUsername/NiroAgent'): " GITHUB_REPO
read -p "Enter GitHub organization/username: " GITHUB_ORG

if [ -z "$GITHUB_REPO" ] || [ -z "$GITHUB_ORG" ]; then
    print_error "GitHub repository and organization are required"
    exit 1
fi

echo "📋 Configuration:"
echo "  Repository: $GITHUB_REPO"
echo "  Organization: $GITHUB_ORG"
echo "  AWS Account: $ACCOUNT_ID"
echo ""

# Create OIDC Identity Provider
echo "🔗 Creating OIDC Identity Provider..."

# Check if OIDC provider already exists
OIDC_EXISTS=$(aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn" --output text)

if [ -n "$OIDC_EXISTS" ]; then
    print_warning "OIDC provider already exists: $OIDC_EXISTS"
    OIDC_PROVIDER_ARN="$OIDC_EXISTS"
else
    OIDC_PROVIDER_ARN=$(aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --client-id-list sts.amazonaws.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
        --query 'OpenIDConnectProviderArn' \
        --output text)
    print_status "Created OIDC provider: $OIDC_PROVIDER_ARN"
fi

# Create IAM Role for GitHub Actions
echo "👤 Creating IAM Role for GitHub Actions..."

ROLE_NAME="GitHubActions-NiroAgent-Role"
POLICY_NAME="GitHubActions-NiroAgent-Policy"

# Trust policy for the role
cat > /tmp/github-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "$OIDC_PROVIDER_ARN"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": [
                        "repo:$GITHUB_REPO:ref:refs/heads/main",
                        "repo:$GITHUB_REPO:ref:refs/heads/develop",
                        "repo:$GITHUB_REPO:ref:refs/heads/staging",
                        "repo:$GITHUB_REPO:pull_request"
                    ]
                }
            }
        }
    ]
}
EOF

# Check if role exists
if aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    print_warning "Role $ROLE_NAME already exists, updating trust policy..."
    aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document file:///tmp/github-trust-policy.json
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/github-trust-policy.json \
        --description "Role for GitHub Actions to deploy Niro Agent Dashboard"
    print_status "Created IAM role: $ROLE_NAME"
fi

# Create permissions policy
cat > /tmp/github-permissions-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:CreateStack",
                "cloudformation:UpdateStack",
                "cloudformation:DeleteStack",
                "cloudformation:DescribeStacks",
                "cloudformation:DescribeStackEvents",
                "cloudformation:DescribeStackResources",
                "cloudformation:GetTemplate",
                "cloudformation:ValidateTemplate"
            ],
            "Resource": [
                "arn:aws:cloudformation:*:$ACCOUNT_ID:stack/niro-agent-dashboard-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:DeleteBucket",
                "s3:PutBucketPolicy",
                "s3:PutBucketWebsite",
                "s3:PutBucketCORS",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::niro-agent-dashboard-*",
                "arn:aws:s3:::niro-agent-dashboard-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateDistribution",
                "cloudfront:UpdateDistribution",
                "cloudfront:DeleteDistribution",
                "cloudfront:GetDistribution",
                "cloudfront:ListDistributions",
                "cloudfront:CreateOriginAccessControl",
                "cloudfront:GetOriginAccessControl",
                "cloudfront:DeleteOriginAccessControl",
                "cloudfront:CreateInvalidation",
                "cloudfront:GetInvalidation"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "lambda:CreateFunction",
                "lambda:UpdateFunctionCode",
                "lambda:UpdateFunctionConfiguration",
                "lambda:DeleteFunction",
                "lambda:GetFunction",
                "lambda:InvokeFunction",
                "lambda:AddPermission",
                "lambda:RemovePermission"
            ],
            "Resource": [
                "arn:aws:lambda:*:$ACCOUNT_ID:function:niro-dashboard-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeSecurityGroups",
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupIngress",
                "ssm:SendCommand",
                "ssm:GetCommandInvocation",
                "ssm:DescribeInstanceInformation"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:DeleteRole",
                "iam:GetRole",
                "iam:PassRole"
            ],
            "Resource": [
                "arn:aws:iam::$ACCOUNT_ID:role/niro-dashboard-*",
                "arn:aws:iam::$ACCOUNT_ID:role/lambda-*"
            ]
        }
    ]
}
EOF

# Attach policy to role
if aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" > /dev/null 2>&1; then
    print_warning "Policy $POLICY_NAME already exists, updating..."
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/github-permissions-policy.json
else
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/github-permissions-policy.json
    print_status "Attached permissions policy to role"
fi

# Get role ARN
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

# Clean up temp files
rm -f /tmp/github-trust-policy.json /tmp/github-permissions-policy.json

echo ""
echo "🎉 OIDC Setup Complete!"
echo "======================="
echo ""
echo "📝 Add this secret to your GitHub repository:"
echo "   Secret Name: AWS_ROLE_ARN"
echo "   Secret Value: $ROLE_ARN"
echo ""
echo "🔗 To add the secret:"
echo "   1. Go to https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo "   2. Click 'New repository secret'"
echo "   3. Name: AWS_ROLE_ARN"
echo "   4. Value: $ROLE_ARN"
echo "   5. Click 'Add secret'"
echo ""
echo "✅ After adding the secret, your GitHub Actions workflows will be able to deploy to AWS!"
echo ""
print_status "Setup complete! You can now push to trigger automated deployments."
