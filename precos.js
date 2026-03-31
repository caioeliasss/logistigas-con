const axios = require("axios")
const path = require("path")
const dotenv = require("dotenv")
const bicos = require("./bicos")

dotenv.config({ path: path.join(__dirname, ".env") })

const API_URL = (process.env.PUMP_API_URL || "http://localhost:5000").replace(/\/$/, "")
const ip = process.env.IP
const PORT = Number.parseInt(process.env.PORT, 10)

function formatPrice(price) {
  if (!price) return "N/A"
  return `R$ ${Number(price.value).toFixed(3)}/L`
}

function buildRequestPayload() {
  const payload = {
    bicos: Object.keys(bicos),
    levels: 3,
  }

  if (ip) payload.ip = ip
  if (!Number.isNaN(PORT)) payload.port = PORT

  return payload
}

async function main() {
  console.log("Script iniciado...")
  console.log(`Diretorio: ${__dirname}`)
  console.log(`API: ${API_URL}`)

  let response

  try {
    response = await axios.post(`${API_URL}/api/precos`, buildRequestPayload(), {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })
  } catch (error) {
    const status = error.response ? error.response.status : "sem resposta"
    const detail = error.response ? error.response.data : error.message
    console.error(`Erro ao consultar API de preços (status ${status}):`, JSON.stringify(detail))
    process.exit(1)
  }

  const precosApi = response.data || {}
  const precos = {}

  for (const [key, info] of Object.entries(bicos)) {
    const preco = precosApi[key]

    console.log(`\nBico ${key} | ${info.produto}`)

    if (!preco) {
      console.log("  Resposta não reconhecida")
      continue
    }

    for (const tentativa of preco.attempts || []) {
      console.log(`  TX: ${tentativa.command}`)
      console.log(`  RX: ${tentativa.response}`)
    }

    console.log(`  Nível 0 (à vista): ${preco.nivel0?.raw ?? "N/A"} → ${formatPrice(preco.nivel0)}`)
    console.log(`  Nível 1 (crédito): ${preco.nivel1?.raw ?? "N/A"} → ${formatPrice(preco.nivel1)}`)
    if (preco.nivel2 != null) {
      console.log(`  Nível 2 (débito):  ${preco.nivel2.raw} → ${formatPrice(preco.nivel2)}`)
    }

    precos[key] = {
      produto: info.produto,
      nivel0: preco.nivel0?.raw ?? null,
      nivel1: preco.nivel1?.raw ?? null,
      nivel2: preco.nivel2?.raw ?? null,
      rawResponse: preco.rawResponse,
    }
  }

  console.log("\nPreços coletados:")
  console.log(JSON.stringify(precos, null, 2))
}

main().catch((error) => {
  console.error("Erro inesperado:", error.message)
  process.exit(1)
})