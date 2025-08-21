#!/bin/bash

# Test runner wrapper with timeout and proper error handling
echo "🚀 Starting comprehensive Playwright test suite..."
echo "📊 API Server: http://localhost:7777"
echo "🌐 Frontend: http://localhost:5173"
echo "⏰ Test timeout: 300 seconds"

# Function to check if servers are running
check_servers() {
    echo "🔍 Checking servers..."
    
    # Check API server
    if curl -s -f http://localhost:7777/health > /dev/null; then
        echo "✅ API server is running"
    else
        echo "❌ API server not responding"
        return 1
    fi
    
    # Check frontend
    if curl -s -f http://localhost:5173 > /dev/null; then
        echo "✅ Frontend is running"
    else
        echo "❌ Frontend not responding"
        return 1
    fi
    
    return 0
}

# Function to run tests with timeout
run_tests_with_timeout() {
    local test_file="$1"
    local timeout_seconds=120
    
    echo "🧪 Running: $test_file (timeout: ${timeout_seconds}s)"
    
    timeout ${timeout_seconds}s npx playwright test "$test_file" --reporter=line || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo "⏰ Test timed out: $test_file"
        else
            echo "❌ Test failed: $test_file (exit code: $exit_code)"
        fi
        return $exit_code
    }
}

# Main execution
main() {
    # Check if servers are running
    if ! check_servers; then
        echo "❌ Servers not ready. Please start them first:"
        echo "   API: cd api && npm run dev"
        echo "   Frontend: cd mfe && npm run dev"
        exit 1
    fi
    
    echo ""
    echo "🎯 Running critical tests..."
    
    # Test real data integration first
    echo "📡 Testing real data integration..."
    run_tests_with_timeout "tests/real-agents.spec.ts"
    real_test_result=$?
    
    # Test system performance
    echo "⚡ Testing system performance..."
    run_tests_with_timeout "tests/system-performance.spec.ts"
    perf_test_result=$?
    
    # Test multiple agents coordination
    echo "🤝 Testing multiple agents..."
    run_tests_with_timeout "tests/multiple-agents.spec.ts"
    multi_test_result=$?
    
    # Summary
    echo ""
    echo "📋 Test Results Summary:"
    echo "========================"
    
    if [ $real_test_result -eq 0 ]; then
        echo "✅ Real Data Integration: PASSED"
    else
        echo "❌ Real Data Integration: FAILED"
    fi
    
    if [ $perf_test_result -eq 0 ]; then
        echo "✅ System Performance: PASSED"
    else
        echo "❌ System Performance: FAILED"
    fi
    
    if [ $multi_test_result -eq 0 ]; then
        echo "✅ Multiple Agents: PASSED"
    else
        echo "❌ Multiple Agents: FAILED"
    fi
    
    # Overall result
    if [ $real_test_result -eq 0 ] && [ $perf_test_result -eq 0 ] && [ $multi_test_result -eq 0 ]; then
        echo ""
        echo "🎉 ALL TESTS PASSED! Ready for deployment."
        return 0
    else
        echo ""
        echo "⚠️  Some tests failed. Check logs above."
        return 1
    fi
}

# Execute main function
main "$@"
