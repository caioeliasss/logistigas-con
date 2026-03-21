@echo off
echo Criando tarefa agendada para leitura de encerrantes as 00:01...
echo.

> "%~dp0tarefa.xml" (
  echo ^<?xml version="1.0" encoding="UTF-16"?^>
  echo ^<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
  echo   ^<Settings^>
  echo     ^<StartWhenAvailable^>true^</StartWhenAvailable^>
  echo     ^<ExecutionTimeLimit^>PT2M^</ExecutionTimeLimit^>
  echo     ^<Enabled^>true^</Enabled^>
  echo     ^<AllowStartOnDemand^>true^</AllowStartOnDemand^>
  echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^>
  echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^>
  echo     ^<Hidden^>true^</Hidden^>
  echo   ^</Settings^>
  echo   ^<Triggers^>
  echo     ^<CalendarTrigger^>
  echo       ^<StartBoundary^>2026-01-01T00:01:00^</StartBoundary^>
  echo       ^<ScheduleByDay^>
  echo         ^<DaysInterval^>1^</DaysInterval^>
  echo       ^</ScheduleByDay^>
  echo     ^</CalendarTrigger^>
  echo   ^</Triggers^>
  echo   ^<Actions^>
  echo     ^<Exec^>
  echo       ^<Command^>"%~dp0scan.bat"^</Command^>
  echo       ^<WorkingDirectory^>%~dp0^</WorkingDirectory^>
  echo     ^</Exec^>
  echo   ^</Actions^>
  echo ^</Task^>
)

schtasks /create /tn "LogistigasEncerrante" /xml "%~dp0tarefa.xml" /f

if errorlevel 1 (
  echo.
  echo ERRO: Falha ao criar a tarefa. Execute este arquivo como Administrador.
) else (
  echo.
  echo Tarefa agendada criada com sucesso!
  echo - Executa todos os dias as 00:01
  echo - Se o PC estiver desligado, executa ao ligar
  echo - Timeout de 2 minutos
  echo - Roda em segundo plano
)

del "%~dp0tarefa.xml" 2>nul
echo.
pause
