#!/usr/bin/env python3
"""Quick validation script for Kubernetes manifests"""

import yaml
import os
import sys

def validate_yaml_file(file_path):
    """Validate a single YAML file"""
    try:
        with open(file_path, 'r') as f:
            # Try to load all documents in the file
            documents = list(yaml.safe_load_all(f))
            
            # Check if any documents were loaded
            if not documents or all(doc is None for doc in documents):
                return False, "Empty or invalid YAML file"
            
            # Basic validation for each document
            for i, doc in enumerate(documents):
                if doc is None:
                    continue
                    
                # Check for required fields
                if 'kind' not in doc:
                    return False, f"Document {i+1}: Missing 'kind' field"
                if 'apiVersion' not in doc:
                    return False, f"Document {i+1}: Missing 'apiVersion' field"
                    
                # For most resources (except List), check metadata
                if doc['kind'] != 'List' and 'metadata' not in doc:
                    return False, f"Document {i+1}: Missing 'metadata' field"
                
            return True, "Valid"
            
    except yaml.YAMLError as e:
        return False, f"YAML error: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    """Main function"""
    errors = []
    valid_count = 0
    total_count = 0
    
    # Find all YAML files
    for root, dirs, files in os.walk('infrastructure/kubernetes'):
        for file in files:
            if file.endswith('.yaml') or file.endswith('.yml'):
                file_path = os.path.join(root, file)
                total_count += 1
                
                is_valid, message = validate_yaml_file(file_path)
                
                if is_valid:
                    valid_count += 1
                    print(f"✓ {file_path}")
                else:
                    errors.append((file_path, message))
                    print(f"✗ {file_path}: {message}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"Total files: {total_count}")
    print(f"Valid files: {valid_count}")
    print(f"Invalid files: {len(errors)}")
    
    if errors:
        print(f"\nErrors:")
        for file_path, error in errors:
            print(f"  {file_path}: {error}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())