@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo Instala Node.js 22 y vuelve a abrir la terminal.
    exit /b 1
)
call npm.cmd ci
if errorlevel 1 exit /b %errorlevel%
echo Abri http://localhost:4200/ cuando termine de iniciar.
call npm.cmd start -- --host 127.0.0.1 --port 4200
exit /b %errorlevel%
