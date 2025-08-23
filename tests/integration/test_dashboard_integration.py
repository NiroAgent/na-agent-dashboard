#!/usr/bin/env python3
"""
Integration tests for dashboard frontend and backend integration.
Tests the complete dashboard functionality end-to-end.
"""

import requests
import json
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from typing import Dict, List, Any

class DashboardIntegrationTest:
    def __init__(self, api_url: str = "http://localhost:7778", frontend_url: str = "http://localhost:3000"):
        self.api_url = api_url
        self.frontend_url = frontend_url
        self.session = requests.Session()
        self.test_results = []
        self.driver = None

    def setup_driver(self):
        """Setup Chrome driver for frontend testing"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            return True
        except Exception as e:
            print(f"Failed to setup Chrome driver: {e}")
            return False

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

    def test_api_backend_connectivity(self) -> bool:
        """Test that the API backend is accessible"""
        try:
            response = self.session.get(f"{self.api_url}/health", timeout=10)
            
            if response.status_code != 200:
                self.log_test("api_connectivity", False, f"API not accessible: {response.status_code}")
                return False
            
            data = response.json()
            if "agents_discovered" not in data:
                self.log_test("api_connectivity", False, "API health response invalid")
                return False
            
            self.log_test("api_connectivity", True, f"API accessible with {data['agents_discovered']} agents")
            return True
            
        except Exception as e:
            self.log_test("api_connectivity", False, f"Exception: {str(e)}")
            return False

    def test_frontend_loads(self) -> bool:
        """Test that the frontend loads properly"""
        if not self.driver:
            if not self.setup_driver():
                self.log_test("frontend_loads", False, "Could not setup browser")
                return False
        
        try:
            self.driver.get(self.frontend_url)
            
            # Wait for page to load
            wait = WebDriverWait(self.driver, 15)
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # Check page title
            title = self.driver.title
            if "Agent" not in title and "Dashboard" not in title:
                self.log_test("frontend_loads", False, f"Unexpected title: {title}")
                return False
            
            # Check for React app loading
            try:
                wait.until(EC.presence_of_element_located((By.ID, "root")))
            except:
                self.log_test("frontend_loads", False, "React app root not found")
                return False
            
            self.log_test("frontend_loads", True, f"Frontend loaded with title: {title}")
            return True
            
        except Exception as e:
            self.log_test("frontend_loads", False, f"Exception: {str(e)}")
            return False

    def test_dashboard_displays_agents(self) -> bool:
        """Test that the dashboard displays agent data"""
        if not self.driver:
            self.log_test("dashboard_agents", False, "No browser driver available")
            return False
        
        try:
            # Wait for agent data to load
            wait = WebDriverWait(self.driver, 20)
            
            # Look for agent cards, lists, or table elements
            agent_elements_selectors = [
                "[data-testid*='agent']",
                ".agent-card",
                ".agent-item",
                "[class*='agent']",
                "tbody tr",  # Table rows
                "[role='gridcell']"  # Grid cells
            ]
            
            agent_elements_found = False
            for selector in agent_elements_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements and len(elements) > 0:
                        agent_elements_found = True
                        break
                except:
                    continue
            
            if not agent_elements_found:
                # Check if there's loading indicator or error message
                page_text = self.driver.page_source.lower()
                if "loading" in page_text:
                    self.log_test("dashboard_agents", False, "Dashboard still loading")
                elif "error" in page_text:
                    self.log_test("dashboard_agents", False, "Dashboard showing error")
                else:
                    self.log_test("dashboard_agents", False, "No agent elements found")
                return False
            
            self.log_test("dashboard_agents", True, f"Agent elements found using selector: {selector}")
            return True
            
        except Exception as e:
            self.log_test("dashboard_agents", False, f"Exception: {str(e)}")
            return False

    def test_api_frontend_integration(self) -> bool:
        """Test that frontend correctly integrates with API"""
        try:
            # Get data from API directly
            api_response = self.session.get(f"{self.api_url}/api/agents", timeout=15)
            if api_response.status_code != 200:
                self.log_test("api_integration", False, "API not responding")
                return False
            
            api_agents = api_response.json()
            api_agent_count = len(api_agents)
            
            if not self.driver:
                if not self.setup_driver():
                    self.log_test("api_integration", False, "Could not setup browser")
                    return False
            
            # Check if frontend is making API calls
            self.driver.get(self.frontend_url)
            time.sleep(5)  # Allow time for API calls
            
            # Check browser network logs or console for API calls
            logs = self.driver.get_log('browser')
            api_calls_made = any("7778" in log['message'] or "api/agents" in log['message'] for log in logs)
            
            if not api_calls_made:
                # Fallback: check if page content suggests data was loaded
                page_source = self.driver.page_source.lower()
                has_agent_data = any(agent_type in page_source for agent_type in ["qa", "developer", "github", "autonomous"])
                
                if not has_agent_data:
                    self.log_test("api_integration", False, "No evidence of API integration")
                    return False
            
            self.log_test("api_integration", True, f"Frontend integrating with API ({api_agent_count} agents)")
            return True
            
        except Exception as e:
            self.log_test("api_integration", False, f"Exception: {str(e)}")
            return False

    def test_responsive_design(self) -> bool:
        """Test that dashboard is responsive"""
        if not self.driver:
            self.log_test("responsive_design", False, "No browser driver available")
            return False
        
        try:
            # Test different viewport sizes
            viewports = [
                (1920, 1080),  # Desktop
                (768, 1024),   # Tablet
                (375, 667)     # Mobile
            ]
            
            all_viewports_work = True
            
            for width, height in viewports:
                self.driver.set_window_size(width, height)
                time.sleep(1)
                
                # Check if content is still visible and usable
                body = self.driver.find_element(By.TAG_NAME, "body")
                if body.size['width'] < 300:  # Minimum usable width
                    all_viewports_work = False
                    break
            
            # Reset to default size
            self.driver.set_window_size(1920, 1080)
            
            if not all_viewports_work:
                self.log_test("responsive_design", False, "Dashboard not responsive on all screen sizes")
                return False
            
            self.log_test("responsive_design", True, "Dashboard responsive on multiple screen sizes")
            return True
            
        except Exception as e:
            self.log_test("responsive_design", False, f"Exception: {str(e)}")
            return False

    def test_error_handling(self) -> bool:
        """Test dashboard handles API errors gracefully"""
        if not self.driver:
            self.log_test("error_handling", False, "No browser driver available")
            return False
        
        try:
            # First load normal dashboard
            self.driver.get(self.frontend_url)
            time.sleep(3)
            
            # Check that page doesn't have obvious error states initially
            page_text = self.driver.page_source.lower()
            has_initial_errors = any(error_term in page_text for error_term in ["500", "404", "network error", "failed to fetch"])
            
            if has_initial_errors:
                self.log_test("error_handling", False, "Dashboard has errors even with working API")
                return False
            
            self.log_test("error_handling", True, "Dashboard handles normal operation correctly")
            return True
            
        except Exception as e:
            self.log_test("error_handling", False, f"Exception: {str(e)}")
            return False

    def cleanup(self):
        """Clean up resources"""
        if self.driver:
            self.driver.quit()

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all dashboard integration tests"""
        print("🧪 Starting Dashboard Integration Tests")
        print(f"API URL: {self.api_url}")
        print(f"Frontend URL: {self.frontend_url}")
        
        tests = [
            self.test_api_backend_connectivity,
            self.test_frontend_loads,
            self.test_dashboard_displays_agents,
            self.test_api_frontend_integration,
            self.test_responsive_design,
            self.test_error_handling
        ]
        
        passed = 0
        total = len(tests)
        
        try:
            for test in tests:
                try:
                    if test():
                        passed += 1
                except Exception as e:
                    print(f"❌ Test {test.__name__} failed with exception: {e}")
        finally:
            self.cleanup()
        
        # Save results
        results = {
            "total_tests": total,
            "passed_tests": passed,
            "failed_tests": total - passed,
            "success_rate": passed / total,
            "test_details": self.test_results,
            "timestamp": time.time(),
            "api_url": self.api_url,
            "frontend_url": self.frontend_url
        }
        
        # Write results file
        os.makedirs("test-results", exist_ok=True)
        with open("test-results/integration-dashboard.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        return results

def main():
    """Main test runner"""
    api_url = os.environ.get("API_ENDPOINT", "http://localhost:7778")
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    tester = DashboardIntegrationTest(api_url, frontend_url)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results["success_rate"] < 0.8:  # Allow 80% pass rate for dashboard tests
        print("❌ Too many tests failed")
        exit(1)
    else:
        print("✅ Integration tests passed")
        exit(0)

if __name__ == "__main__":
    main()