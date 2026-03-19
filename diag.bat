@echo off
echo === DIAGNOSTICO ===
echo.

echo 1. Testando node.exe...
"%~dp0node-v20.20.1-win-x86\node.exe" -e "console.log('Node OK - arch:', process.arch, '- version:', process.version)" 2>&1
if errorlevel 1 (
  echo FALHOU: node.exe nao conseguiu executar.
  echo Provavelmente falta o Visual C++ Redistributable.
  echo Baixe em: https://aka.ms/vs/17/release/vc_redist.x86.exe
  echo.
  pause
  exit /b
)

echo.
echo 2. Testando modulo koffi...
"%~dp0node-v20.20.1-win-x86\node.exe" -e "try { require('koffi'); console.log('Koffi OK'); } catch(e) { console.log('FALHOU:', e.message); }" 2>&1

echo.
echo 3. Testando DLL companytec...
"%~dp0node-v20.20.1-win-x86\node.exe" -e "const k=require('koffi'); try { k.load('%~dp0companytec.dll'); console.log('DLL OK'); } catch(e) { console.log('FALHOU:', e.message); }" 2>&1

echo.
echo 4. Testando conexao com concentrador...
"%~dp0node-v20.20.1-win-x86\node.exe" -e "const net=require('net'); const s=net.connect(2001,'192.168.10.91',()=>{console.log('Conexao TCP OK');s.destroy();process.exit(0)}); s.on('error',(e)=>{console.log('FALHOU:',e.message);process.exit(1)}); s.setTimeout(5000,()=>{console.log('FALHOU: timeout');s.destroy();process.exit(1)})" 2>&1

echo.
echo === FIM DO DIAGNOSTICO ===
echo.
pause
