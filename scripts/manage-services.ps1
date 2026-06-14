# VAni - Services Management Script (PowerShell)
# Automates killing active ports, updating/building, and starting Backend, OCR, and Expo services.

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "build", "update", "restart", "menu")]
    [string]$Action = "menu"
)

$ErrorActionPreference = "Stop"

# ==============================================================================
# Helper Functions (Defined first for clean error handling)
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

# Function to kill processes on specified ports
function Kill-Ports {
    Write-Header "Killing Ongoing Ports..."
    
    $anyKilled = $false
    foreach ($service in $Ports.Keys) {
        $port = $Ports[$service]
        Write-Host "Checking port $port [$service]..." -NoNewline
        
        # Use Get-NetTCPConnection to find owning process
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host " Active!" -ForegroundColor Yellow
            $pids = $connections | Select-Object -ExpandProperty OwningProcess | Unique
            foreach ($targetPid in $pids) {
                try {
                    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "  Killing process '$($proc.Name)' (PID: $($targetPid))..." -ForegroundColor Gray
                        Stop-Process -Id $targetPid -Force -ErrorAction Stop
                        $anyKilled = $true
                    }
                }
                catch {
                    Write-ErrorMsg "  Failed to kill PID $($targetPid): $($_.Exception.Message)"
                }
            }
        } else {
            Write-Host " Free" -ForegroundColor Green
        }
    }
    
    if ($anyKilled) {
        Write-Success "All target ports have been cleaned and freed."
    } else {
        Write-Info "No active processes found on ports 3000, 8100, or 8081."
    }
}

# Function to update and build services
function Update-Build-Services {
    Write-Header "Updating Dependencies and Building Services..."
    
    # 1. Update project workspace dependencies
    Write-Host "Running 'pnpm install' in workspace root..." -ForegroundColor Blue
    Set-Location $WorkspaceRoot
    try {
        pnpm install
        Write-Success "Dependencies installed successfully."
    } catch {
        Write-ErrorMsg "Failed to install dependencies: $($_.Exception.Message)"
        return
    }

    # 2. Build backend (api-server)
    Write-Host ""
    Write-Host "Building Backend API Server..." -ForegroundColor Blue
    try {
        pnpm --filter @workspace/api-server run build
        Write-Success "Backend build completed."
    } catch {
        Write-ErrorMsg "Backend build failed: $($_.Exception.Message)"
        return
    }

    # 3. Build Expo app to static-build (for local serve / production build)
    Write-Host ""
    Write-Host "Building Expo App static assets..." -ForegroundColor Blue
    try {
        pnpm --filter VAni run build
        Write-Success "Expo app build completed successfully."
    } catch {
        Write-ErrorMsg "Expo app build failed: $($_.Exception.Message)"
        return
    }
    
    Write-Success "All updates and builds completed successfully!"
}

# Function to start all services fresh
function Start-Services {
    # 1. Stop any existing processes on these ports first
    Kill-Ports
    
    Write-Header "Starting Fresh Services..."

    # Check for .env file
    if (-not (Test-Path (Join-Path $WorkspaceRoot ".env"))) {
        Write-WarningMsg "No .env file found in workspace root. Some services may fail to start correctly."
    }

    # 2. Start Backend API Server
    Write-Host "Launching Backend API Server in a new window..." -ForegroundColor Blue
    $backendCmd = "pnpm --filter @workspace/api-server run dev"
    $backendArgs = '/k title Backend API Server (Port 3000) && cd /d "{0}" && {1}' -f $WorkspaceRoot, $backendCmd
    Start-Process cmd -ArgumentList $backendArgs
    Write-Success "Backend API Server launch command sent (Port 3000)."

    # 3. Start OCR Service
    Write-Host "Launching OCR Service in a new window..." -ForegroundColor Blue
    if (Test-Path (Join-Path $OcrDir "venv\Scripts\python.exe")) {
        $ocrCmd = "venv\Scripts\python.exe main.py"
        $ocrArgs = '/k title OCR and Report Service (Port 8100) && cd /d "{0}" && {1}' -f $OcrDir, $ocrCmd
        Start-Process cmd -ArgumentList $ocrArgs
        Write-Success "OCR Service launch command sent (Port 8100)."
    } else {
        Write-WarningMsg "OCR virtual environment (venv) not found at '$OcrDir\venv'. Trying system python..."
        $ocrCmd = "python main.py"
        $ocrArgs = '/k title OCR and Report Service (Port 8100) && cd /d "{0}" && {1}' -f $OcrDir, $ocrCmd
        Start-Process cmd -ArgumentList $ocrArgs
        Write-Success "OCR Service launch command sent using system python (Port 8100)."
    }

    # 4. Start Expo Mobile App
    Write-Host "Launching Expo Dev Server in a new window..." -ForegroundColor Blue
    $expoCmd = "pnpm --filter VAni run dev"
    $expoArgs = '/k title Expo Metro Bundler (Port 8081) && cd /d "{0}" && {1}' -f $WorkspaceRoot, $expoCmd
    Start-Process cmd -ArgumentList $expoArgs
    Write-Success "Expo Metro Bundler launch command sent (Port 8081)."

    Write-Host ""
    Write-Host "All service startup windows spawned successfully!" -ForegroundColor Green
    Write-Host "You can monitor logs in each respective window." -ForegroundColor Gray
}

# Show interactive menu
function Show-Menu {
    Clear-Host
    Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|             VAni - Service Manager             |" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Start All Services (Fresh Launch - Port cleanup + Dev start)" -ForegroundColor White
    Write-Host "  2. Stop/Kill All Services (Kill ports 3000, 8100, 8081)" -ForegroundColor White
    Write-Host "  3. Update Backend & Build Expo App (Install deps + Build projects)" -ForegroundColor White
    Write-Host "  4. Full Cycle (Kill -> Update -> Build -> Start Fresh)" -ForegroundColor White
    Write-Host "  5. Exit" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Select an option [1-5]"
    
    switch ($choice) {
        "1" {
            Start-Services
        }
        "2" {
            Kill-Ports
        }
        "3" {
            Update-Build-Services
        }
        "4" {
            Kill-Ports
            Update-Build-Services
            Start-Services
        }
        "5" {
            Write-Host "Exiting Service Manager. Goodbye!" -ForegroundColor Gray
            exit 0
        }
        Default {
            Read-Host "Invalid option. Press Enter to return to menu"
            Show-Menu
        }
    }
}

# ==============================================================================
# Main Execution Logic
# ==============================================================================
try {
    # Setup Paths
    $ScriptDir = $PSScriptRoot
    if ($null -eq $ScriptDir -or $ScriptDir -eq "") {
        $ScriptDir = Get-Location
    }
    
    $WorkspaceRoot = (Resolve-Path "$ScriptDir\..").Path
    $OcrDir = Join-Path $WorkspaceRoot "artifacts\ocr-service"
    $ExpoDir = Join-Path $WorkspaceRoot "artifacts\discharge-buddy"
    $BackendDir = Join-Path $WorkspaceRoot "artifacts\api-server"

    # Ports used by services
    $Ports = [ordered]@{
        "Backend" = 3000
        "OCR"     = 8100
        "Expo"    = 8081
    }

    # Action routing
    switch ($Action.ToLower()) {
        "start" {
            Start-Services
        }
        "stop" {
            Kill-Ports
        }
        "build" {
            Update-Build-Services
        }
        "update" {
            Update-Build-Services
        }
        "restart" {
            Start-Services
        }
        "menu" {
            Show-Menu
        }
        Default {
            Show-Menu
        }
    }
}
catch {
    # Fallback writing if custom functions are not available
    if (Get-Command -Name Write-ErrorMsg -ErrorAction SilentlyContinue) {
        Write-ErrorMsg "An unexpected error occurred: $($_.Exception.Message)"
    } else {
        Write-Host "[ERROR] An unexpected error occurred: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}
finally {
    # Return to original path if we moved
    if ($ScriptDir) {
        Set-Location $ScriptDir
    }
}
