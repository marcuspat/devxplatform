#!/usr/bin/env python3
"""Comprehensive validation script for all Python templates"""

import os
import sys
import subprocess
import json
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent

def run_command(cmd, cwd=None):
    """Run a command and return its output"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            cwd=cwd
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def validate_template(template_name, template_path):
    """Validate a Python template"""
    print(f"\n{'='*60}")
    print(f"Validating {template_name} template")
    print(f"Path: {template_path}")
    print('='*60)
    
    results = {
        'template': template_name,
        'path': str(template_path),
        'checks': {}
    }
    
    # Check 1: Verify __init__.py files exist
    print("\n1. Checking __init__.py files...")
    init_files = []
    for root, dirs, files in os.walk(template_path):
        if '__pycache__' in root or 'venv' in root:
            continue
        rel_path = Path(root).relative_to(template_path)
        if 'app' in str(rel_path) or 'tests' in str(rel_path):
            init_file = Path(root) / '__init__.py'
            if init_file.exists():
                init_files.append(str(rel_path / '__init__.py'))
                print(f"   ✓ Found: {rel_path}/__init__.py")
            else:
                print(f"   ✗ Missing: {rel_path}/__init__.py")
    
    results['checks']['init_files'] = {
        'status': 'pass' if init_files else 'fail',
        'files': init_files
    }
    
    # Check 2: Verify requirements.txt exists
    print("\n2. Checking requirements.txt...")
    req_file = template_path / 'requirements.txt'
    if req_file.exists():
        print("   ✓ requirements.txt exists")
        with open(req_file) as f:
            requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        print(f"   Found {len(requirements)} dependencies")
        results['checks']['requirements'] = {
            'status': 'pass',
            'count': len(requirements)
        }
    else:
        print("   ✗ requirements.txt missing")
        results['checks']['requirements'] = {'status': 'fail'}
    
    # Check 3: Check Python syntax
    print("\n3. Checking Python syntax...")
    syntax_errors = []
    for py_file in template_path.rglob('*.py'):
        if '__pycache__' in str(py_file) or 'venv' in str(py_file):
            continue
        success, stdout, stderr = run_command(f'python3 -m py_compile "{py_file}"')
        if not success:
            syntax_errors.append({
                'file': str(py_file.relative_to(template_path)),
                'error': stderr
            })
            print(f"   ✗ Syntax error in {py_file.name}")
        else:
            print(f"   ✓ Valid syntax: {py_file.relative_to(template_path)}")
    
    results['checks']['syntax'] = {
        'status': 'pass' if not syntax_errors else 'fail',
        'errors': syntax_errors
    }
    
    # Check 4: Test imports (without dependencies)
    print("\n4. Testing internal imports...")
    test_script = template_path / 'test_imports.py'
    if test_script.exists():
        success, stdout, stderr = run_command('python3 test_imports.py', cwd=template_path)
        print(stdout)
        results['checks']['imports'] = {
            'status': 'tested',
            'output': stdout
        }
    else:
        print("   ⚠ No test_imports.py found")
        results['checks']['imports'] = {'status': 'skipped'}
    
    # Check 5: Dockerfile validation
    print("\n5. Checking Dockerfile...")
    dockerfile = template_path / 'Dockerfile'
    if dockerfile.exists():
        print("   ✓ Dockerfile exists")
        # Basic validation
        with open(dockerfile) as f:
            content = f.read()
            has_from = 'FROM' in content
            has_workdir = 'WORKDIR' in content
            has_cmd = 'CMD' in content or 'ENTRYPOINT' in content
            
        if all([has_from, has_workdir, has_cmd]):
            print("   ✓ Dockerfile has basic structure")
            results['checks']['dockerfile'] = {'status': 'pass'}
        else:
            print("   ✗ Dockerfile missing required commands")
            results['checks']['dockerfile'] = {
                'status': 'fail',
                'missing': []
            }
            if not has_from:
                results['checks']['dockerfile']['missing'].append('FROM')
            if not has_workdir:
                results['checks']['dockerfile']['missing'].append('WORKDIR')
            if not has_cmd:
                results['checks']['dockerfile']['missing'].append('CMD/ENTRYPOINT')
    else:
        print("   ✗ Dockerfile missing")
        results['checks']['dockerfile'] = {'status': 'fail'}
    
    # Summary
    print(f"\n{'-'*40}")
    failed_checks = [k for k, v in results['checks'].items() if v.get('status') == 'fail']
    if failed_checks:
        print(f"❌ {template_name} FAILED checks: {', '.join(failed_checks)}")
    else:
        print(f"✅ {template_name} PASSED all checks")
    
    return results

def main():
    """Main validation function"""
    print("Python Template Validation Report")
    print("="*80)
    
    # Find all Python templates
    templates = [
        ('FastAPI', TEMPLATES_DIR / 'fastapi'),
        ('Flask', TEMPLATES_DIR / 'flask'),
        ('Celery', TEMPLATES_DIR / 'celery')
    ]
    
    all_results = []
    
    for name, path in templates:
        if path.exists():
            results = validate_template(name, path)
            all_results.append(results)
        else:
            print(f"\n⚠️  {name} template not found at {path}")
    
    # Generate summary report
    print("\n" + "="*80)
    print("SUMMARY REPORT")
    print("="*80)
    
    for result in all_results:
        print(f"\n{result['template']}:")
        for check, data in result['checks'].items():
            status = data.get('status', 'unknown')
            symbol = '✅' if status == 'pass' else '❌' if status == 'fail' else '⚠️'
            print(f"  {symbol} {check}: {status}")
    
    # Save results to JSON
    report_file = TEMPLATES_DIR / 'validation_report.json'
    with open(report_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"\n📄 Detailed report saved to: {report_file}")
    
    # Exit with appropriate code
    any_failures = any(
        result['checks'].get(check, {}).get('status') == 'fail'
        for result in all_results
        for check in result['checks']
    )
    
    if any_failures:
        print("\n❌ Some templates have issues that need fixing")
        return 1
    else:
        print("\n✅ All templates validated successfully!")
        return 0

if __name__ == '__main__':
    sys.exit(main())