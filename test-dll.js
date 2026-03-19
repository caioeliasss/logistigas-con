const koffi = require("koffi")
const path = require("path")

const DLL_PATH = path.join(__dirname, "companytec.dll")
console.log("Carregando DLL:", DLL_PATH)

try {
  const lib = koffi.load(DLL_PATH)
  console.log("DLL carregou OK em " + process.arch)
} catch (e) {
  console.log("Erro ao carregar DLL:", e.message)
}
