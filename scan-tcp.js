const net = require("net")
const readline = require("readline")

const ip = "192.168.10.91"
const PORT = 2001
const TOTAL_BICOS = 16

function calcChecksum(data) {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i)
  }
  return (sum % 256).toString(16).toUpperCase().padStart(2, "0")
}

function buildCommand(payload) {
  return ">" + payload + calcChecksum(payload)
}

function sendCommand(client, cmd) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.removeAllListeners("data")
      resolve(null)
    }, 3000)

    client.once("data", (data) => {
      clearTimeout(timeout)
      resolve(data.toString())
    })

    client.write(cmd)
  })
}

function waitEnter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question("\nPressione ENTER para sair...", () => { rl.close(); resolve() }))
}

function connect(ip, port) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket()
    client.setTimeout(5000)
    client.connect(port, ip, () => resolve(client))
    client.on("timeout", () => { client.destroy(); reject(new Error("Timeout")) })
    client.on("error", (err) => reject(err))
  })
}

async function main() {
  let client
  try {
    client = await connect(ip, PORT)
  } catch (e) {
    console.log(`Falha ao conectar em ${ip}:${PORT}`)
    await waitEnter()
    process.exit(1)
  }
  console.log(`Conectou em ${ip}:${PORT}\n`)

  console.log("=== ENCERRANTE (VOLUME) ===")
  for (let bico = 1; bico <= TOTAL_BICOS; bico++) {
    const bicoStr = bico.toString().padStart(2, "0")
    // Comando de leitura de encerrante volume: E + bico
    const cmd = buildCommand("E" + bicoStr)
    const res = await sendCommand(client, cmd)
    if (res) {
      console.log(`Bico ${bicoStr}: ${res.trim()}`)
    } else {
      console.log(`Bico ${bicoStr}: sem resposta`)
    }
  }

  client.destroy()
  console.log("\nConexao encerrada.")
  await waitEnter()
}

main()
