const path = require("path")
const dotenv = require("dotenv")
const bicos = require("./bicos")

dotenv.config({ path: path.join(__dirname, ".env") })

console.log("Script iniciado...")
console.log("Diretorio:", __dirname)

const DLL_PATH = path.join(__dirname, "companytec.dll")

const ip = process.env.IP
const PORT = 2001

const POSTO = process.env.POSTOID

if (!ip || !POSTO) {
  console.error("IP ou POSTO não configurado no .env")
  process.exit(1)
}

const BICOS = bicos

async function enviarLogs(logs) {
  try {
    const sendEncerrante = require("./service/api").sendEncerrante
    await sendEncerrante({
      posto: POSTO,
      dataLeitura: new Date(),
      bicos: {},
      precos: {},
      logs: logs.join("\n"),
    })
  } catch (e) {
    console.log("Erro ao enviar logs para API:")
    console.log(e.message)
  }
}

function log(logs, msg) {
  console.log(msg)
  logs.push(msg)
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
  const LePPLNivel          = lib.func("double __stdcall LePPLNivel(const char *bico, int nivel)")

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

  let precos = {}

  for (let bico in BICOS) {
    const bicoStr = bico
    const resultado = C_ReadTotalsVolume(bicoStr)
    const resultadoPreco = LePPLNivel(bicoStr, 0)

    if (resultado === -1) {
      log(logs, `  ${bicoStr}  | FALHA (-1)`)
      bicosFalha.push(bicoStr)
    } else {
      const tanque = BICOS[bico].tanque
      encerrantes[tanque] = (encerrantes[tanque] || 0) + resultado
      precos[tanque] = resultadoPreco
      log(logs, `  ${bicoStr}  | ${encerrantes[tanque]} | Preço: ${precos[tanque]}`)
    }
  }

  log(logs, "\nBicos com falha: " + (bicosFalha.length > 0 ? bicosFalha.join(", ") : "Nenhum"))

  try {
    const sendEncerrante = require("./service/api").sendEncerrante

    await sendEncerrante({
      posto: POSTO,
      dataLeitura: new Date(),
      bicos: encerrantes,
      precos: precos,
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