const path = require("path")
const readline = require("readline")

const DLL_PATH = path.join(__dirname, "companytec.dll")
const ip = "192.168.10.91"
const PORT = 2001
const TOTAL_BICOS = 16

function waitEnter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question("\nPressione ENTER para sair...", () => { rl.close(); resolve() }))
}

async function main() {
  const koffi = require("koffi")
  const lib = koffi.load(DLL_PATH)

  const C_OpenSocket2 = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket = lib.func("int __stdcall C_CloseSocket()")
  const C_readState = lib.func("const char* __stdcall C_readState()")
  const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")
  const C_ReadTotalsCash = lib.func("int __stdcall C_ReadTotalsCash(const char *bico)")
  const C_Visualize = lib.func("const char* __stdcall C_Visualize()")

  // Delphi ShortString: retorno via ponteiro oculto (1o byte = tamanho, resto = dados)
  const GetEncerranteVolume = lib.func("void __stdcall GetEncerranteVolume(uint8_t *result, uint8_t bico)")
  const GetEncerranteValor = lib.func("void __stdcall GetEncerranteValor(uint8_t *result, uint8_t bico)")

  function readShortString(buf) {
    const len = buf[0]
    return buf.slice(1, 1 + len).toString("ascii")
  }

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.log("Falha ao conectar no concentrador")
    await waitEnter()
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  // 1) STATUS DE TODOS OS BICOS
  console.log("=== STATUS DOS BICOS ===")
  const statusRaw = C_readState()
  console.log("Resposta bruta:", statusRaw)
  console.log("")

  // 2) ENCERRANTE VOLUME + VALOR POR BICO
  console.log("=== ENCERRANTE (VOLUME / VALOR) ===")
//   for (let bico = 1; bico <= TOTAL_BICOS; bico++) {
//     const bicoStr = bico.toString().padStart(2, "0")
//     const vol = C_ReadTotalsVolume(bicoStr)
//     const cash = C_ReadTotalsCash(bicoStr)
    
//     let status = ""
//     if (vol === -1 && cash === -1) status = "sem resposta"
//     else if (vol === -2 && cash === -2) status = "NAO CONFIGURADO"
//     else status = `vol=${vol}  valor=${cash}`

//     console.log(`Bico ${bicoStr}: ${status}`)
//   }

  // 3) ENCERRANTE VOLUME (funcao geral - retorna string)
  console.log("\n=== ENCERRANTE VOLUME (GetEncerranteVolume) ===")
  for (let bico = 1; bico <= TOTAL_BICOS; bico++) {
    try {
      const buf = Buffer.alloc(256)
      GetEncerranteVolume(buf, bico)
      const resultado = readShortString(buf)
      console.log(`Bico ${bico.toString().padStart(2, "0")}: ${resultado}`)
    } catch (e) {
      console.log(`Bico ${bico.toString().padStart(2, "0")}: ERRO - ${e.message}`)
    }
  }

  // 3b) ENCERRANTE VALOR (funcao geral - retorna string)
  console.log("\n=== ENCERRANTE VALOR (GetEncerranteValor) ===")
  for (let bico = 1; bico <= TOTAL_BICOS; bico++) {
    try {
      const buf = Buffer.alloc(256)
      GetEncerranteValor(buf, bico)
      const resultado = readShortString(buf)
      console.log(`Bico ${bico.toString().padStart(2, "0")}: ${resultado}`)
    } catch (e) {
      console.log(`Bico ${bico.toString().padStart(2, "0")}: ERRO - ${e.message}`)
    }
  }

  // 4) VISUALIZACAO EM TEMPO REAL
  console.log("\n=== ABASTECIMENTOS EM ANDAMENTO ===")
  const vizRaw = C_Visualize()
  console.log("Resposta bruta:", vizRaw)

  C_CloseSocket()
  console.log("\nConexao encerrada.")
  await waitEnter()
}

main().catch(async (e) => {
  console.log("Erro inesperado:", e.message)
  await waitEnter()
})
