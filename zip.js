// zip.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const name = process.argv[2];
const rootDir = __dirname;
const publishDir = path.join(rootDir, "PumpApi", "bin", "Release", "net8.0", "win-x86", "publish");
const publishExe = path.join(publishDir, "PumpApi.exe");

if (!name) {
  console.log("Passe o nome: npm run zip seven91");
  process.exit(1);
}

const zipName = `logistigas-con-${name}.zip`;
const exclude = ["dados.js", "erro.log", "saida.log", "pumpapi.log", "pumpapi-erro.log", ".env", "bicos.js", zipName];

// Remove zip antigo se existir
if (fs.existsSync(zipName)) fs.unlinkSync(zipName);

function toPsSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

function stopPumpApiIfRunning() {
  if (!fs.existsSync(publishExe)) return;

  const exePath = path.resolve(publishExe);
  const ps = [
    "$ErrorActionPreference = 'Stop'",
    `$target = '${toPsSingleQuoted(exePath)}'`,
    "$running = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'PumpApi.exe' -and $_.ExecutablePath -and ([System.IO.Path]::GetFullPath($_.ExecutablePath) -eq $target) }",
    "if ($running) {",
    "  $running | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }",
    "  Start-Sleep -Milliseconds 500",
    "}"
  ].join('; ');

  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command \"${ps}\"`, { stdio: "inherit" });
}

stopPumpApiIfRunning();

// Usa PowerShell Compress-Archive no Windows
const excludeList = exclude.map(f => `'${toPsSingleQuoted(f)}'`).join(",");
const ps = [
  `$ErrorActionPreference = 'Stop'`,
  `$exclude = @(${excludeList})`,
  `$items = Get-ChildItem -Path '.' | Where-Object { $exclude -notcontains $_.Name }`,
  `$items | Compress-Archive -DestinationPath '${zipName}' -Force`
].join("; ");
execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
console.log(`Criado: ${zipName}`);