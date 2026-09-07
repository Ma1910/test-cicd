#!/usr/bin/env bash
# Enterprise CI/CD & Team Automation Installer for Linux / macOS (Bash)
# Usage: curl -fsSL https://raw.githubusercontent.com/Ma1910/test-cicd/main/setup.sh | bash

set -e

echo ""
echo "======================================================================"
echo -e "\033[1;32m🚀 [CI/CD SETUP] Bootstrapping Enterprise CI/CD & Team Automation...\033[0m"
echo -e "\033[1;33m📁 Target Directory: $(pwd)\033[0m"
echo "======================================================================"
echo ""

REPO_RAW="https://raw.githubusercontent.com/Ma1910/test-cicd/main"

FILES=(
  ".github/workflows/ci.yml"
  ".github/copilot-instructions.md"
  ".ai/README.md"
  ".ai/CLAUDE.md"
  ".ai/.cursorrules"
  ".ai/.windsurfrules"
  ".ai/AGENTS.md"
  "scripts/check-updates.js"
  "scripts/watch-team.js"
  "scripts/open-cicd.js"
  "Dockerfile"
  ".dockerignore"
  "vitest.config.ts"
)

for file in "${FILES[@]}"; do
  dir=$(dirname "$file")
  mkdir -p "$dir"
  echo "  -> Fetching $file..."
  curl -fsSL "$REPO_RAW/$file" -o "$file"
done

echo ""
echo -e "\033[1;32m✅ Files downloaded successfully!\033[0m"

# Update package.json if node is available
if [ -f "package.json" ]; then
  echo -e "\033[1;36m📦 Configuring scripts in package.json...\033[0m"
  node -e "
    const fs = require('fs');
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      pkg.scripts = pkg.scripts || {};
      const scripts = {
        'cicd': 'node scripts/open-cicd.js',
        'cicd:actions': 'node scripts/open-cicd.js actions',
        'check:team': 'node scripts/check-updates.js',
        'watch:team': 'node scripts/watch-team.js',
        'sync': 'git pull origin main',
        'test': 'vitest run',
        'typecheck': 'tsc --noEmit'
      };
      for (const [k, v] of Object.entries(scripts)) {
        if (!pkg.scripts[k]) pkg.scripts[k] = v;
      }
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
      console.log('  + Configured npm scripts');
    } catch(e) {}
  " 2>/dev/null || true
fi

echo ""
echo "======================================================================"
echo -e "\033[1;32m🎉 [SUCCESS] CI/CD Automation Platform installed successfully!\033[0m"
echo -e "\033[1;36m👉 Run: npm run cicd          (View live simulator & workflow)\033[0m"
echo -e "\033[1;36m👉 Run: npm run check:team    (Check for teammate updates)\033[0m"
echo "======================================================================"
echo ""
