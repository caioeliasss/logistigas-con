@echo off
echo Iniciando scan...
echo.
"%~dp0node-v20.20.1-win-x86\node.exe" "%~dp0scan.js" 2>"%~dp0erro.log"
if errorlevel 1 (
  echo.
  echo ERRO: O script falhou. Verifique o arquivo erro.log
  echo.
  type "%~dp0erro.log"
)
echo.
pause
