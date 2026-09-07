# Enterprise CI/CD & Team Automation Installer for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/Ma1910/test-cicd/main/setup.ps1 | iex

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ">> [CI/CD SETUP] Bootstrapping Enterprise CI/CD & Team Automation..." -ForegroundColor Green
Write-Host ">> Target Directory: $PWD" -ForegroundColor Yellow
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

$REPO_RAW = "https://raw.githubusercontent.com/Ma1910/test-cicd/main"

$files = @(
    ".github/workflows/ci.yml",
    ".github/copilot-instructions.md",
    ".ai/README.md",
    ".ai/CLAUDE.md",
    ".ai/PONYTAIL.md",
    ".ai/.cursorrules",
    ".ai/.windsurfrules",
    ".ai/AGENTS.md",
    "scripts/check-updates.js",
    "scripts/watch-team.js",
    "scripts/open-cicd.js",
    "Dockerfile",
    ".dockerignore",
    "vitest.config.ts"
)

foreach ($file in $files) {
    $url = "$REPO_RAW/$file"
    $dest = Join-Path $PWD $file
    $destDir = Split-Path $dest -Parent
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Write-Host "  -> Fetching $file..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

Write-Host ""
Write-Host "[OK] Files downloaded successfully!" -ForegroundColor Green

# Update package.json if it exists and node is available
$pkgPath = Join-Path $PWD "package.json"
if (Test-Path $pkgPath) {
    Write-Host ">> Configuring scripts in package.json..." -ForegroundColor Cyan
    try {
        if (Get-Command node -ErrorAction SilentlyContinue) {
            node -e "
              const fs = require('fs');
              try {
                const p = 'package.json';
                const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
                pkg.scripts = pkg.scripts || {};
                const s = {
                  'cicd': 'node scripts/open-cicd.js',
                  'cicd:actions': 'node scripts/open-cicd.js actions',
                  'check:team': 'node scripts/check-updates.js',
                  'watch:team': 'node scripts/watch-team.js',
                  'sync': 'git pull origin main',
                  'test': 'vitest run',
                  'typecheck': 'tsc --noEmit'
                };
                for (const [k, v] of Object.entries(s)) {
                  if (!pkg.scripts[k]) pkg.scripts[k] = v;
                }
                fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
                console.log('  + Configured npm scripts');
              } catch(e) {}
            "
        }
    } catch {
        Write-Host "  (Note: verify package.json scripts manually)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Green
Write-Host ">> [SUCCESS] CI/CD Automation Platform installed successfully!" -ForegroundColor Green
Write-Host ">> Run: npm run cicd          (View live simulator & workflow)" -ForegroundColor Cyan
Write-Host ">> Run: npm run check:team    (Check for teammate updates)" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Green
Write-Host ""
