#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# THE JUNGLE — ONE-COMMAND DEPLOY
# Run: bash deploy.sh YOUR_GITHUB_TOKEN
# ═══════════════════════════════════════════════════════════════
set -e

TOKEN="${1:-}"
REPO_NAME="jungle-dm-ai"

if [ -z "$TOKEN" ]; then
  echo ""
  echo "Usage: bash deploy.sh YOUR_GITHUB_PERSONAL_ACCESS_TOKEN"
  echo ""
  echo "Get a token at: https://github.com/settings/tokens/new"
  echo "Check the 'repo' scope only. Paste the token as the argument."
  echo ""
  exit 1
fi

echo "═══════════════════════════════════════"
echo "  Creating private GitHub repo..."
echo "═══════════════════════════════════════"

# Get GitHub username
USERNAME=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep '"login"' | head -1 | sed 's/.*: "//;s/".*//')

if [ -z "$USERNAME" ]; then
  echo "ERROR: Invalid GitHub token. Get one at https://github.com/settings/tokens/new"
  exit 1
fi

echo "Logged in as: $USERNAME"

# Create repo (ignore if exists)
curl -s -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":true,\"description\":\"The Jungle DM AI Sales System\"}" > /dev/null 2>&1

echo "Repo: https://github.com/$USERNAME/$REPO_NAME (private)"

# Set remote and push
git remote remove origin 2>/dev/null || true
git remote add origin "https://$TOKEN@github.com/$USERNAME/$REPO_NAME.git"
git push -u origin main --force

echo ""
echo "═══════════════════════════════════════"
echo "  CODE PUSHED TO GITHUB"
echo "═══════════════════════════════════════"
echo ""
echo "NEXT STEPS (2 minutes):"
echo ""
echo "1. Go to: https://render.com → Sign up / Log in"
echo "2. Click: New → Web Service"
echo "3. Connect your GitHub → select '$REPO_NAME'"
echo "4. Settings will auto-fill from render.yaml"
echo "5. Add environment variables:"
echo "   ANTHROPIC_API_KEY = your key from console.anthropic.com"
echo "   WEBHOOK_SECRET    = $(openssl rand -hex 16)"
echo "   DASHBOARD_PASS    = $(openssl rand -hex 8)"
echo "6. Click 'Create Web Service'"
echo "7. Wait ~60 seconds for deploy"
echo "8. Visit: https://YOUR-RENDER-URL/health"
echo ""
echo "That's it. Server is live."
echo "═══════════════════════════════════════"
