#!/usr/bin/env python3
"""
Simple Kubernetes manifest validation without external dependencies.
Uses basic YAML parsing available in Python standard library.
"""

import os
import sys
import json
from pathlib import Path

def simple_yaml_load(content):
    """Simple YAML-like parser for basic validation."""
    try:
        # Try to parse as JSON first (valid YAML subset)
        return json.loads(content)
    except json.JSONDecodeError:
        # Basic YAML structure validation without full parsing
        lines = content.strip().split('\n')
        
        # Check for basic YAML structure indicators
        has_apiversion = any(line.strip().startswith('apiVersion:') for line in lines)
        has_kind = any(line.strip().startswith('kind:') for line in lines)
        has_metadata = any(line.strip().startswith('metadata:') for line in lines)
        
        if has_apiversion and has_kind and has_metadata:
            return {"basic_structure": "valid"}
        else:
            raise ValueError("Missing required Kubernetes fields")

def validate_file_basic(file_path):
    """Basic validation of Kubernetes manifest file."""
    errors = []
    warnings = []
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for empty files
        if not content.strip():
            errors.append("File is empty")
            return False, errors, warnings
        
        # Check for basic YAML/Kubernetes structure
        if '---' in content:
            # Multiple documents
            documents = content.split('---')
            for i, doc in enumerate(documents):
                if doc.strip():
                    try:
                        simple_yaml_load(doc)
                    except Exception as e:
                        errors.append(f"Document {i+1}: {str(e)}")
        else:
            # Single document
            try:
                simple_yaml_load(content)
            except Exception as e:
                errors.append(str(e))
        
        # Check for common issues
        if 'namespace:' not in content and file_path.endswith('.yaml'):
            # Only warn for main resource files, not patches
            if 'patch' not in file_path.lower():
                warnings.append("Resource should specify a namespace")
        
        # Check for common Kubernetes patterns
        required_patterns = ['apiVersion:', 'kind:', 'metadata:']
        for pattern in required_patterns:
            if pattern not in content:
                errors.append(f"Missing required field: {pattern.rstrip(':')}")
        
    except Exception as e:
        errors.append(f"Could not read file: {e}")
    
    return len(errors) == 0, errors, warnings

def main():
    """Main validation function."""
    print("Simple Kubernetes Manifest Validation")
    print("=" * 40)
    
    manifest_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    
    total_files = 0
    valid_files = 0
    total_errors = 0
    
    # Find YAML files
    for root, dirs, files in os.walk(manifest_dir):
        for file in files:
            if file.endswith('.yaml') or file.endswith('.yml'):
                if 'kustomization' not in file.lower():  # Skip kustomization files
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, manifest_dir)
                    
                    total_files += 1
                    print(f"\nValidating: {rel_path}")
                    
                    is_valid, errors, warnings = validate_file_basic(file_path)
                    
                    if is_valid:
                        print("  ✓ VALID")
                        valid_files += 1
                    else:
                        print("  ✗ INVALID")
                        for error in errors:
                            print(f"    Error: {error}")
                            total_errors += 1
                    
                    for warning in warnings:
                        print(f"    Warning: {warning}")
    
    # Summary
    print("\n" + "=" * 40)
    print("Summary:")
    print(f"  Total files: {total_files}")
    print(f"  Valid files: {valid_files}")
    print(f"  Invalid files: {total_files - valid_files}")
    print(f"  Total errors: {total_errors}")
    
    success_rate = (valid_files / total_files * 100) if total_files > 0 else 0
    print(f"  Success rate: {success_rate:.1f}%")
    
    if valid_files == total_files:
        print("\n✅ All manifests passed basic validation!")
        return 0
    else:
        print(f"\n❌ {total_files - valid_files} manifests have errors.")
        return 1

if __name__ == "__main__":
    sys.exit(main())