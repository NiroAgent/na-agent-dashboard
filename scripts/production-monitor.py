#!/usr/bin/env python3
"""
Production Monitoring Dashboard for Real Agent System
Comprehensive monitoring with web interface and real-time updates
"""

import json
import requests
import time
import threading
import psutil
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
from pathlib import Path
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs

# Import alert manager if available
try:
    from alert_manager import AlertManager, Alert, AlertLevel
    ALERTS_AVAILABLE = True
except ImportError:
    ALERTS_AVAILABLE = False
    print("Alert manager not available - running without alerts")

class ProductionMonitor:
    def __init__(self):
        self.api_base = "http://localhost:7778"
        self.monitoring_data = {
            "system_status": "unknown",
            "last_update": None,
            "metrics": {},
            "alerts": [],
            "performance": {},
            "agent_summary": {}
        }
        self.alert_thresholds = {
            "max_response_time_ms": 5000,
            "min_active_agents": 3,
            "max_cpu_usage": 80,
            "max_memory_usage": 85,
            "min_success_rate": 85
        }
        self.running = False
        
        # Initialize alert manager if available
        self.alert_manager = None
        if ALERTS_AVAILABLE:
            try:
                self.alert_manager = AlertManager()
                print("✅ Alert manager initialized")
            except Exception as e:
                print(f"⚠️  Alert manager initialization failed: {e}")
                self.alert_manager = None
        
    def check_system_health(self) -> Dict[str, Any]:
        """Comprehensive system health check"""
        health_data = {
            "timestamp": datetime.now().isoformat(),
            "discovery_server": self._check_discovery_server(),
            "daemon_agents": self._check_daemon_agents(),
            "system_resources": self._check_system_resources(),
            "deprecated_services": self._check_deprecated_services()
        }
        
        # Determine overall health
        critical_checks = ["discovery_server", "daemon_agents"]
        health_scores = []
        
        for check_name, check_result in health_data.items():
            if check_name == "timestamp":
                continue
            
            score = {
                "healthy": 100,
                "warning": 70,
                "failed": 0,
                "unknown": 50
            }.get(check_result.get("status", "unknown"), 50)
            
            # Critical checks have higher weight
            weight = 2 if check_name in critical_checks else 1
            health_scores.extend([score] * weight)
        
        overall_score = sum(health_scores) / len(health_scores) if health_scores else 0
        health_data["overall_health"] = {
            "score": round(overall_score, 1),
            "status": "healthy" if overall_score >= 90 else 
                     "warning" if overall_score >= 70 else "critical"
        }
        
        return health_data
    
    def _check_discovery_server(self) -> Dict[str, Any]:
        """Check real agent discovery server"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_base}/health", timeout=5)
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for performance issues
                status = "healthy"
                if response_time > self.alert_thresholds["max_response_time_ms"]:
                    status = "warning"
                
                return {
                    "status": status,
                    "response_time_ms": round(response_time, 2),
                    "agents_discovered": data.get("agents_discovered", 0),
                    "last_scan": data.get("last_scan"),
                    "server_status": data.get("status")
                }
            else:
                return {
                    "status": "failed",
                    "error": f"HTTP {response.status_code}",
                    "response_time_ms": round(response_time, 2)
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "failed",
                "error": str(e),
                "response_time_ms": None
            }
    
    def _check_daemon_agents(self) -> Dict[str, Any]:
        """Check daemon agent status and performance"""
        try:
            response = requests.get(f"{self.api_base}/api/agents", timeout=10)
            if response.status_code == 200:
                agents = response.json()
                daemon_agents = [a for a in agents if 'daemon' in a['name'].lower()]
                active_daemons = [a for a in daemon_agents if a['status'] == 'active']
                
                # Calculate metrics
                if daemon_agents:
                    avg_cpu = sum(a['cpuUsage'] for a in daemon_agents) / len(daemon_agents)
                    avg_memory = sum(a['memoryUsage'] for a in daemon_agents) / len(daemon_agents)
                    total_tasks = sum(a['taskCount'] for a in daemon_agents)
                else:
                    avg_cpu = avg_memory = total_tasks = 0
                
                # Determine status
                status = "healthy"
                if len(active_daemons) < self.alert_thresholds["min_active_agents"]:
                    status = "warning"
                if avg_cpu > self.alert_thresholds["max_cpu_usage"]:
                    status = "warning"
                if avg_memory > self.alert_thresholds["max_memory_usage"]:
                    status = "warning"
                
                return {
                    "status": status,
                    "total_daemon_agents": len(daemon_agents),
                    "active_daemon_agents": len(active_daemons),
                    "average_cpu_usage": round(avg_cpu, 1),
                    "average_memory_usage": round(avg_memory, 1),
                    "total_tasks_completed": total_tasks,
                    "daemon_details": [
                        {
                            "name": a['name'],
                            "type": a['type'],
                            "status": a['status'],
                            "cpu": a['cpuUsage'],
                            "memory": a['memoryUsage'],
                            "tasks": a['taskCount']
                        }
                        for a in daemon_agents
                    ]
                }
            else:
                return {
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resources (CPU, Memory, Disk)"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            status = "healthy"
            if cpu_percent > 80 or memory.percent > 85 or disk.percent > 90:
                status = "warning"
            if cpu_percent > 95 or memory.percent > 95 or disk.percent > 95:
                status = "critical"
            
            return {
                "status": status,
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": round(disk.percent, 1),
                "disk_free_gb": round(disk.free / (1024**3), 2)
            }
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _check_deprecated_services(self) -> Dict[str, Any]:
        """Check that deprecated services are not running"""
        deprecated_ports = [7777]  # Mocked service port
        running_deprecated = []
        
        for port in deprecated_ports:
            try:
                response = requests.get(f"http://localhost:{port}/health", timeout=2)
                if response.status_code == 200:
                    running_deprecated.append(f"Port {port} (deprecated)")
            except requests.exceptions.RequestException:
                # Good - deprecated service is not running
                pass
        
        if running_deprecated:
            return {
                "status": "warning",
                "running_deprecated_services": running_deprecated,
                "message": "Deprecated services detected - should be stopped"
            }
        else:
            return {
                "status": "healthy",
                "message": "No deprecated services detected"
            }
    
    def generate_alerts(self, health_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alerts based on health data"""
        alerts = []
        timestamp = datetime.now()
        
        # Check discovery server response time
        discovery = health_data.get("discovery_server", {})
        response_time = discovery.get("response_time_ms", 0)
        if response_time and response_time > self.alert_thresholds["max_response_time_ms"]:
            alerts.append({
                "level": "warning",
                "title": "Slow API Response",
                "message": f"Discovery server response time: {response_time:.1f}ms",
                "timestamp": timestamp.isoformat(),
                "component": "discovery_server"
            })
        
        # Check daemon agent count
        daemon_info = health_data.get("daemon_agents", {})
        active_agents = daemon_info.get("active_daemon_agents", 0)
        if active_agents < self.alert_thresholds["min_active_agents"]:
            alerts.append({
                "level": "critical",
                "title": "Insufficient Active Agents",
                "message": f"Only {active_agents} daemon agents active (minimum: {self.alert_thresholds['min_active_agents']})",
                "timestamp": timestamp.isoformat(),
                "component": "daemon_agents"
            })
        
        # Check system resources
        resources = health_data.get("system_resources", {})
        cpu_percent = resources.get("cpu_percent", 0)
        memory_percent = resources.get("memory_percent", 0)
        
        if cpu_percent > self.alert_thresholds["max_cpu_usage"]:
            alerts.append({
                "level": "warning",
                "title": "High CPU Usage",
                "message": f"CPU usage at {cpu_percent:.1f}%",
                "timestamp": timestamp.isoformat(),
                "component": "system_resources"
            })
        
        if memory_percent > self.alert_thresholds["max_memory_usage"]:
            alerts.append({
                "level": "warning",
                "title": "High Memory Usage", 
                "message": f"Memory usage at {memory_percent:.1f}%",
                "timestamp": timestamp.isoformat(),
                "component": "system_resources"
            })
        
        # Check for deprecated services
        deprecated = health_data.get("deprecated_services", {})
        if deprecated.get("status") == "warning":
            alerts.append({
                "level": "warning",
                "title": "Deprecated Services Running",
                "message": "Found deprecated services that should be stopped",
                "timestamp": timestamp.isoformat(),
                "component": "deprecated_services"
            })
        
        return alerts
    
    def run_monitoring_cycle(self):
        """Run a single monitoring cycle"""
        health_data = self.check_system_health()
        alerts = self.generate_alerts(health_data)
        
        # Process alerts through alert manager if available
        alert_summary = {}
        if self.alert_manager:
            try:
                new_alerts = self.alert_manager.process_alerts(health_data)
                alert_summary = self.alert_manager.get_alert_summary()
                
                # Combine traditional alerts with alert manager alerts
                for alert in new_alerts:
                    alerts.append({
                        "level": alert.level.value,
                        "title": alert.title,
                        "message": alert.message,
                        "timestamp": alert.timestamp.isoformat(),
                        "component": alert.component
                    })
                    
            except Exception as e:
                print(f"Alert manager error: {e}")
        
        # Update monitoring data
        self.monitoring_data.update({
            "system_status": health_data["overall_health"]["status"],
            "last_update": datetime.now().isoformat(),
            "metrics": health_data,
            "alerts": alerts[-10:],  # Keep last 10 alerts
            "alert_summary": alert_summary,
            "performance": {
                "uptime_hours": self._get_uptime_hours(),
                "monitoring_cycles_completed": getattr(self, '_cycles_completed', 0) + 1
            }
        })
        
        self._cycles_completed = getattr(self, '_cycles_completed', 0) + 1
        
        return self.monitoring_data
    
    def _get_uptime_hours(self) -> float:
        """Get system uptime in hours"""
        try:
            boot_time = psutil.boot_time()
            uptime_seconds = time.time() - boot_time
            return round(uptime_seconds / 3600, 2)
        except:
            return 0.0
    
    def start_monitoring(self, interval: int = 30):
        """Start continuous monitoring"""
        self.running = True
        print(f"Starting production monitoring (interval: {interval}s)...")
        
        def monitoring_loop():
            while self.running:
                try:
                    self.run_monitoring_cycle()
                    time.sleep(interval)
                except KeyboardInterrupt:
                    self.running = False
                    break
                except Exception as e:
                    print(f"Monitoring error: {e}")
                    time.sleep(interval)
        
        # Start monitoring in background thread
        monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitor_thread.start()
        
        return monitor_thread
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.running = False
        print("Monitoring stopped")
    
    def get_monitoring_data(self) -> Dict[str, Any]:
        """Get current monitoring data"""
        return self.monitoring_data
    
    def print_dashboard(self):
        """Print console dashboard"""
        data = self.monitoring_data
        
        print("\n" + "=" * 80)
        print("PRODUCTION AGENT SYSTEM MONITOR")
        print("=" * 80)
        print(f"Status: {data['system_status'].upper()}")
        print(f"Last Update: {data['last_update']}")
        print(f"Monitoring Cycles: {data['performance'].get('monitoring_cycles_completed', 0)}")
        print(f"System Uptime: {data['performance'].get('uptime_hours', 0):.1f} hours")
        
        # Health metrics
        metrics = data.get('metrics', {})
        if 'discovery_server' in metrics:
            server = metrics['discovery_server']
            print(f"\nDiscovery Server:")
            print(f"   Status: {server.get('status', 'unknown')}")
            print(f"   Response Time: {server.get('response_time_ms', 0):.1f}ms")
            print(f"   Agents Discovered: {server.get('agents_discovered', 0)}")
        
        if 'daemon_agents' in metrics:
            agents = metrics['daemon_agents']
            print(f"\nDaemon Agents:")
            print(f"   Active: {agents.get('active_daemon_agents', 0)}/{agents.get('total_daemon_agents', 0)}")
            print(f"   Average CPU: {agents.get('average_cpu_usage', 0):.1f}%")
            print(f"   Average Memory: {agents.get('average_memory_usage', 0):.1f}%")
            print(f"   Total Tasks: {agents.get('total_tasks_completed', 0)}")
        
        if 'system_resources' in metrics:
            resources = metrics['system_resources']
            print(f"\nSystem Resources:")
            print(f"   CPU: {resources.get('cpu_percent', 0):.1f}%")
            print(f"   Memory: {resources.get('memory_percent', 0):.1f}% ({resources.get('memory_available_gb', 0):.1f}GB free)")
            print(f"   Disk: {resources.get('disk_percent', 0):.1f}% ({resources.get('disk_free_gb', 0):.1f}GB free)")
        
        # Alerts
        alerts = data.get('alerts', [])
        if alerts:
            print(f"\nActive Alerts ({len(alerts)}):")
            for alert in alerts[-3:]:  # Show last 3 alerts
                level_icon = "[CRITICAL]" if alert['level'] == 'critical' else "[WARNING]"
                print(f"   {level_icon} {alert['title']}: {alert['message']}")
        
        print("=" * 80)

class ProductionWebServer:
    """Simple web server for monitoring dashboard"""
    
    def __init__(self, monitor: ProductionMonitor, port: int = 8080):
        self.monitor = monitor
        self.port = port
        
    def create_html_dashboard(self) -> str:
        """Create HTML dashboard"""
        data = self.monitor.get_monitoring_data()
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Production Agent Monitor</title>
            <meta http-equiv="refresh" content="30">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; }}
                .header {{ text-align: center; background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }}
                .status-healthy {{ color: #27ae60; }}
                .status-warning {{ color: #f39c12; }}
                .status-critical {{ color: #e74c3c; }}
                .card {{ background: white; margin: 15px 0; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }}
                .metric {{ text-align: center; }}
                .metric-value {{ font-size: 24px; font-weight: bold; }}
                .alert {{ padding: 10px; margin: 5px 0; border-left: 4px solid #e74c3c; background: #fdf2f2; }}
                .alert.warning {{ border-color: #f39c12; background: #fef9e7; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Production Agent System Monitor</h1>
                    <p class="status-{data['system_status']}">Status: {data['system_status'].upper()}</p>
                    <p>Last Update: {data['last_update']}</p>
                </div>
                
                <div class="metrics">
                    <div class="card metric">
                        <h3>Discovery Server</h3>
                        <div class="metric-value status-{data['metrics'].get('discovery_server', {}).get('status', 'unknown')}">
                            {data['metrics'].get('discovery_server', {}).get('status', 'Unknown').upper()}
                        </div>
                        <p>Response: {data['metrics'].get('discovery_server', {}).get('response_time_ms', 0):.1f}ms</p>
                        <p>Agents: {data['metrics'].get('discovery_server', {}).get('agents_discovered', 0)}</p>
                    </div>
                    
                    <div class="card metric">
                        <h3>Daemon Agents</h3>
                        <div class="metric-value status-{data['metrics'].get('daemon_agents', {}).get('status', 'unknown')}">
                            {data['metrics'].get('daemon_agents', {}).get('active_daemon_agents', 0)}/{data['metrics'].get('daemon_agents', {}).get('total_daemon_agents', 0)}
                        </div>
                        <p>Active Agents</p>
                        <p>Tasks: {data['metrics'].get('daemon_agents', {}).get('total_tasks_completed', 0)}</p>
                    </div>
                    
                    <div class="card metric">
                        <h3>System Resources</h3>
                        <div class="metric-value">
                            CPU: {data['metrics'].get('system_resources', {}).get('cpu_percent', 0):.1f}%
                        </div>
                        <p>Memory: {data['metrics'].get('system_resources', {}).get('memory_percent', 0):.1f}%</p>
                        <p>Disk: {data['metrics'].get('system_resources', {}).get('disk_percent', 0):.1f}%</p>
                    </div>
                    
                    <div class="card metric">
                        <h3>Performance</h3>
                        <div class="metric-value">
                            {data['performance'].get('uptime_hours', 0):.1f}h
                        </div>
                        <p>System Uptime</p>
                        <p>Cycles: {data['performance'].get('monitoring_cycles_completed', 0)}</p>
                    </div>
                </div>
                
                <div class="card">
                    <h3>⚠️ Active Alerts</h3>
                    {''.join([f'<div class="alert {alert["level"]}"><strong>{alert["title"]}</strong>: {alert["message"]}</div>' for alert in data.get('alerts', [])]) or '<p>No active alerts</p>'}
                </div>
                
                <div class="card">
                    <h3>🤖 Daemon Agent Details</h3>
                    <table border="1" style="width:100%; border-collapse: collapse;">
                        <tr><th>Name</th><th>Type</th><th>Status</th><th>CPU</th><th>Memory</th><th>Tasks</th></tr>
                        {''.join([f'<tr><td>{agent["name"]}</td><td>{agent["type"]}</td><td>{agent["status"]}</td><td>{agent["cpu"]}%</td><td>{agent["memory"]}%</td><td>{agent["tasks"]}</td></tr>' for agent in data['metrics'].get('daemon_agents', {}).get('daemon_details', [])])}
                    </table>
                </div>
            </div>
        </body>
        </html>
        """
        return html
    
    def serve_dashboard(self):
        """Serve the dashboard via HTTP"""
        class DashboardHandler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    html = self.server.web_server.create_html_dashboard()
                    self.wfile.write(html.encode())
                elif self.path == '/api/data':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    data = json.dumps(self.server.web_server.monitor.get_monitoring_data(), indent=2)
                    self.wfile.write(data.encode())
                else:
                    self.send_response(404)
                    self.end_headers()
            
            def log_message(self, format, *args):
                # Suppress logging
                pass
        
        with socketserver.TCPServer(("", self.port), DashboardHandler) as httpd:
            httpd.web_server = self
            print(f"Production monitoring dashboard available at: http://localhost:{self.port}")
            httpd.serve_forever()

def main():
    """Main monitoring function"""
    import sys
    
    monitor = ProductionMonitor()
    
    # Check command line arguments
    web_mode = "--web" in sys.argv
    continuous = "--continuous" in sys.argv
    
    if web_mode:
        # Start monitoring and web server
        monitor.start_monitoring(interval=30)
        web_server = ProductionWebServer(monitor, port=8080)
        try:
            web_server.serve_dashboard()
        except KeyboardInterrupt:
            monitor.stop_monitoring()
            print("\nMonitoring stopped")
    elif continuous:
        # Console monitoring
        monitor.start_monitoring(interval=30)
        try:
            while True:
                monitor.print_dashboard()
                time.sleep(30)
        except KeyboardInterrupt:
            monitor.stop_monitoring()
    else:
        # Single check
        data = monitor.run_monitoring_cycle()
        monitor.print_dashboard()

if __name__ == "__main__":
    main()