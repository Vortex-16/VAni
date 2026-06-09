@echo off
SETLOCAL EnableDelayedExpansion
:: Get script directory path with trailing slash
SET "SCRIPT_DIR=%~dp0"

:: Check if powershell is available
where powershell >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] PowerShell is required but was not found in the PATH.
    pause
    exit /b 1
)

:: Run the powershell script, passing all arguments
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%manage-services.ps1" %*
