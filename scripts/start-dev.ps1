# VAni - Developer Services Starter (PowerShell)
# Automates port cleanup (3000, 8001, 8100, 8081) and launches all three local services.

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

# ==============================================================================
# Main Execution Wrapper (Prevents instant window closing on any crash)
# ==============================================================================
try {
    # ==============================================================================
    # Path Setup
    # ==============================================================================
    $ScriptDir = $PSScriptRoot
    if ($null -eq $ScriptDir -or $ScriptDir -eq "") {
        $ScriptDir = Get-Location
    }

    $WorkspaceRoot = (Resolve-Path "$ScriptDir\..").Path
    $OcrDir = Join-Path $WorkspaceRoot "artifacts\ocr-service"
    $ExpoDir = Join-Path $WorkspaceRoot "artifacts\discharge-buddy"
    $BackendDir = Join-Path $WorkspaceRoot "artifacts\api-server"

    # Ports to target (Backend, OCR/fastapi, Expo Metro)
    $PortsToKill = @(3000, 8001, 8100, 8081)

    # ==============================================================================
    # Select Expo Target Platform
    # ==============================================================================
    Write-Host "Select Expo Target Platform:" -ForegroundColor Cyan
    Write-Host "  [1] Mobile (Expo Go / Emulator) - Displays QR code to scan on your phone [Default]" -ForegroundColor White
    Write-Host "  [2] Web (Local Web Browser)     - Runs Expo web compiler" -ForegroundColor White
    $expoChoice = Read-Host "Choose option [1 or 2]"
    if ([string]::IsNullOrWhiteSpace($expoChoice)) { $expoChoice = "1" }

    if ($expoChoice -eq "2") {
        $expoTarget = "Web"
        $expoCmd = "pnpm --filter VAni run dev"
    } else {
        $expoTarget = "Mobile"
        $expoCmd = "pnpm --filter VAni exec expo start -c"
    }

    # ==============================================================================
    # Step 1: Port Cleanup
    # ==============================================================================
    Write-Header "Step 1: Cleaning up active ports ($($PortsToKill -join ', '))..."

    $anyKilled = $false
    foreach ($port in $PortsToKill) {
        Write-Host "Checking port $port..." -NoNewline
        
        $pids = @()
        
        # Method 1: Try using Get-NetTCPConnection (PowerShell Native)
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($connections) {
                $pids += $connections | Select-Object -ExpandProperty OwningProcess
            }
        } catch {
            # Ignore errors here, we fall back to netstat
        }
        
        # Method 2: Fallback to netstat -ano (Available on all Windows systems, doesn't require admin)
        if ($pids.Count -eq 0) {
            try {
                $netstatLines = netstat -ano | Select-String "LISTENING" | Select-String ":$port\b"
                foreach ($line in $netstatLines) {
                    if ($line.Line -match '\s+(\d+)$') {
                        $pids += [int]$Matches[1]
                    }
                }
            } catch {
                # Ignore netstat failures
            }
        }
        
        # Deduplicate PIDs
        $pids = $pids | Select-Object -Unique
        
        if ($pids.Count -gt 0) {
            Write-Host " Active!" -ForegroundColor Yellow
            foreach ($targetPid in $pids) {
                try {
                    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "  Killing process '$($proc.Name)' (PID: $($targetPid)) on port $port..." -ForegroundColor Gray
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
        Write-Info "No active processes found on ports 3000, 8001, 8100, or 8081."
    }

    # ==============================================================================
    # Step 2: Start Services in Separate Terminals
    # ==============================================================================
    Write-Header "Step 2: Starting Services..."

    # 1. Start Backend API Server
    Write-Host "Launching Backend API Server (Port 3000) in a new window..." -ForegroundColor Blue
    $backendCmd = "pnpm --filter @workspace/api-server run dev"
    $backendArgs = '/k title Backend API Server (Port 3000) && cd /d "{0}" && {1}' -f $WorkspaceRoot, $backendCmd
    Start-Process cmd -ArgumentList $backendArgs
    Write-Success "Backend API Server launch command sent."

    # 2. Start OCR Service
    Write-Host "Launching OCR Service (Port 8100) in a new window..." -ForegroundColor Blue
    if (Test-Path (Join-Path $OcrDir "venv\Scripts\python.exe")) {
        $ocrCmd = "venv\Scripts\python.exe main.py"
        $ocrArgs = '/k title OCR and Report Service (Port 8100) && cd /d "{0}" && {1}' -f $OcrDir, $ocrCmd
        Start-Process cmd -ArgumentList $ocrArgs
        Write-Success "OCR Service launch command sent (using venv)."
    } else {
        Write-WarningMsg "OCR virtual environment (venv) not found at '$OcrDir\venv'. Trying system python..."
        $ocrCmd = "python main.py"
        $ocrArgs = '/k title OCR and Report Service (Port 8100) && cd /d "{0}" && {1}' -f $OcrDir, $ocrCmd
        Start-Process cmd -ArgumentList $ocrArgs
        Write-Success "OCR Service launch command sent (using system python)."
    }

    # 3. Start Expo Mobile App
    Write-Host "Launching Expo Dev Server in $expoTarget mode (Port 8081) in a new window..." -ForegroundColor Blue
    $expoArgs = '/k title Expo Metro Bundler ({0} mode) && cd /d "{1}" && {2}' -f $expoTarget, $WorkspaceRoot, $expoCmd
    Start-Process cmd -ArgumentList $expoArgs
    Write-Success "Expo Metro Bundler launch command sent."

    Write-Host ""
    Write-Host "All service startup windows spawned successfully!" -ForegroundColor Green
    Write-Host "You can monitor the service logs in their respective terminal windows." -ForegroundColor Gray

    if ($expoTarget -eq "Mobile") {
        Write-Host ""
        Write-Host "--------------------------------------------------" -ForegroundColor Yellow
        Write-Host "HOW TO CHECK ON MOBILE:" -ForegroundColor Yellow
        Write-Host "1. Scan the QR code displayed in the Expo window." -ForegroundColor White
        Write-Host "   - Android: Use the Expo Go app." -ForegroundColor White
        Write-Host "   - iOS: Use the built-in Camera app." -ForegroundColor White
        Write-Host "2. Make sure your phone and PC are connected to the SAME Wi-Fi network." -ForegroundColor White
        Write-Host "3. Alternatively, press 'a' in the Expo window to run on Android Emulator" -ForegroundColor White
        Write-Host "   or press 'i' to run on iOS Simulator." -ForegroundColor White
        Write-Host "--------------------------------------------------" -ForegroundColor Yellow
    }

    Write-Host ""
    Read-Host "Press Enter to exit"
}
catch {
    Write-ErrorMsg "An unexpected error occurred during execution:"
    Write-ErrorMsg $_.Exception.Message
    Write-ErrorMsg $_.ScriptStackTrace
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
