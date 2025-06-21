#!/bin/bash

# Security tools setup script
# This script installs all security scanning tools required for the DevX Platform

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=================================================="
echo "       DevX Platform Security Tools Setup         "
echo "=================================================="
echo ""
echo "This script will install the following security tools:"
echo "  - trivy: Container and vulnerability scanning"
echo "  - hadolint: Dockerfile linting and best practices"
echo "  - audit-ci: CI-friendly npm vulnerability scanning"
echo "  - bandit: Python code security analysis"
echo "  - safety: Python dependency vulnerability checking"
echo "  - semgrep: Static analysis for multiple languages"
echo "  - gosec: Go security analyzer"
echo ""
echo "Installation will begin in 3 seconds..."
echo ""
sleep 3

# Run the actual installation script
"$SCRIPT_DIR/scripts/install-security-tools.sh"

echo ""
echo "=================================================="
echo "       Security Tools Setup Complete!             "
echo "=================================================="
echo ""
echo "You can now run security scans using:"
echo "  ./security/scan-all.sh"
echo ""
echo "For individual scans, use the specific tools directly:"
echo "  - trivy image <image-name>"
echo "  - hadolint <Dockerfile>"
echo "  - audit-ci"
echo "  - bandit -r <python-directory>"
echo "  - safety check"
echo ""