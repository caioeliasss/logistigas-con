const path = require("path")
const readline = require("readline")

console.log("Script iniciado...")
console.log("Diretorio:", __dirname)

// Resolve o caminho da DLL relativo ao exe/script
const DLL_PATH = path.join(__dirname, "companytec.dll")

const ip = "192.168.10.91"
const PORT = 2001
const TOTAL_BICOS = 16 // ajuste para a quantidade de bicos do seu posto

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

  const C_OpenSocket2 = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket = lib.func("int __stdcall C_CloseSocket()")
  const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.log("Falha ao conectar no concentrador")
    await waitEnter()
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  console.log("=== ENCERRANTE (VOLUME) ===")
  for (let bico = 1; bico <= TOTAL_BICOS; bico++) {
    const bicoStr = bico.toString().padStart(2, "0")
    const resultado = C_ReadTotalsVolume(bicoStr)
    if (resultado !== -1) {
      console.log(`Bico ${bicoStr}: ${resultado}`)
    } else {
      console.log(`Bico ${bicoStr}: sem resposta`)
    }
  }

  C_CloseSocket()
  console.log("\nConexao encerrada.")
  await waitEnter()
}

main().catch(async (e) => {
  console.log("Erro inesperado:")
  console.log(e.message)
  await waitEnter()
})