#!/bin/bash

echo "🌊 Installing Walrus CLI..."

# Check if already installed
if command -v walrus &> /dev/null; then
    echo "✅ Walrus CLI is already installed"
    walrus --version
    exit 0
fi

# Install Walrus CLI
echo "📥 Downloading Walrus CLI..."

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
    Linux*)
        if [ "${ARCH}" = "x86_64" ]; then
            BINARY_URL="https://github.com/MystenLabs/walrus/releases/latest/download/walrus-linux-x86_64"
        elif [ "${ARCH}" = "aarch64" ]; then
            BINARY_URL="https://github.com/MystenLabs/walrus/releases/latest/download/walrus-linux-aarch64"
        else
            echo "❌ Unsupported Linux architecture: ${ARCH}"
            exit 1
        fi
        ;;
    Darwin*)
        if [ "${ARCH}" = "x86_64" ]; then
            BINARY_URL="https://github.com/MystenLabs/walrus/releases/latest/download/walrus-macos-x86_64"
        elif [ "${ARCH}" = "arm64" ]; then
            BINARY_URL="https://github.com/MystenLabs/walrus/releases/latest/download/walrus-macos-arm64"
        else
            echo "❌ Unsupported macOS architecture: ${ARCH}"
            exit 1
        fi
        ;;
    *)
        echo "❌ Unsupported operating system: ${OS}"
        exit 1
        ;;
esac

# Download and install
curl -L "${BINARY_URL}" -o walrus
chmod +x walrus

# Move to a directory in PATH
if [ -w /usr/local/bin ]; then
    mv walrus /usr/local/bin/
    echo "✅ Walrus CLI installed to /usr/local/bin/walrus"
elif [ -w "$HOME/.local/bin" ]; then
    mkdir -p "$HOME/.local/bin"
    mv walrus "$HOME/.local/bin/"
    echo "✅ Walrus CLI installed to $HOME/.local/bin/walrus"
    echo "⚠️  Make sure $HOME/.local/bin is in your PATH"
else
    echo "✅ Walrus CLI downloaded to $(pwd)/walrus"
    echo "⚠️  Please move it to a directory in your PATH or run it directly with ./walrus"
fi

echo "🎉 Installation complete!"
walrus --version 2>/dev/null || echo "Please restart your terminal or add the walrus binary to your PATH"