@echo off
setlocal

rem Lê IP do .env
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    if /i "%%A"=="IP" set ENV_IP=%%B
)

if "%~1"=="" (
    if "%ENV_IP%"=="" (
        echo Uso: nmap.bat ^<IP^>
        echo Ou defina IP no .env
        pause
        exit /b 1
    )
    set TARGET=%ENV_IP%
) else (
    set TARGET=%~1
)

"%~dp0node-v20.20.1-win-x86\node.exe" "%~dp0nmap.js" %TARGET%
