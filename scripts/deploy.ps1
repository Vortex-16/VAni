# VAni - Deployment & Build Orchestrator (PowerShell)
# Automates backend deployment and Expo mobile app APK generation.

$ErrorActionPreference = "Stop"

# ==============================================================================
# Helper Functions
# ==============================================================================

function Write-Header ($text) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Write-Success ($text) {
    Write-Host "[SUCCESS] $text" -ForegroundColor Green
}

function Write-Info ($text) {
    Write-Host "[INFO] $text" -ForegroundColor Blue
}

function Write-WarningMsg ($text) {
    Write-Host "[WARNING] $text" -ForegroundColor Yellow
}

function Write-ErrorMsg ($text) {
    Write-Host "[ERROR] $text" -ForegroundColor Red
}

function Check-Command ($cmd) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-WarningMsg "'$cmd' command was not found in your system PATH. Make sure it is installed."
        return $false
    }
    return $true
}

# ==============================================================================
# Path Setup
# ==============================================================================
$ScriptDir = $PSScriptRoot
if ($null -eq $ScriptDir -or $ScriptDir -eq "") {
    $ScriptDir = Get-Location
}

$WorkspaceRoot = (Resolve-Path "$ScriptDir\..").Path
$ExpoDir = Join-Path $WorkspaceRoot "artifacts\discharge-buddy"
$BackendDir = Join-Path $WorkspaceRoot "artifacts\api-server"

# ==============================================================================
# Action Functions
# ==============================================================================

function Deploy-Backend-CloudRun {
    Write-Header "Deploying Backend to Google Cloud Run"
    
    if (-not (Check-Command "gcloud")) {
        Write-ErrorMsg "Google Cloud CLI (gcloud) is required for this deployment. Please install it first."
        return
    }

    $serviceName = Read-Host "Enter Cloud Run service name [default: discharge-buddy-backend]"
    if ([string]::IsNullOrWhiteSpace($serviceName)) { $serviceName = "discharge-buddy-backend" }

    $region = Read-Host "Enter deployment region [default: asia-south1]"
    if ([string]::IsNullOrWhiteSpace($region)) { $region = "asia-south1" }

    # Cloud Run does NOT read the local .env — env vars must be passed explicitly.
    # Without DATABASE_URL the container throws at startup and Cloud Run reports
    # "failed to start and listen on PORT 8080". We pass scripts/cloudrun.env.yaml.
    $EnvFile = Join-Path $ScriptDir "cloudrun.env.yaml"
    if (-not (Test-Path $EnvFile)) {
        Write-ErrorMsg "Missing env file: $EnvFile"
        Write-WarningMsg "Cloud Run gets NO environment variables without it, so the"
        Write-WarningMsg "container will crash on startup (needs DATABASE_URL, GROQ_API_KEY, etc.)."
        Write-Info "Create it by copying the template:"
        Write-Info "  Copy-Item `"$ScriptDir\cloudrun.env.example.yaml`" `"$EnvFile`""
        Write-Info "then fill in the real values and re-run."
        $cont = Read-Host "Deploy WITHOUT env vars anyway? (will almost certainly fail) (y/n)"
        if ($cont.ToLower() -ne 'y') { Write-Info "Aborted."; return }
        $EnvFile = $null
    }

    Write-Info "Initiating Cloud Run deployment from source..."

    Set-Location $WorkspaceRoot
    try {
        # --timeout extends the startup window; the env file supplies the runtime config.
        if ($EnvFile) {
            Write-Info "Command: gcloud run deploy $serviceName --source . --region $region --allow-unauthenticated --env-vars-file `"$EnvFile`""
            gcloud run deploy $serviceName --source . --region $region --allow-unauthenticated --env-vars-file "$EnvFile"
        } else {
            Write-Info "Command: gcloud run deploy $serviceName --source . --region $region --allow-unauthenticated"
            gcloud run deploy $serviceName --source . --region $region --allow-unauthenticated
        }
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Cloud Run deployment failed (gcloud exit code $LASTEXITCODE). Check the build/revision logs URL above."
            return
        }
        Write-Success "Backend successfully deployed to Google Cloud Run!"
    } catch {
        Write-ErrorMsg "Cloud Run deployment failed: $($_.Exception.Message)"
    }
}

function Deploy-Backend-Render {
    Write-Header "Deploying Backend to Render"
    Write-Info "Render deploys automatically when you push code to GitHub based on 'render.yaml'."
    
    $confirm = Read-Host "Would you like to push current changes to origin main? (y/n)"
    if ($confirm.ToLower() -eq 'y') {
        if (-not (Check-Command "git")) {
            Write-ErrorMsg "Git CLI not found."
            return
        }
        
        Set-Location $WorkspaceRoot
        try {
            Write-Info "Running: git push origin main"
            git push origin main
            Write-Success "Pushed to GitHub. Check Render Dashboard for build logs!"
        } catch {
            Write-ErrorMsg "Git push failed: $($_.Exception.Message)"
        }
    } else {
        Write-Info "Skipping Git push."
    }
}

function Deploy-Backend-DockerLocal {
    Write-Header "Building Local Backend Docker Image"
    
    if (-not (Check-Command "docker")) {
        Write-ErrorMsg "Docker is required for this action."
        return
    }

    $tag = Read-Host "Enter image tag [default: discharge-buddy-backend:latest]"
    if ([string]::IsNullOrWhiteSpace($tag)) { $tag = "discharge-buddy-backend:latest" }

    Write-Info "Building docker image..."
    Set-Location $WorkspaceRoot
    try {
        docker build -t $tag .
        Write-Success "Local Docker image '$tag' built successfully!"
        Write-Info "You can run it locally using: docker run -p 3000:3000 $tag"
    } catch {
        Write-ErrorMsg "Docker build failed: $($_.Exception.Message)"
    }
}

function Build-Expo-Apk ($profile) {
    Write-Header "Building Expo Mobile App APK ($profile Profile)"
    
    if (-not (Check-Command "eas")) {
        Write-ErrorMsg "Expo Application Services CLI (eas) is required. Install it using: npm install -g eas-cli"
        return
    }

    Write-Info "Navigating to mobile app folder: $ExpoDir"
    Set-Location $ExpoDir

    try {
        Write-Info "Running: eas build --platform android --profile $profile"
        eas build --platform android --profile $profile
        Write-Success "EAS build command completed."
    } catch {
        Write-ErrorMsg "Expo build failed: $($_.Exception.Message)"
    }
}

function Build-Expo-Apk-Local {
    Write-Header "Building Expo Mobile App APK Locally"
    
    if (-not (Check-Command "eas")) {
        Write-ErrorMsg "EAS CLI is required."
        return
    }
    
    Write-Info "Navigating to mobile app folder: $ExpoDir"
    Set-Location $ExpoDir

    try {
        Write-Info "Running local build: eas build --platform android --local --profile preview"
        eas build --platform android --local --profile preview
        Write-Success "Local EAS build completed."
    } catch {
        Write-ErrorMsg "Local Expo build failed: $($_.Exception.Message)"
    }
}

# ==============================================================================
# Menu Orchestrator
# ==============================================================================

function Show-Menu {
    Clear-Host
    Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|             VAni - Deployment Suite            |" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  --- Backend Deploy Options ---" -ForegroundColor White
    Write-Host "  1. Deploy Backend to Google Cloud Run (Source Deploy)" -ForegroundColor White
    Write-Host "  2. Deploy Backend to Render (Push main to GitHub)" -ForegroundColor White
    Write-Host "  3. Build Local Backend Docker Image" -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Expo Android APK Build Options ---" -ForegroundColor White
    Write-Host "  4. Build Android APK - EAS Preview Profile (Cloud)" -ForegroundColor White
    Write-Host "  5. Build Android APK - EAS Development Profile (Cloud)" -ForegroundColor White
    Write-Host "  6. Build Android APK - EAS Local Build (Uses local SDK/Gradle)" -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Bulk Actions ---" -ForegroundColor White
    Write-Host "  7. Full Deploy (Backend Cloud Run + Expo EAS Preview APK)" -ForegroundColor White
    Write-Host ""
    Write-Host "  8. Exit" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Select an option [1-8]"
    
    switch ($choice) {
        "1" {
            Deploy-Backend-CloudRun
        }
        "2" {
            Deploy-Backend-Render
        }
        "3" {
            Deploy-Backend-DockerLocal
        }
        "4" {
            Build-Expo-Apk "preview"
        }
        "5" {
            Build-Expo-Apk "development"
        }
        "6" {
            Build-Expo-Apk-Local
        }
        "7" {
            Deploy-Backend-CloudRun
            Build-Expo-Apk "preview"
        }
        "8" {
            Write-Host "Exiting Deployment Suite. Goodbye!" -ForegroundColor Gray
            exit 0
        }
        Default {
            Read-Host "Invalid option. Press Enter to return to menu"
            Show-Menu
        }
    }
    
    Write-Host ""
    Read-Host "Action finished. Press Enter to return to the menu"
    Show-Menu
}

# Run the menu
try {
    Show-Menu
}
finally {
    # Ensure we return to scripts folder when done
    if ($ScriptDir) {
        Set-Location $ScriptDir
    }
}
