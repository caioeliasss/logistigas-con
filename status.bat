@echo off
echo === Diagnostico de Bicos ===
echo.
"%~dp0node-v20.20.1-win-x86\node.exe" "%~dp0status.js" 2>"%~dp0erro-status.log"
if errorlevel 1 (
  echo.
  echo ERRO: Verifique erro-status.log
  type "%~dp0erro-status.log"
)
echo.
pause
