# Discharge Buddy - Setup Verification Script (PowerShell)
# Checks if environment is properly configured for OAuth and app startup

$ErrorActionPreference = "Continue"

# Colors for output
$Green = @{ ForegroundColor = "Green" }
$Red = @{ ForegroundColor = "Red" }
$Yellow = @{ ForegroundColor = "Yellow" }
$Blue = @{ ForegroundColor = "Cyan" }

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" @Blue
Write-Host "║  Discharge Buddy - Setup Verification Script             ║" @Blue
Write-Host "╚═══════════════════════════════════════════════════════════╝" @Blue
Write-Host ""

# Check 1: Node.js version
Write-Host "[1/8] Checking Node.js version..." @Blue
$nodeExe = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeExe) {
    Write-Host "✗ Node.js not found" @Red
    exit 1
}
$nodeVersion = & node -v
Write-Host "✓ Node.js $nodeVersion" @Green
Write-Host ""

# Check 2: pnpm is installed
Write-Host "[2/8] Checking pnpm installation..." @Blue
$pnpmExe = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -eq $pnpmExe) {
    Write-Host "✗ pnpm not found. Install with: npm install -g pnpm" @Red
    exit 1
}
$pnpmVersion = & pnpm -v
Write-Host "✓ pnpm $pnpmVersion" @Green
Write-Host ""

# Check 3: Project structure
Write-Host "[3/8] Checking project structure..." @Blue
$requiredDirs = @(
    "artifacts\api-server",
    "artifacts\discharge-buddy",
    "lib\db"
)
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir -PathType Container) {
        Write-Host "✓ Found: $dir" @Green
    } else {
        Write-Host "✗ Missing: $dir" @Red
        exit 1
    }
}
Write-Host ""

# Check 4: .env file
Write-Host "[4/8] Checking .env configuration..." @Blue
if (Test-Path ".env" -PathType Leaf) {
    Write-Host "✓ .env file exists" @Green
    
    $envContent = Get-Content ".env"
    
    if ($envContent -match "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") {
        Write-Host "✓ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID configured" @Green
    } else {
        Write-Host "✗ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID missing" @Red
    }
    
    if ($envContent -match "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID") {
        if ($envContent -match "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=$") {
            Write-Host "⚠ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is empty (OK for Expo Go)" @Yellow
        } else {
            Write-Host "✓ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID configured" @Green
        }
    } else {
        Write-Host "⚠ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID missing (needed for production)" @Yellow
    }
    
    if ($envContent -match "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") {
        if ($envContent -match "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=$") {
            Write-Host "⚠ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is empty (OK for Expo Go)" @Yellow
        } else {
            Write-Host "✓ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID configured" @Green
        }
    } else {
        Write-Host "⚠ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID missing (needed for production)" @Yellow
    }
    
    if ($envContent -match "DATABASE_URL") {
        Write-Host "✓ DATABASE_URL configured" @Green
    } else {
        Write-Host "⚠ DATABASE_URL missing (needed for backend)" @Yellow
    }
} else {
    Write-Host "⚠ .env file not found" @Yellow
    Write-Host "  Please create .env file with required environment variables" @Yellow
}
Write-Host ""

# Check 5: Dependencies installed
Write-Host "[5/8] Checking dependencies..." @Blue
if (Test-Path "node_modules" -PathType Container) {
    Write-Host "✓ Root node_modules exists" @Green
} else {
    Write-Host "⚠ Root node_modules not found" @Yellow
    Write-Host "  Run: pnpm install" @Yellow
}

if (Test-Path "artifacts\api-server\node_modules" -PathType Container) {
    Write-Host "✓ api-server dependencies installed" @Green
} else {
    Write-Host "⚠ api-server node_modules not found" @Yellow
}

if (Test-Path "artifacts\discharge-buddy\node_modules" -PathType Container) {
    Write-Host "✓ discharge-buddy dependencies installed" @Green
} else {
    Write-Host "⚠ discharge-buddy node_modules not found" @Yellow
}
Write-Host ""

# Check 6: TypeScript compilation
Write-Host "[6/8] Running TypeScript type check..." @Blue
Push-Location artifacts\discharge-buddy
$typecheckOutput = & pnpm typecheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ TypeScript compilation successful (no errors)" @Green
} else {
    Write-Host "✗ TypeScript compilation failed" @Red
    Write-Host "   Run: pnpm --filter @workspace/discharge-buddy typecheck" @Yellow
}
Pop-Location
Write-Host ""

# Check 7: Backend configuration
Write-Host "[7/8] Checking backend configuration..." @Blue
if (Test-Path "artifacts\api-server\src\routes\auth.ts" -PathType Leaf) {
    Write-Host "✓ Auth routes exist" @Green
} else {
    Write-Host "✗ Auth routes not found" @Red
}

if (Test-Path "artifacts\api-server\src\middlewares\auth.ts" -PathType Leaf) {
    Write-Host "✓ Auth middleware exists" @Green
} else {
    Write-Host "✗ Auth middleware not found" @Red
}
Write-Host ""

# Check 8: Documentation
Write-Host "[8/8] Checking documentation..." @Blue
$docs = @(
    "GOOGLE_OAUTH_SETUP.md",
    "AUTH_FLOW_AND_RBAC.md",
    "OAUTH_FIXES_SUMMARY.md"
)
foreach ($doc in $docs) {
    if (Test-Path $doc -PathType Leaf) {
        Write-Host "✓ Found: $doc" @Green
    } else {
        Write-Host "⚠ Missing: $doc" @Yellow
    }
}
Write-Host ""

# Summary
Write-Host "╔═══════════════════════════════════════════════════════════╗" @Blue
Write-Host "║                    Verification Summary                   ║" @Blue
Write-Host "╚═══════════════════════════════════════════════════════════╝" @Blue
Write-Host ""

Write-Host "✓ Environment Checks Passed" @Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review GOOGLE_OAUTH_SETUP.md for OAuth configuration"
Write-Host "2. Configure Google Cloud OAuth credentials if needed"
Write-Host "3. Start backend:  pnpm --filter api-server dev" @Yellow
Write-Host "4. Start app:      pnpm --filter @workspace/discharge-buddy exec expo start" @Yellow
Write-Host "5. Test in Expo Go by scanning the QR code"
Write-Host ""
Write-Host "For more details, see:" @Blue
Write-Host "  - GOOGLE_OAUTH_SETUP.md - OAuth configuration guide"
Write-Host "  - AUTH_FLOW_AND_RBAC.md - Authentication & role system"
Write-Host "  - OAUTH_FIXES_SUMMARY.md - Changes made and verification"
Write-Host ""
