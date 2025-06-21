#!/usr/bin/env python3
"""
Offline Kubernetes manifest validation script.
Validates YAML syntax and basic Kubernetes resource structure without requiring a cluster.
"""

import os
import yaml
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Required fields for common Kubernetes resources
REQUIRED_FIELDS = {
    'Deployment': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'Service': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'ConfigMap': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict
    },
    'Secret': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'type': str
    },
    'Ingress': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'HorizontalPodAutoscaler': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'PodDisruptionBudget': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'NetworkPolicy': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'ServiceMonitor': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'DestinationRule': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'Gateway': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'VirtualService': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'PeerAuthentication': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    },
    'AuthorizationPolicy': {
        'apiVersion': str,
        'kind': str,
        'metadata': dict,
        'spec': dict
    }
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def validate_yaml_syntax(file_path: str) -> Tuple[bool, List[str]]:
    """Validate YAML syntax."""
    errors = []
    try:
        with open(file_path, 'r') as f:
            yaml.safe_load_all(f)
        return True, []
    except yaml.YAMLError as e:
        errors.append(f"YAML syntax error: {e}")
        return False, errors
    except Exception as e:
        errors.append(f"File error: {e}")
        return False, errors

def validate_k8s_resource(resource: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate Kubernetes resource structure."""
    errors = []
    
    # Check if resource has required top-level fields
    if 'kind' not in resource:
        errors.append("Missing required field: kind")
        return False, errors
    
    kind = resource['kind']
    
    # Skip validation for unknown resource types
    if kind not in REQUIRED_FIELDS:
        return True, [f"Unknown resource type '{kind}' - skipping validation"]
    
    # Validate required fields for this resource type
    required = REQUIRED_FIELDS[kind]
    for field, field_type in required.items():
        if field not in resource:
            errors.append(f"Missing required field: {field}")
        elif not isinstance(resource[field], field_type):
            errors.append(f"Field '{field}' should be of type {field_type.__name__}")
    
    # Validate metadata structure
    if 'metadata' in resource:
        metadata = resource['metadata']
        if 'name' not in metadata:
            errors.append("metadata.name is required")
        
        # Check for namespace in resources that should have it
        if kind in ['Deployment', 'Service', 'ConfigMap', 'Secret', 'Ingress', 
                   'HorizontalPodAutoscaler', 'PodDisruptionBudget', 'NetworkPolicy',
                   'ServiceMonitor', 'DestinationRule', 'Gateway', 'VirtualService',
                   'PeerAuthentication', 'AuthorizationPolicy']:
            if 'namespace' not in metadata:
                errors.append(f"{kind} should have metadata.namespace specified")
    
    # Validate specific resource types
    if kind == 'Deployment':
        if 'spec' in resource and 'selector' in resource['spec']:
            selector = resource['spec']['selector']
            if 'matchLabels' not in selector:
                errors.append("Deployment spec.selector.matchLabels is required")
        
        # Check template labels match selector
        if ('spec' in resource and 'template' in resource['spec'] and 
            'metadata' in resource['spec']['template'] and 
            'labels' in resource['spec']['template']['metadata']):
            template_labels = resource['spec']['template']['metadata']['labels']
            if 'spec' in resource and 'selector' in resource['spec'] and 'matchLabels' in resource['spec']['selector']:
                selector_labels = resource['spec']['selector']['matchLabels']
                for key, value in selector_labels.items():
                    if key not in template_labels or template_labels[key] != value:
                        errors.append(f"Template labels don't match selector: {key}={value}")
    
    elif kind == 'Service':
        if 'spec' in resource:
            spec = resource['spec']
            if 'ports' not in spec:
                errors.append("Service spec.ports is required")
            if 'selector' not in spec:
                errors.append("Service spec.selector is required")
    
    elif kind == 'PodDisruptionBudget':
        if 'spec' in resource:
            spec = resource['spec']
            has_min_available = 'minAvailable' in spec
            has_max_unavailable = 'maxUnavailable' in spec
            
            if has_min_available and has_max_unavailable:
                errors.append("PodDisruptionBudget cannot have both minAvailable and maxUnavailable")
            elif not has_min_available and not has_max_unavailable:
                errors.append("PodDisruptionBudget must have either minAvailable or maxUnavailable")
    
    return len(errors) == 0, errors

def validate_file(file_path: str) -> Tuple[bool, List[str], List[str]]:
    """Validate a single Kubernetes manifest file."""
    warnings = []
    
    # Validate YAML syntax
    is_valid_yaml, yaml_errors = validate_yaml_syntax(file_path)
    if not is_valid_yaml:
        return False, yaml_errors, warnings
    
    # Load and validate Kubernetes resources
    all_errors = []
    try:
        with open(file_path, 'r') as f:
            documents = yaml.safe_load_all(f)
            
            for doc_index, doc in enumerate(documents):
                if doc is None:
                    continue
                
                is_valid_resource, resource_errors = validate_k8s_resource(doc)
                
                # Add document context to errors
                prefixed_errors = [f"Document {doc_index + 1}: {error}" for error in resource_errors]
                all_errors.extend(prefixed_errors)
                
    except Exception as e:
        all_errors.append(f"Error processing file: {e}")
    
    return len(all_errors) == 0, all_errors, warnings

def main():
    """Main validation function."""
    if len(sys.argv) > 1:
        manifest_dir = sys.argv[1]
    else:
        manifest_dir = "."
    
    print(f"{Colors.BOLD}Kubernetes Manifest Offline Validation{Colors.END}")
    print("=" * 50)
    
    total_files = 0
    valid_files = 0
    total_errors = 0
    
    # Find all YAML files
    yaml_files = []
    for root, dirs, files in os.walk(manifest_dir):
        for file in files:
            if file.endswith('.yaml') or file.endswith('.yml'):
                # Skip kustomization files as they have different structure
                if 'kustomization' not in file.lower():
                    yaml_files.append(os.path.join(root, file))
    
    if not yaml_files:
        print(f"{Colors.YELLOW}No YAML manifest files found in {manifest_dir}{Colors.END}")
        return 1
    
    for file_path in sorted(yaml_files):
        total_files += 1
        rel_path = os.path.relpath(file_path, manifest_dir)
        
        print(f"\n{Colors.BLUE}Validating: {rel_path}{Colors.END}")
        
        is_valid, errors, warnings = validate_file(file_path)
        
        if is_valid:
            print(f"  {Colors.GREEN}✓ VALID{Colors.END}")
            valid_files += 1
        else:
            print(f"  {Colors.RED}✗ INVALID{Colors.END}")
            for error in errors:
                print(f"    {Colors.RED}Error: {error}{Colors.END}")
                total_errors += 1
        
        for warning in warnings:
            print(f"    {Colors.YELLOW}Warning: {warning}{Colors.END}")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"{Colors.BOLD}Validation Summary:{Colors.END}")
    print(f"  Total files: {total_files}")
    print(f"  Valid files: {Colors.GREEN}{valid_files}{Colors.END}")
    print(f"  Invalid files: {Colors.RED}{total_files - valid_files}{Colors.END}")
    print(f"  Total errors: {Colors.RED}{total_errors}{Colors.END}")
    
    if valid_files == total_files:
        print(f"\n{Colors.GREEN}{Colors.BOLD}All manifests are valid! 🎉{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}Some manifests have errors. Please fix them before deploying.{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())