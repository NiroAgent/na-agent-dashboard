#!/bin/bash

echo "🧪 Manual Testing Script - Quick Verification"
echo "=============================================="

# Test API
echo "1. Testing API Health..."
if curl -s http://localhost:7778/health | jq . 2>/dev/null; then
    echo "✅ API Health: OK"
else
    echo "❌ API Health: FAILED"
fi

echo ""

# Test Agent Count
echo "2. Testing Agent Count..."
AGENT_COUNT=$(curl -s http://localhost:7778/api/agents | jq 'length' 2>/dev/null)
if [ "$AGENT_COUNT" ] && [ "$AGENT_COUNT" -gt 0 ]; then
    echo "✅ Agent Count: $AGENT_COUNT agents found"
else
    echo "❌ Agent Count: FAILED"
fi

echo ""

# Test Frontend
echo "3. Testing Frontend..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend: Responding"
else
    echo "❌ Frontend: Not responding"
fi

echo ""

# Run integration test
echo "4. Running Integration Test..."
if python3 tests/integration/test_agent_discovery.py >/dev/null 2>&1; then
    echo "✅ Integration Test: PASSED"
else
    echo "❌ Integration Test: FAILED"
fi

echo ""
echo "📋 Manual test complete!"