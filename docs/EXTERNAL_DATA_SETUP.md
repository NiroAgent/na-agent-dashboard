# Real External Data Integration Setup

This dashboard now connects to **REAL EXTERNAL DATA SOURCES** instead of simulated data.

## 🔌 **External Data Sources**

### **AWS Services (Primary Sources)**
- **AWS EC2**: Live instances with agent tags
- **AWS ECS**: Running tasks and services  
- **AWS Batch**: Job queues and executions
- **AWS CloudWatch**: Real metrics (CPU, Memory, Network)
- **AWS Cost Explorer**: Actual cost data

### **External APIs**
- **Policy Engine**: External policy service for compliance
- **Monitoring APIs**: Datadog, New Relic, or custom monitoring
- **GitHub API**: Repository and issue data
- **Slack/Teams**: Notification webhooks

## ⚙️ **Configuration Required**

### **1. AWS Credentials**
```bash
# Set these environment variables:
export AWS_ACCESS_KEY_ID="your_real_aws_key"
export AWS_SECRET_ACCESS_KEY="your_real_aws_secret"
export AWS_REGION="us-east-1"
```

### **2. External Service URLs**
```bash
# Policy Engine
export POLICY_ENGINE_URL="http://your-policy-engine.com:8080"
export POLICY_ENGINE_TOKEN="your_api_token"

# Monitoring Services
export DATADOG_API_URL="https://api.datadoghq.com"
export DATADOG_API_KEY="your_datadog_key"

# GitHub Integration
export GITHUB_TOKEN="your_github_token"
```

### **3. Agent Tagging**
Tag your AWS resources for discovery:
```bash
# EC2 Instances
aws ec2 create-tags --resources i-1234567890abcdef0 --tags Key=AgentType,Value=developer

# ECS Services  
aws ecs put-attributes --cluster default --attributes name=AgentType,value=architect
```

## 🚀 **What You'll See**

### **Real Data Sources Connected:**
- ✅ **AWS EC2 Instances**: Live running/stopped agents
- ✅ **CloudWatch Metrics**: Real CPU, memory, network usage  
- ✅ **Cost Data**: Actual hourly/daily/monthly costs
- ✅ **Policy Engine**: Live compliance assessments
- ✅ **Health Checks**: External service connectivity
- ✅ **Real Timestamps**: Actual launch times and status changes

### **Live Updates Every 30 Seconds:**
- Agent status from AWS APIs
- Real-time metrics from CloudWatch
- Policy assessments from external engine
- Cost calculations from AWS billing
- Health checks to external services

## 🔍 **Data Source Status Dashboard**

The dashboard shows:
- **Connected Sources**: AWS EC2, ECS, CloudWatch, Policy Engine
- **Response Times**: Actual API response latency  
- **Error Messages**: Real connectivity issues
- **Last Update**: Timestamps from external services

## 🛠 **Setup Steps**

1. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter your real AWS credentials
   ```

2. **Set Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your real service URLs and tokens
   ```

3. **Tag Your Infrastructure**:
   ```bash
   # Tag EC2 instances for agent discovery
   aws ec2 create-tags --resources i-xxx --tags Key=AgentType,Value=developer
   ```

4. **Deploy Policy Engine** (if using):
   ```bash
   # Deploy your external policy service
   # Configure API endpoint in .env
   ```

5. **Start Dashboard**:
   ```bash
   npm run build
   npm start
   ```

## 📊 **Expected Data Flow**

```
External AWS Account → API Calls → Dashboard Backend → Live Data
External Policy Engine → REST API → Policy Compliance
External Monitoring → Health Checks → System Status
```

## ⚠️ **Important Notes**

- **No Simulation**: All data comes from real external sources
- **API Costs**: AWS API calls incur minimal charges
- **Credentials Required**: Must have valid AWS and service credentials
- **Network Access**: Dashboard needs internet access to external APIs
- **Rate Limits**: Respects AWS and external service rate limits

## 🔧 **Troubleshooting**

### **No Agents Found:**
- Check AWS credentials are valid
- Verify instances are tagged with `AgentType`
- Ensure correct AWS region is configured

### **Policy Data Missing:**
- Verify `POLICY_ENGINE_URL` is accessible
- Check API token is valid
- Confirm policy engine is running

### **Metrics Unavailable:**
- CloudWatch agent must be installed on instances
- Check CloudWatch permissions
- Verify metric namespaces exist

## 📈 **Real-Time Features**

- **Live Agent Discovery**: Finds real AWS resources
- **Real Metrics**: CloudWatch CPU, memory, network data
- **Actual Costs**: AWS billing data integration
- **External Compliance**: Real policy engine assessments
- **Service Health**: Live external API connectivity checks

This is now a **REAL LIVE SYSTEM** connecting to actual external data sources!
