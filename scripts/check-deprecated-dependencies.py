#!/usr/bin/env python3
"""
Deprecated Service Dependency Checker
Scans codebase for references to deprecated services and files
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Set

class DeprecatedDependencyChecker:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.deprecated_files = set()
        self.deprecated_patterns = set()
        self.scan_results = {
            "files_scanned": 0,
            "deprecated_references": [],
            "clean_files": 0,
            "total_issues": 0
        }
        
        self._load_deprecated_items()
    
    def _load_deprecated_items(self):
        """Load list of deprecated files and patterns to search for"""
        # Deprecated server files (moved to /deprecated/servers/)
        deprecated_servers = [
            "simple-server.js",
            "debug-server.js", 
            "minimal-test.js",
            "simple-test.js",
            "working-server.js",
            "live-server.js",
            "real-agent-server.js"
        ]
        
        # Deprecated root files (moved to /deprecated/)
        deprecated_root_files = [
            "real-agent-server.py",
            "real-agent-server.py",
            "real-agent-server.py",
            "real-agent-server.py"
        ]
        
        # Deprecated infrastructure files
        deprecated_infrastructure = [
            "DEPRECATED - use real-agent-server.py",
            "DEPRECATED - use real-agent-server.py",
            "minimal-al2023-test.yaml",
            "simple-al2023-infrastructure.yaml"
        ]
        
        # Add all deprecated files to set
        for file_list in [deprecated_servers, deprecated_root_files, deprecated_infrastructure]:
            self.deprecated_files.update(file_list)
        
        # Deprecated patterns (ports, URLs, references)
        self.deprecated_patterns.update([
            r"localhost:7778",  # Mocked service port
            r"port\s*[=:]\s*7777",  # Port configuration
            r"PORT\s*[=:]\s*7777",
            r"http://.*:7777",
            r"servers/simple-server",
            r"servers/debug-server", 
            r"servers/minimal-test",
            r"servers/working-server",
            r"servers/live-server",
            r"minimal-server\.js",
            r"proxy-server\.js",
            r"live-agent-api\.js",
            r"fix-vf-dev-api\.yaml",
            r"simple-infrastructure\.yaml"
        ])
    
    def scan_file(self, file_path: Path) -> List[Dict[str, any]]:
        """Scan a single file for deprecated references"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
                
                # Check for deprecated file references
                for filename in self.deprecated_files:
                    if filename in content:
                        # Find line numbers
                        for line_num, line in enumerate(lines, 1):
                            if filename in line:
                                issues.append({
                                    "type": "deprecated_file_reference",
                                    "file": str(file_path),
                                    "line": line_num,
                                    "content": line.strip(),
                                    "deprecated_item": filename
                                })
                
                # Check for deprecated patterns
                for pattern in self.deprecated_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        # Find line number
                        line_num = content[:match.start()].count('\n') + 1
                        line_content = lines[line_num - 1].strip()
                        
                        issues.append({
                            "type": "deprecated_pattern",
                            "file": str(file_path),
                            "line": line_num,
                            "content": line_content,
                            "deprecated_item": pattern,
                            "match": match.group()
                        })
                        
        except Exception as e:
            print(f"Warning: Could not scan {file_path}: {e}")
        
        return issues
    
    def scan_directory(self, exclude_dirs: Set[str] = None) -> Dict[str, any]:
        """Scan entire directory tree for deprecated references"""
        if exclude_dirs is None:
            exclude_dirs = {
                'node_modules', 
                '.git', 
                'deprecated',  # Skip the deprecated folder itself
                'venv',
                '__pycache__',
                'dist',
                'build'
            }
        
        # File extensions to scan
        scan_extensions = {'.py', '.js', '.ts', '.tsx', '.yaml', '.yml', '.json', '.md', '.env'}
        
        for root, dirs, files in os.walk(self.root_dir):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                file_path = Path(root) / file
                
                # Only scan relevant file types
                if file_path.suffix.lower() in scan_extensions:
                    self.scan_results["files_scanned"] += 1
                    issues = self.scan_file(file_path)
                    
                    if issues:
                        self.scan_results["deprecated_references"].extend(issues)
                        self.scan_results["total_issues"] += len(issues)
                    else:
                        self.scan_results["clean_files"] += 1
        
        return self.scan_results
    
    def print_results(self):
        """Print scan results in human-readable format"""
        results = self.scan_results
        
        print("=" * 70)
        print("DEPRECATED SERVICE DEPENDENCY CHECK")
        print("=" * 70)
        print(f"Files Scanned: {results['files_scanned']}")
        print(f"Clean Files: {results['clean_files']}")
        print(f"Files with Issues: {results['files_scanned'] - results['clean_files']}")
        print(f"Total Issues Found: {results['total_issues']}")
        print()
        
        if results['total_issues'] == 0:
            print("[OK] No deprecated service dependencies found!")
            print("The codebase is clean of mocked service references.")
            return True
        
        print("[WARN] Deprecated service references found:")
        print()
        
        # Group issues by file
        issues_by_file = {}
        for issue in results['deprecated_references']:
            file_path = issue['file']
            if file_path not in issues_by_file:
                issues_by_file[file_path] = []
            issues_by_file[file_path].append(issue)
        
        for file_path, issues in issues_by_file.items():
            print(f"File: {file_path}")
            for issue in issues:
                print(f"  Line {issue['line']}: {issue['content']}")
                print(f"    -> References: {issue['deprecated_item']}")
            print()
        
        return False
    
    def save_report(self, filename: str = "deprecated_dependencies_report.json"):
        """Save scan results to JSON file"""
        import json
        
        with open(filename, 'w') as f:
            json.dump(self.scan_results, f, indent=2)
        
        print(f"Detailed report saved to: {filename}")

def main():
    """Main function"""
    import sys
    
    # Get root directory (default to current directory)
    root_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("Scanning for deprecated service dependencies...")
    print(f"Root directory: {os.path.abspath(root_dir)}")
    print()
    
    checker = DeprecatedDependencyChecker(root_dir)
    checker.scan_directory()
    
    clean = checker.print_results()
    checker.save_report()
    
    # Exit with appropriate code
    sys.exit(0 if clean else 1)

if __name__ == "__main__":
    main()