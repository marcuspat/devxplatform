#!/bin/bash
set -e

echo "=== Docker Desktop Credential Fix Script ==="
echo "This script fixes Docker credential issues on macOS"
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

# Find docker-credential-osxkeychain
DOCKER_CRED_PATH="/Applications/Docker.app/Contents/Resources/bin/docker-credential-osxkeychain"
if [ ! -f "$DOCKER_CRED_PATH" ]; then
    echo "Error: docker-credential-osxkeychain not found at expected location"
    echo "Expected: $DOCKER_CRED_PATH"
    exit 1
fi

echo "Found docker-credential-osxkeychain at: $DOCKER_CRED_PATH"

# Create symlink in /usr/local/bin if it doesn't exist
if [ ! -L "/usr/local/bin/docker-credential-osxkeychain" ]; then
    echo "Creating symlink in /usr/local/bin..."
    sudo ln -sf "$DOCKER_CRED_PATH" /usr/local/bin/docker-credential-osxkeychain
    echo "Symlink created successfully"
else
    echo "Symlink already exists in /usr/local/bin"
fi

# Ensure /usr/local/bin is in PATH
if [[ ":$PATH:" != *":/usr/local/bin:"* ]]; then
    echo "Adding /usr/local/bin to PATH..."
    export PATH="/usr/local/bin:$PATH"
    echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
    echo "PATH updated"
fi

# Configure Docker to use osxkeychain
echo "Configuring Docker to use osxkeychain..."
docker-credential-osxkeychain list > /dev/null 2>&1 || true

# Update Docker config if needed
DOCKER_CONFIG="$HOME/.docker/config.json"
if [ -f "$DOCKER_CONFIG" ]; then
    # Check if credsStore is already set to osxkeychain
    if ! grep -q '"credsStore": "osxkeychain"' "$DOCKER_CONFIG"; then
        echo "Updating Docker config to use osxkeychain..."
        # Backup existing config
        cp "$DOCKER_CONFIG" "$DOCKER_CONFIG.backup"
        # Update credsStore
        jq '.credsStore = "osxkeychain"' "$DOCKER_CONFIG" > "$DOCKER_CONFIG.tmp" && mv "$DOCKER_CONFIG.tmp" "$DOCKER_CONFIG"
        echo "Docker config updated"
    else
        echo "Docker already configured to use osxkeychain"
    fi
fi

# Test Docker credential helper
echo
echo "Testing Docker credential helper..."
if docker-credential-osxkeychain list > /dev/null 2>&1; then
    echo "✅ Docker credential helper is working correctly"
else
    echo "⚠️  Docker credential helper test failed, but this might be normal if no credentials are stored"
fi

# Test Docker login (optional)
echo
echo "Testing Docker Hub connection..."
if docker pull hello-world > /dev/null 2>&1; then
    echo "✅ Docker can pull images successfully"
else
    echo "⚠️  Docker pull test failed. You may need to log in to Docker Hub:"
    echo "   docker login"
fi

echo
echo "=== Docker credential fix completed ==="
echo
echo "Next steps:"
echo "1. If you haven't logged in to Docker Hub, run: docker login"
echo "2. Test building a Docker image"
echo "3. If issues persist, restart Docker Desktop"