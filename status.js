const path = require("path")
const readline = require("readline")

const DLL_PATH = path.join(__dirname, "companytec.dll")
const ip = "192.168.10.91"
const PORT = 2001

function waitEnter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question("\nPressione ENTER para sair...", () => { rl.close(); resolve() }))
}

async function main() {
  const koffi = require("koffi")
  const lib = koffi.load(DLL_PATH)

  const C_OpenSocket2 = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket = lib.func("int __stdcall C_CloseSocket()")

  // C/C++ compatible: retorna pchar com status de todos os bicos
  const C_readState = lib.func("const char* __stdcall C_readState()")

  // VB6 compatible: preenche string por referencia, retorna 1=ok / 0=falha
  const VB_ReadState = lib.func("int __stdcall VB_ReadState(uint8_t *st)")

  // .NET compatible: retorna multistatus (record Delphi, ponteiro oculto)
  // multistatus = status: array[1..48] of StOptions
  const LeStatus = lib.func("void __stdcall LeStatus(uint8_t *result)")

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.log("Falha ao conectar no concentrador")
    await waitEnter()
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  // 1) C_readState (C/C++ compatible)
  console.log("=== C_readState ===")
  const statusRaw = C_readState()
  console.log("Resposta:", statusRaw)
  console.log("")

  // 2) VB_ReadState (VB6 compatible)
  console.log("=== VB_ReadState ===")
  try {
    const buf = Buffer.alloc(512)
    const ret = VB_ReadState(buf)
    if (ret === 1) {
      const len = buf[0]
      const str = buf.slice(1, 1 + len).toString("ascii")
      console.log("Retorno:", ret, "| Status:", str)
    } else {
      console.log("Retorno:", ret, "(falha)")
    }
  } catch (e) {
    console.log("Erro:", e.message)
  }
  console.log("")

  // 3) LeStatus (.NET compatible)
  console.log("=== LeStatus ===")
  try {
    const buf = Buffer.alloc(512)
    LeStatus(buf)
    console.log("Buffer (hex):", buf.slice(0, 96).toString("hex"))
  } catch (e) {
    console.log("Erro:", e.message)
  }

  C_CloseSocket()
  console.log("\nConexao encerrada.")
  await waitEnter()
}

main().catch(async (e) => {
  console.log("Erro inesperado:", e.message)
  await waitEnter()
})
