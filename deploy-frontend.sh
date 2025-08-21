#!/bin/bash

# Frontend S3 Deployment Script
# Deploys React frontend to S3 static website

set -e

# Configuration
S3_BUCKET="niro-agent-dashboard-frontend"
CLOUDFRONT_DISTRIBUTION_ID=""  # Will be set after CloudFront creation
AWS_REGION="us-east-1"
API_ENDPOINT="http://98.81.93.132:7777"  # Agent server public IP

echo "🚀 Starting Frontend Deployment to S3..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Create S3 bucket if it doesn't exist
echo "📦 Creating S3 bucket: $S3_BUCKET"
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION"
    echo "✅ Created S3 bucket: $S3_BUCKET"
else
    echo "✅ S3 bucket already exists: $S3_BUCKET"
fi

# Configure bucket for static website hosting
echo "🌐 Configuring static website hosting..."
aws s3api put-bucket-website --bucket "$S3_BUCKET" --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
}'

# Set bucket policy for public read access
echo "🔓 Setting bucket policy for public access..."
aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::'"$S3_BUCKET"'/*"
        }
    ]
}'

# Update frontend configuration for production API endpoint
echo "⚙️ Updating frontend configuration..."
cd mfe

# Create production environment file
cat > .env.production << EOF
VITE_API_BASE_URL=$API_ENDPOINT
VITE_WS_URL=$API_ENDPOINT
VITE_ENVIRONMENT=production
EOF

# Update the useExternalData hook to use environment variables
cat > src/hooks/useExternalData.ts << 'EOF'
import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Agent {
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  platform: string;
  location: string;
  cost: number;
  metrics: {
    cpuUtilization: number;
    memoryUsage: number;
    networkTraffic: number;
    responseTime: number;
  };
  instanceId?: string;
  lastSeen?: string;
}

interface DashboardData {
  success: boolean;
  totalAgents: number;
  activeAgents: number;
  agents: Agent[];
  totalCost: number;
  costSavings: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7777';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:7777';

export const useExternalData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/api/dashboard/agents`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
          setLoading(false);
          
          // Retry after 5 seconds
          retryTimeout = setTimeout(fetchData, 5000);
        }
      }
    };

    const setupWebSocket = () => {
      try {
        const newSocket = io(WS_URL, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
        });

        newSocket.on('connect', () => {
          console.log('WebSocket connected');
          setError(null);
        });

        newSocket.on('agentUpdate', (updatedData: DashboardData) => {
          if (mounted) {
            setData(updatedData);
          }
        });

        newSocket.on('disconnect', () => {
          console.log('WebSocket disconnected');
        });

        newSocket.on('connect_error', (err) => {
          console.error('WebSocket connection error:', err);
        });

        setSocket(newSocket);
      } catch (err) {
        console.error('WebSocket setup error:', err);
      }
    };

    // Initial data fetch
    fetchData();
    
    // Setup WebSocket for real-time updates
    setupWebSocket();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return { data, loading, error };
};
EOF

# Build the production version
echo "🔨 Building production frontend..."
npm run build

# Deploy to S3
echo "☁️ Uploading to S3..."
aws s3 sync dist/ s3://"$S3_BUCKET"/ --delete

# Get the website URL
WEBSITE_URL="http://$S3_BUCKET.s3-website-$AWS_REGION.amazonaws.com"

echo ""
echo "✅ Frontend deployment complete!"
echo "📍 Website URL: $WEBSITE_URL"
echo "🔗 API Endpoint: $API_ENDPOINT"
echo ""
echo "Next steps:"
echo "1. Configure CloudFront distribution for HTTPS and better performance"
echo "2. Deploy API to agent server (98.81.93.132)"
echo ""
