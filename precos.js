const path = require("path")
const dotenv = require("dotenv")
const bicos = require("./bicos")

dotenv.config({ path: path.join(__dirname, ".env") })

const DLL_PATH = path.join(__dirname, "companytec.dll")

const ip = process.env.IP
const PORT = parseInt(process.env.PORT, 10)
const POSTO = process.env.POSTOID

if (!ip || !POSTO || !PORT) {
  console.error("IP, POSTO ou PORT não configurado no .env")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Protocolo Companytec – helpers
// ---------------------------------------------------------------------------

// Checksum: soma dos valores ASCII de todos os chars após '>' (inclui '?'/'!')
// até antes dos 2 chars do checksum, mantendo apenas o byte baixo (mod 256).
function computeChecksum(inner) {
  let sum = 0
  for (let i = 0; i < inner.length; i++) sum += inner.charCodeAt(i)
  return (sum & 0xFF).toString(16).toUpperCase().padStart(2, '0')
}

// Monta um comando completo: >?CCCC<data>KK
function buildCommand(data) {
  const sizeHex = data.length.toString(16).toUpperCase().padStart(4, '0')
  const inner = `?${sizeHex}${data}`
  return `>${inner}${computeChecksum(inner)}`
}

// ---------------------------------------------------------------------------
// ShortString helpers (Delphi: byte[0]=comprimento, bytes[1..255]=conteúdo)
// ---------------------------------------------------------------------------

function makeShortBuf(str) {
  const buf = new Array(256).fill(0)
  buf[0] = Math.min(str.length, 255)
  for (let i = 0; i < buf[0]; i++) buf[i + 1] = str.charCodeAt(i)
  return buf
}

function readShortBuf(arr) {
  const len = arr[0]
  let s = ''
  for (let i = 1; i <= len; i++) s += String.fromCharCode(arr[i])
  return s
}

// ---------------------------------------------------------------------------
// Parse da resposta de preço por litro dos 3 níveis (tipo 09)
// Protocolo: >!CCCC05BBTTFFFFFFGGGGGGHHHHHHKK
// ---------------------------------------------------------------------------

function parsePrecosNivel(resp) {
  if (!resp.startsWith('>!')) return null
  const dataSize = parseInt(resp.substring(2, 6), 16)
  // dados após CCCC, excluindo os 2 chars finais de checksum
  const data = resp.substring(6, 6 + dataSize)
  if (data.length < 24) return null
  const cmdIdx = data.substring(0, 2)
  const bico   = data.substring(2, 4)
  const tipo   = data.substring(4, 6)
  if (cmdIdx !== '05' || tipo !== '09') return null
  const f = data.substring(6, 12)   // nível 0 – à vista / dinheiro
  const g = data.substring(12, 18)  // nível 1 – crédito
  const h = data.substring(18, 24)  // nível 2 – débito
  return { bico, f, g, h }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let koffi
  try {
    koffi = require("koffi")
  } catch (e) {
    console.error("Erro ao carregar modulo koffi:", e.message)
    process.exit(1)
  }

  let lib
  try {
    lib = koffi.load(DLL_PATH)
  } catch (e) {
    console.error(`Erro ao carregar DLL: ${DLL_PATH}`)
    console.error("Coloque a companytec.dll na mesma pasta do executavel.")
    console.error(e.message)
    process.exit(1)
  }

  // ShortString como struct de 256 uint8 (len + chars)
  const ShortString = koffi.struct('ShortString', {
    len:   'uint8',
    chars: koffi.array('uint8', 255),
  })

  const C_OpenSocket2 = lib.func("int __stdcall C_OpenSocket2(const char *ip, int port)")
  const C_CloseSocket = lib.func("int __stdcall C_CloseSocket()")

  // C_SendReceiveText retorna ShortString em Delphi – o compilador passa um
  // ponteiro oculto como primeiro parâmetro para receber o resultado.
  const C_SendReceiveText = lib.func(
    "void __stdcall C_SendReceiveText(_Out_ ShortString *result, ShortString *comando)"
  )

  const connected = C_OpenSocket2(ip, PORT)
  if (!connected) {
    console.error("Falha ao conectar no concentrador")
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  const precos = {}

  for (const [key, info] of Object.entries(bicos)) {
    // A chave em bicos.js é o código hex do concentrador; o bico no protocolo
    // é esse mesmo valor em decimal com 2 dígitos.
    const bicoNum    = parseInt(key, 16)
    const bicoDecStr = bicoNum.toString().padStart(2, '0')

    // Comando 05, tipo 09: leitura dos 3 níveis de preço por litro
    const payload = `05${bicoDecStr}09`
    const cmd     = buildCommand(payload)

    // Monta o ShortString de entrada
    const cmdBuf = { len: cmd.length, chars: makeShortBuf(cmd).slice(1) }

    console.log(`Bico ${key} (dec ${bicoDecStr}) | ${info.produto}`)
    console.log(`  TX: ${cmd}`)

    const result = {}
    try {
      C_SendReceiveText(result, cmdBuf)
      const resp = String.fromCharCode(...result.chars.slice(0, result.len))
      console.log(`  RX: ${resp}`)

      const parsed = parsePrecosNivel(resp)
      if (parsed) {
        // Exibe raw e interpretação com divisor 10000 (ajustar conforme resposta real)
        console.log(`  Nível 0 (à vista): ${parsed.f} → ${(parseInt(parsed.f, 10) / 10000).toFixed(4)} R$/L`)
        console.log(`  Nível 1 (crédito): ${parsed.g} → ${(parseInt(parsed.g, 10) / 10000).toFixed(4)} R$/L`)
        console.log(`  Nível 2 (débito):  ${parsed.h} → ${(parseInt(parsed.h, 10) / 10000).toFixed(4)} R$/L`)
        precos[key] = {
          produto:  info.produto,
          nivel0:   parsed.f,
          nivel1:   parsed.g,
          nivel2:   parsed.h,
        }
      } else {
        console.log(`  Resposta não reconhecida ou erro na resposta`)
      }
    } catch (e) {
      console.log(`  ERRO: ${e.message}`)
    }
    console.log()
  }

  C_CloseSocket()
  console.log("Conexão encerrada.\n")
  console.log("Preços coletados:")
  console.log(JSON.stringify(precos, null, 2))
}

main().catch((e) => {
  console.error("Erro inesperado:", e.message)
  process.exit(1)
})