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

async function main() {
  let koffi
  try {
    koffi = require("koffi")
  } catch (e) {
    console.log("Erro ao carregar modulo koffi:")
    console.log(e.message)
    process.exit(1)
  }

  let lib
  try {
    lib = koffi.load(DLL_PATH)
  } catch (e) {
    console.log(`Erro ao carregar DLL: ${DLL_PATH}`)
    console.log("Coloque a companytec.dll na mesma pasta do executavel.")
    console.log(e.message)
    process.exit(1)
  }

  // C_ReadTotalsVolume recebe pchar (null-terminated), nao ShortString
  const C_OpenSocket2      = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket      = lib.func("int __stdcall C_CloseSocket()")
  const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.log("Falha ao conectar no concentrador")
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  console.log("=== LEITURA DE ENCERRANTES (C_ReadTotalsVolume) ===")
  console.log("Bico | Encerrante (volume)")
  console.log("-----|--------------------")

  let bicosFalha = []

  let encerrantes = {}

  for (let bico in BICOS) {
    const bicoStr = bico
    const resultado = C_ReadTotalsVolume(bicoStr)

    if (resultado === -1) {
      console.log(`  ${bicoStr}  | FALHA (-1)`)
      bicosFalha.push(bicoStr)
    } else {
      // BICOS[bico].encerrante = resultado
      const tanque = BICOS[bico].tanque
      encerrantes[tanque] = (encerrantes[tanque] || 0) + resultado
      // console.log(`  ${bicoStr}  | ${encerrantes}`)
    }
  }

  console.log("\nBicos com falha:", bicosFalha.length > 0 ? bicosFalha.join(", ") : "Nenhum")

  try {
    const sendEncerrante = require("./service/api").sendEncerrante

    await sendEncerrante({
      posto: POSTO,
      dataLeitura: new Date(),
      bicos: encerrantes,
    })
  }
  catch (e) {
    console.log("Erro ao enviar encerrante para API:")
    console.log(e.message)
  }

  C_CloseSocket()
  console.log("\nConexao encerrada.")
}

main().catch((e) => {
  console.log("Erro inesperado:")
  console.log(e.message)
  process.exit(1)
})