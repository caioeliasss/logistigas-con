const path = require("path")

console.log("Script iniciado...")
console.log("Diretorio:", __dirname)

const DLL_PATH = path.join(__dirname, "companytec.dll")

const ip = "192.168.10.91"
const PORT = 2001

const POSTO = "6908fdef32603381acec0c07"

const BICOS = {
  "84": { concentrador: "84", tanque: "001", bomba: "BOMBA 01", produto: "GASOLINA C COMUM" },
  "44": { concentrador: "44", tanque: "002", bomba: "BOMBA 01", produto: "GASOLINA C ADITIVADA" },
  "04": { concentrador: "04", tanque: "003", bomba: "BOMBA 01", produto: "ETANOL HIDRATADO COMUM" },
  "85": { concentrador: "85", tanque: "001", bomba: "BOMBA 01", produto: "GASOLINA C COMUM" },
  "45": { concentrador: "45", tanque: "002", bomba: "BOMBA 01", produto: "GASOLINA C ADITIVADA" },
  "05": { concentrador: "05", tanque: "003", bomba: "BOMBA 01", produto: "ETANOL HIDRATADO COMUM" },
  "88": { concentrador: "88", tanque: "001", bomba: "BOMBA 02", produto: "GASOLINA C COMUM" },
  "48": { concentrador: "48", tanque: "002", bomba: "BOMBA 02", produto: "GASOLINA C ADITIVADA" },
  "08": { concentrador: "08", tanque: "003", bomba: "BOMBA 02", produto: "ETANOL HIDRATADO COMUM" },
  "89": { concentrador: "89", tanque: "001", bomba: "BOMBA 02", produto: "GASOLINA C COMUM" },
  "49": { concentrador: "49", tanque: "002", bomba: "BOMBA 02", produto: "GASOLINA C ADITIVADA" },
  "09": { concentrador: "09", tanque: "003", bomba: "BOMBA 02", produto: "ETANOL HIDRATADO COMUM" },
  "0D": { concentrador: "0D", tanque: "005", bomba: "BOMBA 03", produto: "OLEO DIESEL B S500 - COMUM" },
  "0C": { concentrador: "0C", tanque: "004", bomba: "BOMBA 03", produto: "OLEO DIESEL B S10 - COMUM" },
  "10": { concentrador: "10", tanque: "005", bomba: "BOMBA 04", produto: "OLEO DIESEL B S500 - COMUM" },
  "11": { concentrador: "11", tanque: "004", bomba: "BOMBA 04", produto: "OLEO DIESEL B S10 - COMUM" },
}

function log(logs, msg) {
  console.log(msg)
  logs.push(msg)
}

async function enviarLogs(logs) {
  try {
    const sendEncerrante = require("./service/api").sendEncerrante
    await sendEncerrante({
      posto: POSTO,
      dataLeitura: new Date(),
      bicos: {},
      logs: logs.join("\n"),
    })
  } catch (e) {
    console.log("Erro ao enviar logs para API:")
    console.log(e.message)
  }
}

async function main() {
  const logs = []

  let koffi
  try {
    koffi = require("koffi")
  } catch (e) {
    log(logs, "Erro ao carregar modulo koffi:")
    log(logs, e.message)
    process.exit(1)
  }

  let lib
  try {
    lib = koffi.load(DLL_PATH)
  } catch (e) {
    log(logs, `Erro ao carregar DLL: ${DLL_PATH}`)
    log(logs, "Coloque a companytec.dll na mesma pasta do executavel.")
    log(logs, e.message)
    process.exit(1)
  }

  // C_ReadTotalsVolume recebe pchar (null-terminated), nao ShortString
  const C_OpenSocket2      = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket      = lib.func("int __stdcall C_CloseSocket()")
  const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    log(logs, "Falha ao conectar no concentrador")
    await enviarLogs(logs)
    process.exit(1)
  }
  log(logs, `Conectou em ${ip}:${PORT}\n`)

  log(logs, "=== LEITURA DE ENCERRANTES (C_ReadTotalsVolume) ===")
  log(logs, "Bico | Encerrante (volume)")
  log(logs, "-----|--------------------")

  let bicosFalha = []

  let encerrantes = {}

  for (let bico in BICOS) {
    const bicoStr = bico
    const resultado = C_ReadTotalsVolume(bicoStr)

    if (resultado === -1) {
      log(logs, `  ${bicoStr}  | FALHA (-1)`)
      bicosFalha.push(bicoStr)
    } else {
      const tanque = BICOS[bico].tanque
      encerrantes[tanque] = (encerrantes[tanque] || 0) + resultado
      log(logs, `  ${bicoStr}  | ${encerrantes[tanque]}`)
    }
  }

  log(logs, "\nBicos com falha: " + (bicosFalha.length > 0 ? bicosFalha.join(", ") : "Nenhum"))

  try {
    const sendEncerrante = require("./service/api").sendEncerrante

    await sendEncerrante({
      posto: POSTO,
      dataLeitura: new Date(),
      bicos: encerrantes,
      logs: logs.join("\n"),
    })
  }
  catch (e) {
    console.log("Erro ao enviar encerrante para API:")
    console.log(e.message)
  }

  C_CloseSocket()
  log(logs, "\nConexao encerrada.")
}

main().catch((e) => {
  console.log("Erro inesperado:")
  console.log(e.message)
  process.exit(1)
})