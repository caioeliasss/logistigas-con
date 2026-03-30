// nmap.js
const { execSync } = require("child_process");
const path = require("path");

const ip = process.argv[2];
const nmapExe = path.join(__dirname, "nmap-7.92", "nmap.exe");

if (!ip) {
  console.log("Passe o IP: npm run nmap -- <IP>");
  process.exit(1);
}

try {
  const result = execSync(`"${nmapExe}" -sn ${ip}`).toString();
  console.log(result);
} catch (error) {
  console.error("Erro ao executar nmap:", error.message);
}