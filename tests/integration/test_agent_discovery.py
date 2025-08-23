#!/usr/bin/env python3
"""
Integration tests for agent discovery functionality.
Tests the real agent server and its API endpoints.
"""

import requests
import json
import time
import os
from typing import Dict, List, Any

class AgentDiscoveryIntegrationTest:
    def __init__(self, base_url: str = "http://localhost:7778"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []

    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "passed": passed,
            "message": message,
            "timestamp": time.time()
        }
        self.test_results.append(result)
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")

    def test_health_endpoint(self) -> bool:
        """Test health endpoint returns expected data"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code != 200:
                self.log_test("health_endpoint", False, f"Status code {response.status_code}")
                return False
            
            data = response.json()
            required_fields = ["message", "status", "port", "agents_discovered"]
            
            for field in required_fields:
                if field not in data:
                    self.log_test("health_endpoint", False, f"Missing field: {field}")
                    return False
            
            if data["agents_discovered"] < 1:
                self.log_test("health_endpoint", False, "No agents discovered")
                return False
            
            self.log_test("health_endpoint", True, f"Health check passed, {data['agents_discovered']} agents found")
            return True
            
        except Exception as e:
            self.log_test("health_endpoint", False, f"Exception: {str(e)}")
            return False

    def test_agents_endpoint(self) -> bool:
        """Test agents endpoint returns valid agent data"""
        try:
            response = self.session.get(f"{self.base_url}/api/agents", timeout=15)
            
            if response.status_code != 200:
                self.log_test("agents_endpoint", False, f"Status code {response.status_code}")
                return False
            
            agents = response.json()
            
            if not isinstance(agents, list):
                self.log_test("agents_endpoint", False, "Response is not a list")
                return False
            
            if len(agents) < 1:
                self.log_test("agents_endpoint", False, "No agents returned")
                return False
            
            # Validate first agent structure
            agent = agents[0]
            required_fields = ["id", "name", "status", "type", "file_path"]
            
            for field in required_fields:
                if field not in agent:
                    self.log_test("agents_endpoint", False, f"Agent missing field: {field}")
                    return False
            
            self.log_test("agents_endpoint", True, f"Found {len(agents)} valid agents")
            return True
            
        except Exception as e:
            self.log_test("agents_endpoint", False, f"Exception: {str(e)}")
            return False

    def test_agent_types_distribution(self) -> bool:
        """Test that we have a good distribution of agent types"""
        try:
            response = self.session.get(f"{self.base_url}/api/agents", timeout=15)
            agents = response.json()
            
            # Count agent types
            type_counts = {}
            for agent in agents:
                agent_type = agent.get("type", "unknown")
                type_counts[agent_type] = type_counts.get(agent_type, 0) + 1
            
            # We should have at least 3 different types
            if len(type_counts) < 3:
                self.log_test("agent_types", False, f"Only {len(type_counts)} agent types found")
                return False
            
            # Check for specific expected types
            expected_types = ["qa", "developer", "github-integration", "autonomous"]
            found_types = 0
            for expected in expected_types:
                if any(expected in agent_type for agent_type in type_counts.keys()):
                    found_types += 1
            
            if found_types < 2:
                self.log_test("agent_types", False, f"Only found {found_types} expected types")
                return False
            
            self.log_test("agent_types", True, f"Found {len(type_counts)} types: {list(type_counts.keys())}")
            return True
            
        except Exception as e:
            self.log_test("agent_types", False, f"Exception: {str(e)}")
            return False

    def test_agent_data_quality(self) -> bool:
        """Test that agent data has good quality metrics"""
        try:
            response = self.session.get(f"{self.base_url}/api/agents", timeout=15)
            agents = response.json()
            
            issues = []
            
            for i, agent in enumerate(agents[:10]):  # Test first 10 agents
                # Check file paths exist and are reasonable
                file_path = agent.get("file_path", "")
                if not file_path or not file_path.endswith(".py"):
                    issues.append(f"Agent {i} has invalid file path")
                
                # Check status is valid
                status = agent.get("status", "")
                if status not in ["active", "dormant", "error", "running"]:
                    issues.append(f"Agent {i} has invalid status: {status}")
                
                # Check metrics are reasonable
                cpu = agent.get("cpuUsage", 0)
                memory = agent.get("memoryUsage", 0)
                if cpu < 0 or cpu > 100 or memory < 0 or memory > 100:
                    issues.append(f"Agent {i} has unrealistic metrics")
            
            if issues:
                self.log_test("data_quality", False, f"Issues: {', '.join(issues[:3])}")
                return False
            
            self.log_test("data_quality", True, f"Data quality check passed for {len(agents)} agents")
            return True
            
        except Exception as e:
            self.log_test("data_quality", False, f"Exception: {str(e)}")
            return False

    def test_response_performance(self) -> bool:
        """Test API response times are acceptable"""
        try:
            # Test health endpoint speed
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            health_time = time.time() - start_time
            
            if health_time > 2.0:
                self.log_test("response_performance", False, f"Health endpoint too slow: {health_time:.2f}s")
                return False
            
            # Test agents endpoint speed
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/api/agents", timeout=10)
            agents_time = time.time() - start_time
            
            if agents_time > 5.0:
                self.log_test("response_performance", False, f"Agents endpoint too slow: {agents_time:.2f}s")
                return False
            
            self.log_test("response_performance", True, f"Health: {health_time:.2f}s, Agents: {agents_time:.2f}s")
            return True
            
        except Exception as e:
            self.log_test("response_performance", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration tests"""
        print("🧪 Starting Agent Discovery Integration Tests")
        print(f"Testing against: {self.base_url}")
        
        tests = [
            self.test_health_endpoint,
            self.test_agents_endpoint,
            self.test_agent_types_distribution,
            self.test_agent_data_quality,
            self.test_response_performance
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        # Save results
        results = {
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": total - passed,
            "success_rate": passed / total,
            "test_details": self.test_results,
            "timestamp": time.time(),
            "base_url": self.base_url
        }
        
        # Write results file
        os.makedirs("test-results", exist_ok=True)
        with open("test-results/integration-agent-discovery.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        return results

def main():
    """Main test runner"""
    base_url = os.environ.get("API_ENDPOINT", "http://localhost:7778")
    
    tester = AgentDiscoveryIntegrationTest(base_url)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results["success_rate"] < 1.0:
        print("❌ Some tests failed")
        exit(1)
    else:
        print("✅ All tests passed")
        exit(0)

if __name__ == "__main__":
    main()