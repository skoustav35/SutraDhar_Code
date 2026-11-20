@echo off
setlocal
cd /d "%~dp0"
set SUTRADHAR_CHANNEL=dev
bun ./scripts/dev.ts %*
