const path = require("path")
const readline = require("readline")

console.log("Script iniciado...")
console.log("Diretorio:", __dirname)

const DLL_PATH = path.join(__dirname, "companytec.dll")

const ip = "192.168.10.91"
const PORT = 2001
const TOTAL_BICOS = 16

function waitEnter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question("\nPressione ENTER para sair...", () => { rl.close(); resolve() }))
}

// Checksum Companytec: soma ASCII de tudo apos o '>' (inclusive o '?'), mod 256
function buildCmd(data) {
  const size = data.length.toString(16).toUpperCase().padStart(4, "0")
  const body = `?${size}${data}`
  const sum = [...body].reduce((acc, c) => acc + c.charCodeAt(0), 0) & 0xFF
  const ks = sum.toString(16).toUpperCase().padStart(2, "0")
  return `>${body}${ks}`
}

// Delphi ShortString: 1 byte tamanho + bytes de dados
function toShortString(s) {
  const buf = Buffer.alloc(256)
  buf[0] = s.length
  buf.write(s, 1, "ascii")
  return buf
}

function fromShortString(buf) {
  const len = buf[0]
  return buf.slice(1, 1 + len).toString("ascii")
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

  const C_OpenSocket2     = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket     = lib.func("int __stdcall C_CloseSocket()")
  const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")
  // ShortString: retorno via ponteiro oculto, input tambem ShortString
  const C_SendReceiveText = lib.func("void __stdcall C_SendReceiveText(uint8_t *result, uint8_t *cmd)")

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.log("Falha ao conectar no concentrador")
    await waitEnter()
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  console.log("=== COMPARACAO: DLL vs RAW (volume, tipo 01) ===")
  console.log("Bico | DLL resultado | RAW comando              | RAW resposta")
  console.log("-----|---------------|--------------------------|-------------------------------")

  let bicoNotWorking = []

  for (let bico = 1; bico <= TOTAL_BICOS; bico++) {
    const bicoStr = bico.toString().padStart(2, "0")

    // Chamada via DLL
    const dllResult = C_ReadTotalsVolume(bicoStr)

    // Chamada via protocolo bruto: indice 05, bico BB, tipo 01 (litros)
    const rawCmd = buildCmd(`05${bicoStr}01`)
    let rawResp = ""
    try {
      const resultBuf = Buffer.alloc(256)
      const cmdBuf = toShortString(rawCmd)
      C_SendReceiveText(resultBuf, cmdBuf)
      rawResp = fromShortString(resultBuf)
    } catch (e) {
      rawResp = `ERRO: ${e.message}`
    }

    const dllLabel = dllResult >= 0 ? String(dllResult).padEnd(13) :
                     dllResult === -1 ? "-1 (sem resp)".padEnd(13) :
                     dllResult === -2 ? "-2 (inativo?) ".padEnd(13) :
                     String(dllResult).padEnd(13)

    console.log(`  ${bicoStr}  | ${dllLabel} | ${rawCmd.padEnd(24)} | ${rawResp}`)

    if (dllResult === -2) bicoNotWorking.push(bicoStr)
  }

  console.log("\nBicos com DLL=-2:", bicoNotWorking.length > 0 ? bicoNotWorking.join(", ") : "Nenhum")

  C_CloseSocket()
  console.log("\nConexao encerrada.")
  await waitEnter()
}

main().catch(async (e) => {
  console.log("Erro inesperado:")
  console.log(e.message)
  await waitEnter()
})