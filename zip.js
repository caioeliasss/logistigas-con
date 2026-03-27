// zip.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const name = process.argv[2];

if (!name) {
  console.log("Passe o nome: npm run zip seven91");
  process.exit(1);
}

const zipName = `logistigas-con-${name}.zip`;
const exclude = ["dados.js", "erro.log", "saida.log", zipName];

// Remove zip antigo se existir
if (fs.existsSync(zipName)) fs.unlinkSync(zipName);

// Usa PowerShell Compress-Archive no Windows
const excludeList = exclude.map(f => `'${f}'`).join(",");
const ps = [
  `$exclude = @(${excludeList})`,
  `$items = Get-ChildItem -Path '.' | Where-Object { $exclude -notcontains $_.Name }`,
  `$items | Compress-Archive -DestinationPath '${zipName}' -Force`
].join("; ");
execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
console.log(`Criado: ${zipName}`);