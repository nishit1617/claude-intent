#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════╗"
echo "║   Installing claude-intent...    ║"
echo "╚══════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+ first."
  echo "   https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. You have Node.js $NODE_VERSION."
  exit 1
fi

echo "✅ Node.js $(node --version) found"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --silent

# Make CLI executable
chmod +x bin/claude-intent.js

# Install globally
echo "Installing claude-intent globally..."
npm install -g . --silent 2>/dev/null || {
  # Fallback: add to PATH via symlink
  mkdir -p "$HOME/.local/bin"
  ln -sf "$(pwd)/bin/claude-intent.js" "$HOME/.local/bin/claude-intent"
  echo "Installed to ~/.local/bin/claude-intent"
  echo ""
  echo "⚠️  Add this to your ~/.zshrc or ~/.bashrc if not already:"
  echo '   export PATH="$HOME/.local/bin:$PATH"'
}

echo ""
echo "✅ claude-intent installed!"
echo ""
echo "Next step — run setup:"
echo "  claude-intent setup"
echo ""
