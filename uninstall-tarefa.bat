@echo off
echo Removendo tarefa agendada de leitura de encerrantes...
echo.

schtasks /delete /tn "LogistigasEncerrante" /f

if errorlevel 1 (
  echo.
  echo ERRO: Falha ao remover a tarefa ou ela nao existe.
  echo Execute este arquivo como Administrador, se necessario.
) else (
  echo.
  echo Tarefa agendada removida com sucesso!
)

echo.
pause
