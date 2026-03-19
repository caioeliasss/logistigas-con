@echo off
echo Iniciando scan...
"%~dp0node-v20.20.1-win-x86\node.exe" "%~dp0scan.js"
if errorlevel 1 (
  echo.
  echo ERRO: O script falhou com codigo %errorlevel%
)
pause
