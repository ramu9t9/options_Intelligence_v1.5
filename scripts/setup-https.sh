#!/bin/bash

# Phase 4: Local HTTPS Setup with mkcert
# This script sets up local HTTPS development environment

echo "🔐 Setting up local HTTPS development environment..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "📦 Installing mkcert..."
    
    # Install mkcert based on the system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - use wget to download
        wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
        chmod +x mkcert
        sudo mv mkcert /usr/local/bin/
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Homebrew
        if command -v brew &> /dev/null; then
            brew install mkcert
        else
            echo "❌ Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    else
        echo "❌ Unsupported operating system. Please install mkcert manually."
        exit 1
    fi
else
    echo "✅ mkcert is already installed"
fi

# Install local CA
echo "🔧 Installing local Certificate Authority..."
mkcert -install

# Create certificates directory
mkdir -p certs
cd certs

# Generate certificates for local development
echo "🎫 Generating SSL certificates..."
mkcert localhost 127.0.0.1 ::1 *.replit.app *.replit.co *.repl.co

# Rename certificates to standard names
mv localhost+4.pem cert.pem
mv localhost+4-key.pem key.pem

echo "✅ SSL certificates generated:"
echo "   📄 Certificate: certs/cert.pem"
echo "   🔑 Private Key: certs/key.pem"

cd ..

# Create HTTPS server configuration
cat > server/httpsConfig.js << 'EOF'
/**
 * Phase 4: HTTPS Configuration for Local Development
 * Options Intelligence Platform
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTTPS configuration with SSL certificates
export function getHttpsConfig() {
  const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');
  const keyPath = path.join(__dirname, '..', 'certs', 'key.pem');
  
  // Check if certificates exist
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('⚠️  SSL certificates not found. Run setup-https.sh first.');
    return null;
  }
  
  try {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } catch (error) {
    console.error('❌ Failed to read SSL certificates:', error.message);
    return null;
  }
}

// Environment-based HTTPS enablement
export function shouldUseHttps() {
  return process.env.NODE_ENV === 'development' && process.env.ENABLE_HTTPS === 'true';
}

EOF

# Create environment configuration
echo "" >> .env.development
echo "# Phase 4: HTTPS Configuration" >> .env.development
echo "ENABLE_HTTPS=true" >> .env.development
echo "HTTPS_PORT=5001" >> .env.development

echo ""
echo "🎉 Local HTTPS setup complete!"
echo ""
echo "To enable HTTPS in development:"
echo "1. Set ENABLE_HTTPS=true in .env.development"
echo "2. Update your server to use the HTTPS configuration"
echo "3. Access your app at https://localhost:5001"
echo ""
echo "⚠️  Note: You may need to restart your development server"