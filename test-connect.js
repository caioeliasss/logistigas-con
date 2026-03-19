const path = require("path")
const koffi = require("koffi")

const DLL_PATH = path.join(__dirname, "companytec.dll")
const ip = "192.168.10.91"
const PORT = 2001

console.log("Carregando DLL...")
const lib = koffi.load(DLL_PATH)

const C_OpenSocket2 = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
const C_CloseSocket = lib.func("int __stdcall C_CloseSocket()")
const C_ReadTotalsVolume = lib.func("int __stdcall C_ReadTotalsVolume(const char *bico)")

console.log("DLL carregada. Conectando...")
const connected = C_OpenSocket2(ip, PORT)
console.log("C_OpenSocket2 retornou:", connected)

if (connected === 1) {
  console.log("Conectado. Lendo encerrantes...")
  for (let bico = 1; bico <= 4; bico++) {
    const bicoStr = bico.toString().padStart(2, "0")
    console.log("Consultando bico " + bicoStr + "...")
    const resultado = C_ReadTotalsVolume(bicoStr)
    console.log("Bico " + bicoStr + ": " + resultado)
  }
  C_CloseSocket()
  console.log("Conexao fechada.")
} else {
  console.log("Falha ao conectar.")
}

console.log("Fim.")
