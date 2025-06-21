#!/bin/bash

set -e

echo "=== Installing Security Scanning Tools ==="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get OS type
get_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        *)          echo "unknown";;
    esac
}

OS=$(get_os)
ARCH=$(uname -m)

# Install Trivy for container and vulnerability scanning
install_trivy() {
    echo "Installing Trivy..."
    if command_exists trivy; then
        echo "Trivy is already installed"
        trivy --version
    else
        if [ "$OS" = "macos" ]; then
            brew install aquasecurity/trivy/trivy || {
                echo "Homebrew not found. Installing Trivy from binary..."
                curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
            }
        elif [ "$OS" = "linux" ]; then
            curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
        fi
    fi
}

# Install Hadolint for Dockerfile linting
install_hadolint() {
    echo "Installing Hadolint..."
    if command_exists hadolint; then
        echo "Hadolint is already installed"
        hadolint --version
    else
        if [ "$OS" = "macos" ]; then
            brew install hadolint || {
                echo "Homebrew not found. Installing Hadolint from binary..."
                if [ "$ARCH" = "arm64" ]; then
                    curl -L https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Darwin-arm64 -o /usr/local/bin/hadolint
                else
                    curl -L https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Darwin-x86_64 -o /usr/local/bin/hadolint
                fi
                chmod +x /usr/local/bin/hadolint
            }
        elif [ "$OS" = "linux" ]; then
            curl -L https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 -o /usr/local/bin/hadolint
            chmod +x /usr/local/bin/hadolint
        fi
    fi
}

# Install Bandit for Python security scanning
install_bandit() {
    echo "Installing Bandit..."
    if command_exists bandit; then
        echo "Bandit is already installed"
        bandit --version
    else
        if command_exists pip3; then
            pip3 install bandit
        elif command_exists pip; then
            pip install bandit
        else
            echo "Python pip not found. Please install Python 3 and pip."
            return 1
        fi
    fi
}

# Install Safety for Python dependency checking
install_safety() {
    echo "Installing Safety..."
    if command_exists safety; then
        echo "Safety is already installed"
        safety --version
    else
        if command_exists pip3; then
            pip3 install safety
        elif command_exists pip; then
            pip install safety
        else
            echo "Python pip not found. Please install Python 3 and pip."
            return 1
        fi
    fi
}

# Install additional security tools
install_additional_tools() {
    echo "Installing additional security tools..."
    
    # Install semgrep for SAST
    if ! command_exists semgrep; then
        echo "Installing Semgrep..."
        if command_exists pip3; then
            pip3 install semgrep
        fi
    fi
    
    # Install npm-audit for Node.js dependency scanning (already available with npm)
    if command_exists npm; then
        echo "npm audit is available with npm"
    fi
    
    # Install audit-ci for CI-friendly npm auditing
    if ! command_exists audit-ci; then
        echo "Installing audit-ci..."
        if command_exists npm; then
            npm install -g audit-ci
        else
            echo "npm not found. Please install Node.js and npm to use audit-ci."
        fi
    else
        echo "audit-ci is already installed"
        audit-ci --version
    fi
    
    # Install gosec for Go security scanning
    if ! command_exists gosec; then
        echo "Installing gosec..."
        if [ "$OS" = "macos" ]; then
            brew install gosec || {
                curl -sfL https://raw.githubusercontent.com/securego/gosec/master/install.sh | sh -s -- -b /usr/local/bin
            }
        else
            curl -sfL https://raw.githubusercontent.com/securego/gosec/master/install.sh | sh -s -- -b /usr/local/bin
        fi
    fi
}

# Main installation
main() {
    echo "Detected OS: $OS"
    echo "Detected Architecture: $ARCH"
    echo ""
    
    # Check for required permissions
    if [ "$OS" = "linux" ] && [ "$EUID" -ne 0 ]; then 
        echo "Please run with sudo for Linux installations"
        exit 1
    fi
    
    install_trivy
    echo ""
    
    install_hadolint
    echo ""
    
    install_bandit
    echo ""
    
    install_safety
    echo ""
    
    install_additional_tools
    echo ""
    
    echo "=== Security Tools Installation Complete ==="
    echo ""
    echo "Installed tools summary:"
    command_exists trivy && echo "✓ Trivy: $(trivy --version 2>&1 | head -n 1)"
    command_exists hadolint && echo "✓ Hadolint: $(hadolint --version 2>&1)"
    command_exists bandit && echo "✓ Bandit: $(bandit --version 2>&1 | grep version)"
    command_exists safety && echo "✓ Safety: $(safety --version 2>&1)"
    command_exists semgrep && echo "✓ Semgrep: $(semgrep --version 2>&1)"
    command_exists gosec && echo "✓ Gosec: $(gosec --version 2>&1)"
    
    echo ""
    echo "You can now run security scans using the provided scripts."
}

main "$@"