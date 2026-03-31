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
set "API_STARTED_BY_SCRIPT="
set "API_PID="

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
		echo PumpApi nao respondeu em ate 30 segundos.
		call :stop_api >nul 2>&1
		exit /b 1
	)
) else (
	echo PumpApi ja esta respondendo em %API_URL%.
)

set "PUMP_API_URL=%API_URL%"
"%NODE_EXE%" "%SCRIPT%" 1>"%NODE_OUT%" 2>"%NODE_ERR%"
set "NODE_EXIT=%ERRORLEVEL%"

if defined API_STARTED_BY_SCRIPT (
	call :stop_api
)

exit /b %NODE_EXIT%

:check_api
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 2; if ($response.status -eq 'ok') { exit 0 } exit 1 } catch { exit 1 }"
exit /b %ERRORLEVEL%

:start_api
for /f %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:ASPNETCORE_URLS='%API_URL%'; $env:Companytec__DllPath='%DLL_PATH%'; $process = Start-Process -FilePath '%API_EXE%' -WorkingDirectory '%API_DIR%' -RedirectStandardOutput '%API_OUT%' -RedirectStandardError '%API_ERR%' -PassThru; $process.Id"') do set "API_PID=%%I"

if not defined API_PID (
	echo Falha ao iniciar PumpApi.
	exit /b 1
)

set "API_STARTED_BY_SCRIPT=1"
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

:stop_api
if defined API_PID (
	taskkill /PID %API_PID% /T /F >nul 2>&1
)
exit /b 0
