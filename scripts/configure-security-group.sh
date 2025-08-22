#!/bin/bash

# Security Group Configuration Script
# Opens port 7777 for API access on agent server

set -e

# Configuration
INSTANCE_ID="i-0af59b7036f7b0b77"
API_PORT="7777"

echo "🔒 Configuring security group for API access..."

# Get the security group ID for the instance
SECURITY_GROUP_ID=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
    --output text)

echo "📋 Instance: $INSTANCE_ID"
echo "🛡️ Security Group: $SECURITY_GROUP_ID"

# Check if port is already open
if aws ec2 describe-security-groups \
    --group-ids "$SECURITY_GROUP_ID" \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`$API_PORT\`]" \
    --output text | grep -q "$API_PORT"; then
    echo "✅ Port $API_PORT is already open"
else
    echo "🔓 Opening port $API_PORT for API access..."
    
    # Add inbound rule for API port
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port "$API_PORT" \
        --cidr 0.0.0.0/0
    
    echo "✅ Port $API_PORT opened successfully"
fi

# Verify the rule
echo "🔍 Current security group rules:"
aws ec2 describe-security-groups \
    --group-ids "$SECURITY_GROUP_ID" \
    --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
    --output table

echo ""
echo "✅ Security group configuration complete!"
echo "🌐 API will be accessible at: http://98.81.93.132:$API_PORT"
echo ""
