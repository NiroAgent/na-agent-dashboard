#!/bin/bash

# Production Agent Monitoring Deployment Script
# Deploys real agent monitoring infrastructure to AWS

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
if [ "$ENVIRONMENT" = "staging" ]; then
    STACK_NAME="niro-agent-monitoring-staging"
    INSTANCE_TYPE="t3.micro"
else
    STACK_NAME="niro-agent-monitoring-prod"
    INSTANCE_TYPE="t3.small"
fi
TEMPLATE_FILE="infrastructure/production-monitoring-infrastructure.yaml"
KEY_PAIR_NAME="${KEY_PAIR_NAME:-niro-agent-keypair}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Check template file exists
    if [ ! -f "$TEMPLATE_FILE" ]; then
        log_error "Template file not found: $TEMPLATE_FILE"
        exit 1
    fi
    
    # Check if key pair exists
    if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" &> /dev/null; then
        log_warning "Key pair '$KEY_PAIR_NAME' not found."
        log_info "Creating new key pair..."
        
        aws ec2 create-key-pair \
            --key-name "$KEY_PAIR_NAME" \
            --query 'KeyMaterial' \
            --output text > ~/.ssh/${KEY_PAIR_NAME}.pem
        
        chmod 400 ~/.ssh/${KEY_PAIR_NAME}.pem
        log_success "Key pair created and saved to ~/.ssh/${KEY_PAIR_NAME}.pem"
    fi
    
    log_success "Prerequisites check completed"
}

# Validate CloudFormation template
validate_template() {
    log_info "Validating CloudFormation template..."
    
    if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE &> /dev/null; then
        log_success "Template validation passed"
    else
        log_error "Template validation failed"
        exit 1
    fi
}

# Deploy or update stack
deploy_stack() {
    log_info "Checking if stack exists..."
    
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
        log_info "Stack exists. Updating..."
        OPERATION="update"
        
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://$TEMPLATE_FILE \
            --parameters \
                ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
                ParameterKey=InstanceType,ParameterValue=$INSTANCE_TYPE \
                ParameterKey=KeyPairName,ParameterValue=$KEY_PAIR_NAME \
            --capabilities CAPABILITY_IAM
            
    else
        log_info "Stack does not exist. Creating..."
        OPERATION="create"
        
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://$TEMPLATE_FILE \
            --parameters \
                ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
                ParameterKey=InstanceType,ParameterValue=$INSTANCE_TYPE \
                ParameterKey=KeyPairName,ParameterValue=$KEY_PAIR_NAME \
            --capabilities CAPABILITY_IAM \
            --on-failure ROLLBACK
    fi
    
    log_info "Waiting for stack ${OPERATION} to complete..."
    
    if [ "$OPERATION" = "create" ]; then
        aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"
    else
        aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Stack ${OPERATION} completed successfully"
    else
        log_error "Stack ${OPERATION} failed"
        exit 1
    fi
}

# Get stack outputs
get_stack_outputs() {
    log_info "Retrieving stack outputs..."
    
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    MONITORING_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="MonitoringServerURL") | .OutputValue')
    DASHBOARD_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="MonitoringDashboardURL") | .OutputValue') 
    SSH_COMMAND=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="SSHCommand") | .OutputValue')
    SNS_TOPIC=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="SNSTopicArn") | .OutputValue')
    INSTANCE_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="InstanceId") | .OutputValue')
    
    echo
    log_success "=== DEPLOYMENT COMPLETED ==="
    echo
    echo "📊 Monitoring URLs:"
    echo "   Agent Discovery API: $MONITORING_URL"
    echo "   Production Dashboard: $DASHBOARD_URL"
    echo
    echo "🔧 Management:"
    echo "   SSH Command: $SSH_COMMAND"
    echo "   Instance ID: $INSTANCE_ID"
    echo "   SNS Topic: $SNS_TOPIC"
    echo
    echo "🏥 Health Check:"
    echo "   curl $MONITORING_URL/health"
    echo
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Wait a bit for services to start
    sleep 30
    
    # Test health endpoint
    if curl -f -s --max-time 10 "$MONITORING_URL/health" > /dev/null; then
        log_success "Health check passed"
        
        # Test agent discovery
        AGENT_COUNT=$(curl -s "$MONITORING_URL/api/agents" | jq length)
        log_success "Agent discovery working - $AGENT_COUNT agents found"
        
        # Test dashboard API
        if curl -f -s --max-time 10 "$MONITORING_URL/api/dashboard/agents" > /dev/null; then
            log_success "Dashboard API working"
        else
            log_warning "Dashboard API not responding"
        fi
        
    else
        log_warning "Health check failed - services may still be starting"
        log_info "Wait a few more minutes and try: curl $MONITORING_URL/health"
    fi
}

# Setup monitoring alerts
setup_alerts() {
    log_info "Setting up monitoring alerts..."
    
    # Subscribe to SNS topic (optional - requires email)
    if [ ! -z "$ALERT_EMAIL" ]; then
        aws sns subscribe \
            --topic-arn "$SNS_TOPIC" \
            --protocol email \
            --notification-endpoint "$ALERT_EMAIL"
        
        log_success "Email alerts configured for: $ALERT_EMAIL"
        log_info "Please confirm the subscription in your email"
    else
        log_info "Set ALERT_EMAIL environment variable to configure email alerts"
        log_info "SNS Topic ARN: $SNS_TOPIC"
    fi
}

# Main execution
main() {
    echo "🚀 Production Agent Monitoring Deployment"
    echo "========================================"
    echo
    echo "Stack Name: $STACK_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Instance Type: $INSTANCE_TYPE"
    echo "Key Pair: $KEY_PAIR_NAME"
    echo
    
    check_prerequisites
    validate_template
    deploy_stack
    get_stack_outputs
    test_deployment
    setup_alerts
    
    echo
    log_success "🎉 Production monitoring deployment completed!"
    echo
    echo "Next steps:"
    echo "1. Configure your DNS to point to the monitoring URLs"
    echo "2. Set up SSL certificates for HTTPS"
    echo "3. Configure backup and monitoring alerts"
    echo "4. Deploy your actual agent scripts to the server"
    echo
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    delete)
        log_warning "Deleting stack: $STACK_NAME"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            aws cloudformation delete-stack --stack-name "$STACK_NAME"
            log_info "Waiting for stack deletion..."
            aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME"
            log_success "Stack deleted successfully"
        else
            log_info "Deletion cancelled"
        fi
        ;;
    status)
        aws cloudformation describe-stacks --stack-name "$STACK_NAME" --output table
        ;;
    outputs)
        get_stack_outputs
        ;;
    test)
        get_stack_outputs
        test_deployment
        ;;
    *)
        echo "Usage: $0 [deploy|delete|status|outputs|test]"
        echo "  deploy  - Deploy or update the monitoring infrastructure"
        echo "  delete  - Delete the monitoring infrastructure"  
        echo "  status  - Show stack status"
        echo "  outputs - Show stack outputs"
        echo "  test    - Test the deployed infrastructure"
        exit 1
        ;;
esac