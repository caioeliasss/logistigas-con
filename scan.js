const path = require("path")
const readline = require("readline")

console.log("Script iniciado...")
console.log("Diretorio:", __dirname)

const DLL_PATH = path.join(__dirname, "companytec.dll")

const ip = "192.168.10.91"
const PORT = 2001

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

function waitEnter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question("\nPressione ENTER para sair...", () => { rl.close(); resolve() }))
}

async function main() {
  let koffi
  try {
    koffi = require("koffi")
  } catch (e) {
    console.log("Erro ao carregar modulo koffi:")
    console.log(e.message)
    await waitEnter()
    process.exit(1)
  }

  let lib
  try {
    lib = koffi.load(DLL_PATH)
  } catch (e) {
    console.log(`Erro ao carregar DLL: ${DLL_PATH}`)
    console.log("Coloque a companytec.dll na mesma pasta do executavel.")
    console.log(e.message)
    await waitEnter()
    process.exit(1)
  }

  // C_ReadTotalsVolume recebe pchar (null-terminated), nao ShortString
  const C_OpenSocket2      = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket      = lib.func("int __stdcall C_CloseSocket()")
  const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.log("Falha ao conectar no concentrador")
    await waitEnter()
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  console.log("=== LEITURA DE ENCERRANTES (C_ReadTotalsVolume) ===")
  console.log("Bico | Encerrante (volume)")
  console.log("-----|--------------------")

  let bicosFalha = []

  for (let bico in BICOS) {
    const bicoStr = bico
    const resultado = C_ReadTotalsVolume(bicoStr)

    if (resultado === -1) {
      console.log(`  ${bicoStr}  | FALHA (-1)`)
      bicosFalha.push(bicoStr)
    } else {
      console.log(`  ${bicoStr}  | ${resultado}`)
    }
  }

  console.log("\nBicos com falha:", bicosFalha.length > 0 ? bicosFalha.join(", ") : "Nenhum")

  C_CloseSocket()
  console.log("\nConexao encerrada.")
  await waitEnter()
}

main().catch(async (e) => {
  console.log("Erro inesperado:")
  console.log(e.message)
  await waitEnter()
})