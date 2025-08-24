# Production Deployment Guide

## 🚀 Enterprise-Grade Agent Monitoring System

This guide covers the complete production deployment of the Real Agent Discovery and Monitoring System with advanced alerting, CI/CD pipelines, and AWS infrastructure.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Deployment](#infrastructure-deployment)
3. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
4. [Alert Configuration](#alert-configuration)
5. [Monitoring Dashboard](#monitoring-dashboard)
6. [Maintenance & Operations](#maintenance--operations)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
```bash
# Core tools
aws --version          # AWS CLI v2.x
python3 --version      # Python 3.8+
node --version         # Node.js 18+
git --version          # Git latest

# Python packages
pip install requests psutil flask flask-cors boto3
```

### AWS Setup
```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
aws iam get-user
```

### GitHub Setup
```bash
# Set up repository secrets (in GitHub web interface)
AWS_ACCESS_KEY_ID: your-aws-access-key
AWS_SECRET_ACCESS_KEY: your-aws-secret-key
```

## Infrastructure Deployment

### 🏗️ Automatic Deployment

#### Using Deployment Script (Recommended)
```bash
cd na-agent-dashboard

# Deploy to production
chmod +x scripts/deploy-production-monitoring.sh
./scripts/deploy-production-monitoring.sh

# Deploy to staging
ENVIRONMENT=staging ./scripts/deploy-production-monitoring.sh
```

#### Manual CloudFormation Deployment
```bash
# Create stack
aws cloudformation create-stack \
  --stack-name niro-agent-monitoring-prod \
  --template-body file://infrastructure/production-monitoring-infrastructure.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=InstanceType,ParameterValue=t3.small \
    ParameterKey=KeyPairName,ParameterValue=niro-agent-keypair \
  --capabilities CAPABILITY_IAM

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name niro-agent-monitoring-prod
```

### 📊 Infrastructure Components

| Component | Purpose | Specifications |
|-----------|---------|---------------|
| **EC2 Instance** | Monitoring server | t3.small, Amazon Linux 2023 |
| **VPC** | Network isolation | 10.0.0.0/16 CIDR |
| **Security Groups** | Traffic control | Ports 22, 7778, 8090, 3000-3001 |
| **IAM Role** | Permissions | CloudWatch, SNS, SSM access |
| **SNS Topic** | Alert notifications | Email/SMS integration |
| **CloudWatch Alarms** | System monitoring | CPU, Memory, Status checks |

### 🔗 Access URLs

After deployment, you'll get:
- **Agent Discovery API**: `http://<instance-ip>:7778`
- **Production Dashboard**: `http://<instance-ip>:8090`
- **SSH Access**: `ssh -i ~/.ssh/keypair.pem ec2-user@<instance-ip>`

## CI/CD Pipeline Setup

### 🔄 GitHub Actions Workflow

The pipeline includes:
1. **Health Check & Validation**
2. **Security Scanning**
3. **Staging Deployment**
4. **Production Deployment** (manual approval)
5. **Post-deployment Monitoring**

### Pipeline Configuration

#### Automatic Triggers
```yaml
# Triggers on:
- Push to main branch (staging)
- Manual workflow dispatch (production)
- Pull requests (validation only)
```

#### Manual Production Deployment
```bash
# Via GitHub web interface:
Actions → Production Deployment Pipeline → Run workflow
Environment: production
```

#### Pipeline Monitoring
```bash
# Check pipeline status
gh run list --workflow="production-deployment.yml"

# Get deployment outputs
gh run view --log
```

## Alert Configuration

### 🚨 Alert Manager Setup

#### Configure Alert Channels

1. **Email Alerts**
```json
{
  "email": {
    "config": {
      "smtp_server": "smtp.gmail.com",
      "smtp_port": 587,
      "username": "your-monitoring@company.com",
      "password": "your-app-password",
      "from_email": "niro-agent-monitor@company.com",
      "to_emails": ["admin@company.com", "devops@company.com"]
    },
    "enabled": true
  }
}
```

2. **Slack Integration**
```json
{
  "slack": {
    "config": {
      "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
      "channel": "#production-alerts",
      "username": "Agent Monitor"
    },
    "enabled": true
  }
}
```

3. **AWS SNS**
```json
{
  "sns": {
    "config": {
      "topic_arn": "arn:aws:sns:us-east-1:123456789012:agent-alerts",
      "region": "us-east-1"
    },
    "enabled": true
  }
}
```

#### Alert Rules

| Rule | Threshold | Level | Channels |
|------|-----------|-------|----------|
| High Response Time | >5000ms | Warning | Email, Slack |
| Agent Down | <3 active | Critical | Email, Slack, SNS |
| High CPU | >80% | Warning | Email |
| High Memory | >85% | Warning | Email |
| System Critical | Health=critical | Emergency | All channels |

### 🔧 Configuration Management

```bash
# Edit alert configuration
nano config/alert-config.json

# Test alert configuration
python scripts/alert-manager.py

# Deploy configuration
# (Automatically deployed via CI/CD pipeline)
```

## Monitoring Dashboard

### 📈 Production Dashboard Features

#### Real-time Metrics
- **System Health**: Overall status with color-coded indicators
- **Agent Status**: Live daemon agent monitoring
- **Resource Usage**: CPU, Memory, Disk utilization
- **Performance**: Response times, uptime tracking
- **Alert Summary**: Active alerts with severity levels

#### Dashboard Access
```bash
# Local development
http://localhost:8090

# Production
http://<production-instance-ip>:8090

# API access
curl http://<instance-ip>:8090/api/data
```

### 📊 CloudWatch Integration

```bash
# View CloudWatch dashboard
aws cloudwatch get-dashboard --dashboard-name "NiroAgentProductionMonitoring"

# Custom metrics
aws cloudwatch put-metric-data \
  --namespace "AgentMonitoring" \
  --metric-data MetricName=ActiveAgents,Value=3,Unit=Count
```

## Maintenance & Operations

### 🔄 Regular Maintenance

#### Daily Tasks
```bash
# Health check
curl http://<instance>:7778/health

# Check active agents
curl http://<instance>:7778/api/agents | jq '.[] | select(.status=="active")'

# Review alerts
curl http://<instance>:8090/api/data | jq '.alert_summary'
```

#### Weekly Tasks
```bash
# Update system packages
ssh ec2-user@<instance> 'sudo dnf update -y'

# Restart services
ssh ec2-user@<instance> 'sudo systemctl restart real-agent-server'

# Check disk usage
ssh ec2-user@<instance> 'df -h'
```

#### Monthly Tasks
- Review alert thresholds and adjust if needed
- Analyze performance trends
- Update SSL certificates
- Security patching

### 📋 Backup Strategy

```bash
# Configuration backup
aws s3 cp config/alert-config.json s3://your-backup-bucket/config/
aws s3 cp infrastructure/ s3://your-backup-bucket/infrastructure/ --recursive

# System backup
ssh ec2-user@<instance> 'sudo tar -czf /tmp/agent-monitor-backup.tar.gz /opt/agent-monitoring'
```

### 🔄 Updates & Rollbacks

#### Update Deployment
```bash
# Via CI/CD pipeline (recommended)
git push origin main

# Manual update
./scripts/deploy-production-monitoring.sh
```

#### Rollback Procedure
```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack --stack-name niro-agent-monitoring-prod

# Or deploy previous version
git checkout <previous-commit>
./scripts/deploy-production-monitoring.sh
```

## Troubleshooting

### 🔍 Common Issues

#### 1. Agent Discovery Not Working
```bash
# Check service status
ssh ec2-user@<instance> 'sudo systemctl status real-agent-server'

# Check logs
ssh ec2-user@<instance> 'sudo journalctl -u real-agent-server -f'

# Restart service
ssh ec2-user@<instance> 'sudo systemctl restart real-agent-server'
```

#### 2. High Response Times
```bash
# Check system resources
ssh ec2-user@<instance> 'top'
ssh ec2-user@<instance> 'iostat -x 1'

# Scale up instance if needed
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --instance-type Value=t3.medium
```

#### 3. Alerts Not Working
```bash
# Test alert configuration
python scripts/alert-manager.py

# Check SNS topic
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789012:agent-alerts

# Verify SMTP settings
python -c "import smtplib; smtplib.SMTP('smtp.gmail.com', 587).connect()"
```

#### 4. Dashboard Not Loading
```bash
# Check port availability
ssh ec2-user@<instance> 'netstat -tulpn | grep :8090'

# Check security groups
aws ec2 describe-security-groups \
  --group-ids sg-1234567890abcdef0 \
  --query 'SecurityGroups[0].IpPermissions'
```

### 📞 Support Escalation

#### Level 1: Automated Recovery
- Service auto-restart via systemd
- Instance auto-recovery via CloudWatch
- Alert acknowledgment

#### Level 2: Manual Intervention
- SSH access for debugging
- Log analysis and service restart
- Configuration updates

#### Level 3: Infrastructure Changes
- Instance scaling or replacement
- Network configuration changes
- Full system rollback

### 📊 Performance Baselines

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Response Time | <2000ms | <5000ms | >5000ms |
| CPU Usage | <50% | <80% | >80% |
| Memory Usage | <70% | <85% | >85% |
| Active Agents | 3+ | 2-3 | <2 |
| Disk Usage | <70% | <85% | >85% |

### 🔐 Security Considerations

#### Network Security
- Security groups restrict access to necessary ports only
- SSH key-based authentication required
- VPC isolation from internet except through Internet Gateway

#### Application Security
- API endpoints protected by security groups
- Sensitive data encrypted in transit
- Regular security patches applied

#### Monitoring Security
- CloudTrail logging enabled
- Access logging for all API calls
- Alert on suspicious activity patterns

## 📈 Scaling Considerations

### Horizontal Scaling
```yaml
# Multiple regions
Regions: [us-east-1, us-west-2, eu-west-1]

# Load balancer
LoadBalancer: Application Load Balancer
HealthCheck: /health endpoint
```

### Vertical Scaling
```bash
# Instance types by load
Light: t3.micro (testing)
Medium: t3.small (production)
Heavy: t3.medium (high-load)
```

### Database Scaling
```yaml
# For larger deployments
Database: Amazon RDS
Caching: Amazon ElastiCache
Storage: Amazon S3
```

---

## 🎯 Success Metrics

After following this guide, you should have:

✅ **Infrastructure**: Fully automated AWS deployment  
✅ **Monitoring**: Real-time agent monitoring with dashboards  
✅ **Alerts**: Multi-channel alerting system  
✅ **CI/CD**: Automated testing and deployment pipeline  
✅ **Operations**: Comprehensive maintenance procedures  
✅ **Security**: Production-grade security measures  

**🚀 Your production agent monitoring system is now enterprise-ready!**