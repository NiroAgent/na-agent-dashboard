# GitHub Actions Setup for Niro Agent Dashboard

This document describes the complete CI/CD setup for deploying the Niro Agent Dashboard using GitHub Actions and CloudFormation.

## 🏗️ Architecture

- **Frontend**: React SPA deployed to S3 + CloudFront
- **API**: Node.js server deployed to existing agent server (i-0af59b7036f7b0b77)
- **Infrastructure**: Managed via CloudFormation templates
- **CI/CD**: GitHub Actions with OIDC authentication

## 📋 Prerequisites

### 1. AWS OIDC Provider Setup

First, create an OIDC provider in AWS IAM to allow GitHub Actions to assume roles:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. GitHub Repository Secrets

Add these secrets to your GitHub repository settings:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_ROLE_ARN` | IAM role ARN for deployments | `arn:aws:iam::816454053517:role/NiroAgentDashboard-GitHubActions-dev` |

### 3. GitHub Repository Variables

Add these variables to your GitHub repository settings:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `AWS_REGION` | AWS region for deployments | `us-east-1` |

## 🚀 Deployment Workflows

### Infrastructure Deployment (`deploy-infrastructure.yml`)

**Triggers:**
- Push to `main`, `staging`, or `dev` branches (when infrastructure files change)
- Manual dispatch with environment selection
- Pull requests to `main` (validation only)

**Jobs:**
1. **Validate**: Lint and validate CloudFormation templates
2. **Deploy Dev**: Deploy to development environment (dev branch)
3. **Deploy Staging**: Deploy to staging environment (staging branch)  
4. **Deploy Prod**: Deploy to production environment (main branch)

### Application Deployment (`deploy-application.yml`)

**Triggers:**
- Push to `main`, `staging`, or `dev` branches (when application code changes)
- Manual dispatch with environment selection

**Jobs:**
1. **Test**: Run unit tests and build frontend
2. **Deploy Dev**: Deploy application to development
3. **Deploy Staging**: Deploy application to staging
4. **Deploy Prod**: Deploy application to production

## 🌍 Environment Strategy

### Development (`dev` branch)
- **Stack Name**: `niro-agent-dashboard-dev`
- **Domain**: Uses CloudFront default domain
- **Auto-deploys**: On push to `dev` branch
- **Purpose**: Feature development and testing

### Staging (`staging` branch)
- **Stack Name**: `niro-agent-dashboard-staging`
- **Domain**: `staging-dashboard.niroagent.com` (configurable)
- **Auto-deploys**: On push to `staging` branch  
- **Purpose**: Pre-production testing

### Production (`main` branch)
- **Stack Name**: `niro-agent-dashboard-prod`
- **Domain**: `dashboard.niroagent.com` (configurable)
- **Auto-deploys**: On push to `main` branch
- **Purpose**: Live production environment

## 📁 File Structure

```
na-agent-dashboard/
├── .github/
│   └── workflows/
│       ├── deploy-infrastructure.yml
│       └── deploy-application.yml
├── infrastructure/
│   ├── dashboard-infrastructure.yaml
│   ├── parameters-dev.json
│   ├── parameters-staging.json
│   └── parameters-prod.json
├── api/
│   ├── server.js
│   ├── package.json
│   └── ...
├── mfe/
│   ├── src/
│   ├── package.json
│   └── ...
├── deploy-infrastructure.sh
├── deploy-application.sh
├── deploy-complete.sh
├── deployment.config
└── README.md
```

## 🔧 Local Development Deployment

### Quick Start
```bash
# Deploy complete environment locally
chmod +x deploy-complete.sh
./deploy-complete.sh dev
```

### Step-by-Step
```bash
# 1. Deploy infrastructure only
./deploy-infrastructure.sh dev

# 2. Deploy application only  
./deploy-application.sh dev

# 3. Run tests
./run-tests.sh
```

## 🔐 Security Configuration

### IAM Role Permissions

The GitHub Actions role includes minimal required permissions:

- **S3**: Read/write to frontend bucket
- **CloudFront**: Create invalidations  
- **EC2**: Describe instances and security groups
- **SSM**: Send commands to agent server
- **CloudFormation**: Deploy and manage stacks
- **Logs**: Create and write to CloudWatch logs

### Security Groups

The CloudFormation template automatically:
- Opens port 7777 for API access
- Restricts access based on security group rules
- Maintains existing agent server security

## 📊 Monitoring and Troubleshooting

### GitHub Actions
- View workflow runs in GitHub Actions tab
- Check job logs for detailed deployment information
- Use manual dispatch for targeted deployments

### AWS Infrastructure
```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name niro-agent-dashboard-dev

# View stack events
aws cloudformation describe-stack-events --stack-name niro-agent-dashboard-dev

# Check API health
curl http://98.81.93.132:7777/health
```

### Agent Server
```bash
# SSH to agent server
ssh ec2-user@98.81.93.132

# Check PM2 status
pm2 status

# View API logs
pm2 logs niro-agent-dashboard-api

# Restart API
pm2 restart niro-agent-dashboard-api
```

## 🔄 Rollback Procedures

### Frontend Rollback
```bash
# Revert to previous S3 version
aws s3api list-object-versions --bucket niro-agent-dashboard-dev-816454053517
aws s3api copy-object --copy-source "bucket/key?versionId=xxx" --key key --bucket bucket

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id ABCDEFG --paths "/*"
```

### API Rollback
```bash
# SSH to server and revert
ssh ec2-user@98.81.93.132
pm2 stop niro-agent-dashboard-api
# Restore previous version and restart
```

### Infrastructure Rollback
```bash
# Revert CloudFormation stack
aws cloudformation cancel-update-stack --stack-name niro-agent-dashboard-dev
# Or deploy previous template version
```

## 💰 Cost Optimization

This deployment is designed for minimal additional cost:

- **S3 + CloudFront**: ~$1-2/month for static hosting
- **API Hosting**: $0 (uses existing agent server)  
- **CloudFormation**: No additional charges
- **Total**: ~$1-2/month additional cost

## 🚀 Getting Started

1. **Setup AWS OIDC Provider** (one-time)
2. **Configure GitHub Secrets** (one-time)
3. **Push to dev branch** - triggers automatic deployment
4. **Monitor GitHub Actions** - check deployment progress
5. **Access dashboard** - use URLs from deployment outputs

The system is now fully automated and repeatable! 🎉
