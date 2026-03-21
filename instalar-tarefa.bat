@echo off
echo Criando tarefa agendada para leitura de encerrantes as 00:01...
echo.
schtasks /create /tn "LogistigasEncerrante" /tr "\"%~dp0scan.bat\"" /sc daily /st 00:01 /f
echo.
if errorlevel 1 (
  echo ERRO: Falha ao criar a tarefa. Execute este arquivo como Administrador.
) else (
  echo Tarefa agendada criada com sucesso!
  echo O script sera executado todos os dias as 00:01.
)
echo.
pause
