#!/usr/bin/env bash
set -euo pipefail

MIN_NODE_MAJOR=20
AIRIC_VERSION="${AIRIC_VERSION:-latest}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required but not found." >&2
    echo "$2" >&2
    exit 1
  fi
}

require_command node "Install Node.js ${MIN_NODE_MAJOR}+ from https://nodejs.org/"
require_command npm "npm should ship with Node.js."

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  echo "error: Node.js ${MIN_NODE_MAJOR}+ required (found $(node -v))." >&2
  exit 1
fi

echo "Installing airic@${AIRIC_VERSION}..."
npm install -g "airic@${AIRIC_VERSION}"

echo ""
airic --version
echo ""
echo "Add Airic to your ACP client (e.g. Zed ~/.config/zed/settings.json):"
echo ""
cat <<'EOF'
{
  "agent_servers": {
    "Airic": {
      "command": "airic",
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
EOF
