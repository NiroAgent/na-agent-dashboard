#!/usr/bin/env python3
"""
Real Agent System Health Monitor
Automated monitoring script for the real agent discovery system
"""

import json
import requests
import time
import sys
from datetime import datetime
from typing import Dict, List, Any

class RealAgentSystemMonitor:
    def __init__(self):
        self.api_base = "http://localhost:7778"
        self.health_report = {
            "timestamp": None,
            "status": "unknown",
            "checks": {}
        }
    
    def check_discovery_server(self) -> Dict[str, Any]:
        """Check if real agent discovery server is responding"""
        try:
            response = requests.get(f"{self.api_base}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "healthy",
                    "details": {
                        "server_status": data.get("status"),
                        "agents_discovered": data.get("agents_discovered"),
                        "last_scan": data.get("last_scan"),
                        "response_time_ms": response.elapsed.total_seconds() * 1000
                    }
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}",
                    "details": {}
                }
        except requests.exceptions.RequestException as e:
            return {
                "status": "failed",
                "error": str(e),
                "details": {}
            }
    
    def check_daemon_agents(self) -> Dict[str, Any]:
        """Check status of running daemon agents"""
        try:
            response = requests.get(f"{self.api_base}/api/agents", timeout=10)
            if response.status_code == 200:
                agents = response.json()
                daemon_agents = [a for a in agents if 'daemon' in a['name'].lower()]
                active_daemons = [a for a in daemon_agents if a['status'] == 'active']
                
                return {
                    "status": "healthy" if len(active_daemons) >= 3 else "warning",
                    "details": {
                        "total_daemon_agents": len(daemon_agents),
                        "active_daemon_agents": len(active_daemons),
                        "daemon_types": [a['type'] for a in active_daemons],
                        "expected_minimum": 3
                    }
                }
            else:
                return {
                    "status": "failed",
                    "error": f"HTTP {response.status_code}",
                    "details": {}
                }
        except requests.exceptions.RequestException as e:
            return {
                "status": "failed",
                "error": str(e),
                "details": {}
            }
    
    def check_dashboard_api(self) -> Dict[str, Any]:
        """Check dashboard API endpoints"""
        try:
            response = requests.get(f"{self.api_base}/api/dashboard/agents", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return {
                        "status": "healthy",
                        "details": {
                            "total_agents": data.get("totalAgents"),
                            "active_agents": data.get("activeAgents"),
                            "data_source": data.get("source"),
                            "last_updated": data.get("lastUpdated")
                        }
                    }
                else:
                    return {
                        "status": "warning",
                        "error": "API returned success: false",
                        "details": data
                    }
            else:
                return {
                    "status": "failed",
                    "error": f"HTTP {response.status_code}",
                    "details": {}
                }
        except requests.exceptions.RequestException as e:
            return {
                "status": "failed",
                "error": str(e),
                "details": {}
            }
    
    def check_deprecated_services(self) -> Dict[str, Any]:
        """Check that deprecated services are not being accessed"""
        deprecated_ports = [7777]  # Mocked service port
        issues = []
        
        for port in deprecated_ports:
            try:
                response = requests.get(f"http://localhost:{port}/health", timeout=2)
                if response.status_code == 200:
                    issues.append(f"Deprecated service on port {port} is still running")
            except requests.exceptions.RequestException:
                # Good - deprecated service is not responding
                pass
        
        if issues:
            return {
                "status": "warning",
                "error": "Deprecated services detected",
                "details": {"issues": issues}
            }
        else:
            return {
                "status": "healthy",
                "details": {"message": "No deprecated services detected"}
            }
    
    def run_health_checks(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive report"""
        self.health_report["timestamp"] = datetime.now().isoformat()
        
        # Run all checks
        checks = {
            "discovery_server": self.check_discovery_server(),
            "daemon_agents": self.check_daemon_agents(),
            "dashboard_api": self.check_dashboard_api(),
            "deprecated_services": self.check_deprecated_services()
        }
        
        self.health_report["checks"] = checks
        
        # Determine overall status
        statuses = [check["status"] for check in checks.values()]
        if "failed" in statuses:
            self.health_report["status"] = "failed"
        elif "warning" in statuses:
            self.health_report["status"] = "warning"
        else:
            self.health_report["status"] = "healthy"
        
        return self.health_report
    
    def print_report(self, report: Dict[str, Any]):
        """Print human-readable health report"""
        print("=" * 60)
        print("REAL AGENT SYSTEM HEALTH MONITOR")
        print("=" * 60)
        print(f"Timestamp: {report['timestamp']}")
        print(f"Overall Status: {report['status'].upper()}")
        print()
        
        for check_name, check_result in report['checks'].items():
            status_icon = {
                "healthy": "[OK]",
                "warning": "[WARN]", 
                "failed": "[FAIL]",
                "unknown": "[?]"
            }.get(check_result['status'], "[?]")
            
            print(f"{status_icon} {check_name.replace('_', ' ').title()}: {check_result['status']}")
            
            if 'error' in check_result:
                print(f"   Error: {check_result['error']}")
            
            if 'details' in check_result:
                for key, value in check_result['details'].items():
                    print(f"   {key}: {value}")
            print()
        
        print("=" * 60)
    
    def save_report(self, report: Dict[str, Any], filename: str = None):
        """Save health report to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"health_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Report saved to: {filename}")

def main():
    """Main monitoring function"""
    monitor = RealAgentSystemMonitor()
    
    # Check if this is continuous monitoring mode
    continuous = "--continuous" in sys.argv
    interval = 60  # 60 seconds between checks
    
    if continuous:
        print("Starting continuous monitoring (Ctrl+C to stop)...")
        try:
            while True:
                report = monitor.run_health_checks()
                monitor.print_report(report)
                
                if report['status'] != 'healthy':
                    # Save report when issues are detected
                    monitor.save_report(report)
                
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")
    else:
        # Single check
        report = monitor.run_health_checks()
        monitor.print_report(report)
        
        # Return appropriate exit code
        exit_codes = {
            "healthy": 0,
            "warning": 1,
            "failed": 2,
            "unknown": 3
        }
        sys.exit(exit_codes.get(report['status'], 3))

if __name__ == "__main__":
    main()