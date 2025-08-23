#!/usr/bin/env python3
"""
Comprehensive test report generator.
Aggregates results from all test types and generates detailed reports.
"""

import json
import os
import argparse
import glob
import time
from typing import Dict, List, Any
from datetime import datetime

class TestReportGenerator:
    def __init__(self):
        self.test_results = {
            "unit": [],
            "integration": [],
            "e2e": [],
            "performance": [],
            "load": [],
            "security": []
        }
        self.summary_stats = {}

    def collect_test_results(self, artifacts_dir: str = "."):
        """Collect test results from all artifact files"""
        print(f"🔍 Collecting test results from {artifacts_dir}")
        
        # Look for test result files
        patterns = [
            "**/test-results/**/*.json",
            "**/integration-*.json",
            "**/performance-*.json",
            "**/load-test-*.json",
            "**/security-*.json",
            "**/k6-summary.json"
        ]
        
        for pattern in patterns:
            files = glob.glob(os.path.join(artifacts_dir, pattern), recursive=True)
            for file_path in files:
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    # Categorize test results
                    if "integration" in file_path:
                        self.test_results["integration"].append({"file": file_path, "data": data})
                    elif "performance" in file_path or "k6" in file_path:
                        self.test_results["performance"].append({"file": file_path, "data": data})
                    elif "load" in file_path:
                        self.test_results["load"].append({"file": file_path, "data": data})
                    elif "security" in file_path:
                        self.test_results["security"].append({"file": file_path, "data": data})
                    elif "e2e" in file_path:
                        self.test_results["e2e"].append({"file": file_path, "data": data})
                    else:
                        self.test_results["unit"].append({"file": file_path, "data": data})
                    
                    print(f"✅ Loaded: {file_path}")
                except Exception as e:
                    print(f"❌ Failed to load {file_path}: {e}")

    def calculate_summary_stats(self):
        """Calculate overall summary statistics"""
        total_tests = 0
        total_passed = 0
        total_failed = 0
        
        for test_type, results in self.test_results.items():
            type_stats = {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "success_rate": 0.0,
                "files_count": len(results)
            }
            
            for result in results:
                data = result["data"]
                
                # Extract test counts (different formats)
                if "total_tests" in data:
                    type_stats["total"] += data.get("total_tests", 0)
                    type_stats["passed"] += data.get("passed_tests", 0)
                    type_stats["failed"] += data.get("failed_tests", 0)
                elif "metrics" in data and "checks" in data["metrics"]:
                    # K6 format
                    checks = data["metrics"]["checks"]["values"]
                    type_stats["total"] += checks.get("passes", 0) + checks.get("fails", 0)
                    type_stats["passed"] += checks.get("passes", 0)
                    type_stats["failed"] += checks.get("fails", 0)
                elif "test_details" in data:
                    # Custom format
                    details = data["test_details"]
                    type_stats["total"] += len(details)
                    type_stats["passed"] += len([t for t in details if t.get("passed", False)])
                    type_stats["failed"] += len([t for t in details if not t.get("passed", False)])
            
            if type_stats["total"] > 0:
                type_stats["success_rate"] = type_stats["passed"] / type_stats["total"]
            
            self.summary_stats[test_type] = type_stats
            
            total_tests += type_stats["total"]
            total_passed += type_stats["passed"]
            total_failed += type_stats["failed"]
        
        self.summary_stats["overall"] = {
            "total": total_tests,
            "passed": total_passed,
            "failed": total_failed,
            "success_rate": total_passed / total_tests if total_tests > 0 else 0.0
        }

    def generate_html_report(self, output_file: str = "comprehensive-test-report.html"):
        """Generate comprehensive HTML report"""
        print(f"📊 Generating HTML report: {output_file}")
        
        overall = self.summary_stats.get("overall", {})
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Test Report</title>
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f5f5f5; color: #333;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; margin-bottom: 40px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }}
        .summary-card {{ background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }}
        .summary-card h3 {{ margin-top: 0; color: #495057; }}
        .summary-card .number {{ font-size: 2em; font-weight: bold; margin: 10px 0; }}
        .pass {{ color: #28a745; }}
        .fail {{ color: #dc3545; }}
        .warning {{ color: #ffc107; }}
        .test-section {{ margin-bottom: 40px; }}
        .test-section h2 {{ color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }}
        .test-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }}
        .test-card {{ border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; background: white; }}
        .test-card h4 {{ margin-top: 0; color: #495057; }}
        .progress-bar {{ width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin: 10px 0; }}
        .progress-fill {{ height: 100%; transition: width 0.3s ease; }}
        .details {{ margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-family: monospace; font-size: 0.9em; }}
        .timestamp {{ text-align: center; color: #6c757d; margin-top: 30px; font-size: 0.9em; }}
        .badge {{ display: inline-block; padding: 0.25em 0.6em; font-size: 0.75em; font-weight: 700; border-radius: 0.25rem; }}
        .badge-success {{ color: #fff; background-color: #28a745; }}
        .badge-danger {{ color: #fff; background-color: #dc3545; }}
        .badge-warning {{ color: #212529; background-color: #ffc107; }}
        .badge-info {{ color: #fff; background-color: #17a2b8; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Report</h1>
            <p>NiroAgent Dashboard Testing Suite</p>
            <p>Generated on {timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Overall Results</h3>
                <div class="number pass">{overall.get('passed', 0)}</div>
                <p>Tests Passed</p>
                <div class="number fail">{overall.get('failed', 0)}</div>
                <p>Tests Failed</p>
            </div>
            
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="number {'pass' if overall.get('success_rate', 0) >= 0.9 else 'fail'}">{overall.get('success_rate', 0):.1%}</div>
                <p>Overall Pass Rate</p>
                <div class="progress-bar">
                    <div class="progress-fill {'pass' if overall.get('success_rate', 0) >= 0.9 else 'fail'}" 
                         style="width: {overall.get('success_rate', 0):.1%}; background-color: {'#28a745' if overall.get('success_rate', 0) >= 0.9 else '#dc3545'};"></div>
                </div>
            </div>
            
            <div class="summary-card">
                <h3>Test Coverage</h3>
                <div class="number">{len([t for t in self.summary_stats.keys() if t != 'overall' and self.summary_stats[t]['total'] > 0])}</div>
                <p>Test Types</p>
                <div class="number">{overall.get('total', 0)}</div>
                <p>Total Tests</p>
            </div>
        </div>
        """
        
        # Add test type sections
        for test_type, stats in self.summary_stats.items():
            if test_type == "overall" or stats["total"] == 0:
                continue
            
            success_rate = stats["success_rate"]
            badge_class = "badge-success" if success_rate >= 0.9 else "badge-danger" if success_rate < 0.7 else "badge-warning"
            
            html_content += f"""
        <div class="test-section">
            <h2>{test_type.title()} Tests <span class="badge {badge_class}">{success_rate:.1%}</span></h2>
            <div class="test-grid">
                <div class="test-card">
                    <h4>📊 Statistics</h4>
                    <p><strong>Total Tests:</strong> {stats['total']}</p>
                    <p><strong>Passed:</strong> <span class="pass">{stats['passed']}</span></p>
                    <p><strong>Failed:</strong> <span class="fail">{stats['failed']}</span></p>
                    <p><strong>Files:</strong> {stats['files_count']}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {success_rate:.1%}; background-color: {'#28a745' if success_rate >= 0.9 else '#dc3545' if success_rate < 0.7 else '#ffc107'};"></div>
                    </div>
                </div>
            """
            
            # Add details for each test file
            for result in self.test_results[test_type]:
                file_name = os.path.basename(result["file"])
                data = result["data"]
                
                html_content += f"""
                <div class="test-card">
                    <h4>📄 {file_name}</h4>
                    <div class="details">
                        {json.dumps(data, indent=2)[:500]}{'...' if len(json.dumps(data)) > 500 else ''}
                    </div>
                </div>
                """
            
            html_content += "</div></div>"
        
        html_content += f"""
        <div class="timestamp">
            Report generated at {timestamp}<br>
            🚀 NiroAgent Dashboard Test Suite
        </div>
    </div>
</body>
</html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"✅ HTML report generated: {output_file}")

    def generate_json_report(self, output_file: str = "comprehensive-test-report.json"):
        """Generate JSON report"""
        report_data = {
            "timestamp": time.time(),
            "generated_at": datetime.now().isoformat(),
            "summary": self.summary_stats,
            "detailed_results": self.test_results
        }
        
        with open(output_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print(f"✅ JSON report generated: {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Generate comprehensive test report")
    parser.add_argument("--output-format", choices=["html", "json", "both"], default="html",
                       help="Output format for the report")
    parser.add_argument("--output-file", help="Output file name")
    parser.add_argument("--include-artifacts", default=".", 
                       help="Directory containing test artifacts")
    
    args = parser.parse_args()
    
    generator = TestReportGenerator()
    generator.collect_test_results(args.include_artifacts)
    generator.calculate_summary_stats()
    
    if args.output_format in ["html", "both"]:
        html_file = args.output_file or "comprehensive-test-report.html"
        generator.generate_html_report(html_file)
    
    if args.output_format in ["json", "both"]:
        json_file = args.output_file or "comprehensive-test-report.json"
        if args.output_format == "both":
            json_file = json_file.replace(".html", ".json")
        generator.generate_json_report(json_file)
    
    # Print summary to console
    overall = generator.summary_stats.get("overall", {})
    print(f"\n📊 SUMMARY:")
    print(f"Total Tests: {overall.get('total', 0)}")
    print(f"Passed: {overall.get('passed', 0)}")
    print(f"Failed: {overall.get('failed', 0)}")
    print(f"Success Rate: {overall.get('success_rate', 0):.1%}")
    
    # Exit with appropriate code
    if overall.get("success_rate", 0) < 0.8:
        print("❌ Test suite failed (< 80% pass rate)")
        exit(1)
    else:
        print("✅ Test suite passed")
        exit(0)

if __name__ == "__main__":
    main()