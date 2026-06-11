@echo off
SETLOCAL EnableDelayedExpansion
SET "SCRIPT_DIR=%~dp0"

where powershell >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] PowerShell is required but was not found in the PATH.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%deploy.ps1"
