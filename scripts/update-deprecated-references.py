#!/usr/bin/env python3
"""
Automated Deprecated Reference Updater
Updates all deprecated service references to use the real agent system
"""

import os
import re
from pathlib import Path
from typing import Dict, List

class DeprecatedReferenceUpdater:
    def __init__(self, root_dir: str, dry_run: bool = True):
        self.root_dir = Path(root_dir)
        self.dry_run = dry_run
        self.updates_made = 0
        self.files_modified = set()
        
        # Mapping of deprecated patterns to their replacements
        self.replacements = {
            # Port 7777 (mocked) -> Port 7778 (real)
            r'localhost:7778': 'localhost:7778',
            r'http://localhost:7778': 'http://localhost:7778', 
            r'ws://localhost:7778': 'ws://localhost:7778',
            r'port\s*[=:]\s*7777': 'port: 7778',
            r'PORT\s*[=:]\s*7777': 'PORT=7778',
            r'"port: 7778"': '"PORT=7778"',
            r'PORT:\s*7777': 'PORT: 7778',
            
            # Specific server URLs (need to be updated to real servers)
            r'http://98\.81\.93\.132:7777': 'http://localhost:7778',
            r'http://54\.156\.68\.236:7777': 'http://localhost:7778',
            r'http://54\.175\.94\.45:7777': 'http://localhost:7778',
            r'http://52\.5\.23\.235:7777': 'http://localhost:7778',
            
            # References to deprecated files
            r'minimal-server\.js': 'real-agent-server.py',
            r'proxy-server\.js': 'real-agent-server.py',
            r'live-agent-api\.js': 'real-agent-server.py',
            r'live-agent-api-fixed\.js': 'real-agent-server.py',
            
            # Infrastructure references
            r'fix-vf-dev-api\.yaml': 'DEPRECATED - use real-agent-server.py',
            r'simple-infrastructure\.yaml': 'DEPRECATED - use real-agent-server.py'
        }
    
    def update_file(self, file_path: Path) -> bool:
        """Update a single file with new references"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                original_content = f.read()
            
            updated_content = original_content
            file_changes = 0
            
            # Apply all replacements
            for pattern, replacement in self.replacements.items():
                new_content = re.sub(pattern, replacement, updated_content, flags=re.IGNORECASE)
                if new_content != updated_content:
                    changes = len(re.findall(pattern, updated_content, re.IGNORECASE))
                    file_changes += changes
                    updated_content = new_content
                    print(f"  - Replaced '{pattern}' with '{replacement}' ({changes} occurrences)")
            
            # Write updated content if changes were made
            if updated_content != original_content and not self.dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
            
            if file_changes > 0:
                self.updates_made += file_changes
                self.files_modified.add(str(file_path))
                return True
            
            return False
            
        except Exception as e:
            print(f"Error updating {file_path}: {e}")
            return False
    
    def update_special_cases(self):
        """Handle special cases that need manual attention"""
        special_cases = []
        
        # GitHub Actions workflows need special handling
        workflows_dir = self.root_dir / '.github' / 'workflows'
        if workflows_dir.exists():
            for workflow_file in workflows_dir.glob('*.yml'):
                special_cases.append({
                    "file": str(workflow_file),
                    "action": "Update GitHub Actions to test real agent system (port 7778)",
                    "priority": "high"
                })
        
        # Docker compose files need port updates
        docker_files = list(self.root_dir.rglob('docker-compose*.yml'))
        for docker_file in docker_files:
            special_cases.append({
                "file": str(docker_file),
                "action": "Update Docker Compose to use real agent server",
                "priority": "medium"
            })
        
        # Test files may need more complex updates
        test_files = list(self.root_dir.rglob('*.spec.ts'))
        for test_file in test_files:
            special_cases.append({
                "file": str(test_file),
                "action": "Update test expectations for real agent data vs mocked data",
                "priority": "high"
            })
        
        return special_cases
    
    def run_updates(self, exclude_dirs: set = None) -> Dict[str, any]:
        """Run updates on all applicable files"""
        if exclude_dirs is None:
            exclude_dirs = {
                'node_modules', 
                '.git', 
                'deprecated',  # Don't update deprecated files
                'venv',
                '__pycache__',
                'dist',
                'build'
            }
        
        # File extensions to update
        update_extensions = {'.py', '.js', '.ts', '.tsx', '.yaml', '.yml', '.json', '.md', '.env'}
        
        print(f"{'DRY RUN: ' if self.dry_run else ''}Updating deprecated references...")
        print(f"Root directory: {self.root_dir}")
        print()
        
        files_processed = 0
        
        for root, dirs, files in os.walk(self.root_dir):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                file_path = Path(root) / file
                
                # Only update relevant file types
                if file_path.suffix.lower() in update_extensions:
                    files_processed += 1
                    
                    if self.update_file(file_path):
                        print(f"Updated: {file_path}")
        
        # Get special cases that need manual attention
        special_cases = self.update_special_cases()
        
        results = {
            "dry_run": self.dry_run,
            "files_processed": files_processed,
            "files_modified": len(self.files_modified),
            "total_updates": self.updates_made,
            "special_cases": special_cases
        }
        
        return results
    
    def print_results(self, results: Dict[str, any]):
        """Print update results"""
        print("\n" + "=" * 70)
        print(f"{'DRY RUN - ' if results['dry_run'] else ''}DEPRECATED REFERENCE UPDATE RESULTS")
        print("=" * 70)
        print(f"Files Processed: {results['files_processed']}")
        print(f"Files Modified: {results['files_modified']}")
        print(f"Total Updates Made: {results['total_updates']}")
        print()
        
        if results['total_updates'] > 0:
            print("[OK] Successfully updated deprecated references")
            if results['dry_run']:
                print("     Run with --apply to make actual changes")
        else:
            print("[OK] No deprecated references found to update")
        
        # Show special cases that need manual attention
        if results['special_cases']:
            print()
            print("SPECIAL CASES REQUIRING MANUAL REVIEW:")
            print("-" * 40)
            high_priority = [c for c in results['special_cases'] if c['priority'] == 'high']
            medium_priority = [c for c in results['special_cases'] if c['priority'] == 'medium']
            
            if high_priority:
                print("HIGH PRIORITY:")
                for case in high_priority:
                    print(f"  • {case['action']}")
                    print(f"    File: {case['file']}")
                print()
            
            if medium_priority:
                print("MEDIUM PRIORITY:")
                for case in medium_priority:
                    print(f"  • {case['action']}")
                    print(f"    File: {case['file']}")
        
        print("\n" + "=" * 70)

def main():
    """Main function"""
    import sys
    
    # Parse arguments
    dry_run = "--apply" not in sys.argv
    root_dir = "."
    
    if dry_run:
        print("DRY RUN MODE - No files will be modified")
        print("Use --apply flag to make actual changes")
        print()
    
    updater = DeprecatedReferenceUpdater(root_dir, dry_run=dry_run)
    results = updater.run_updates()
    updater.print_results(results)
    
    # Exit with appropriate code
    sys.exit(0 if results['total_updates'] == 0 or not dry_run else 1)

if __name__ == "__main__":
    main()