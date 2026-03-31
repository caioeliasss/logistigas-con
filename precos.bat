@echo off
setlocal

set "ROOT=%~dp0"
set "NODE_EXE=%ROOT%node-v20.20.1-win-x86\node.exe"
set "SCRIPT=%ROOT%precos.js"
set "API_DIR=%ROOT%PumpApi\bin\Release\net8.0\win-x86\publish"
set "API_EXE=%API_DIR%\PumpApi.exe"
set "API_URL=http://127.0.0.1:5137"
set "HEALTH_URL=%API_URL%/api/health"
set "DLL_PATH=%ROOT%companytec.dll"
set "NODE_OUT=%ROOT%saida.log"
set "NODE_ERR=%ROOT%erro.log"
set "API_OUT=%ROOT%pumpapi.log"
set "API_ERR=%ROOT%pumpapi-erro.log"

if not exist "%NODE_EXE%" (
	echo Node nao encontrado em "%NODE_EXE%".
	exit /b 1
)

if not exist "%SCRIPT%" (
	echo Script nao encontrado em "%SCRIPT%".
	exit /b 1
)

if not exist "%DLL_PATH%" (
	echo DLL nao encontrada em "%DLL_PATH%".
	exit /b 1
)

if not exist "%API_EXE%" (
	echo PumpApi.exe nao encontrado. Gere o publish x86 em "PumpApi\\bin\\Release\\net8.0\\win-x86\\publish".
	exit /b 1
)

call :check_api
if errorlevel 1 (
	echo Iniciando PumpApi em %API_URL%...
	call :start_api
	if errorlevel 1 exit /b 1

	call :wait_for_api
	if errorlevel 1 (
		echo PumpApi nao respondeu em ate 60 segundos.
		exit /b 1
	)
) else (
	echo PumpApi ja esta respondendo em %API_URL%.
)

set "PUMP_API_URL=%API_URL%"
"%NODE_EXE%" "%SCRIPT%" 1>"%NODE_OUT%" 2>"%NODE_ERR%"
set "NODE_EXIT=%ERRORLEVEL%"

exit /b %NODE_EXIT%

:check_api
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 2; if ($response.status -eq 'ok') { exit 0 } exit 1 } catch { exit 1 }"
exit /b %ERRORLEVEL%

:start_api
start "PumpApi" /b cmd /c "set ASPNETCORE_URLS=%API_URL%&& set Companytec__DllPath=%DLL_PATH%&& cd /d \"%API_DIR%\" && \"%API_EXE%\" 1>>\"%API_OUT%\" 2>>\"%API_ERR%\""
exit /b 0

:wait_for_api
set /a API_WAIT_COUNT=0
:wait_loop
call :check_api
if not errorlevel 1 exit /b 0

set /a API_WAIT_COUNT+=1
if %API_WAIT_COUNT% GEQ 60 exit /b 1

timeout /t 1 /nobreak >nul
goto :wait_loop
