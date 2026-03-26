const axios = require("axios")
const dotenv = require("dotenv")
dotenv.config()
const API_URL = "https://api.logistigas.com.br/api"

let token = null

async function login() {
    try {
        console.log("Fazendo login em:", `${API_URL}/auth/login`)
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: process.env.EMAIL,
            password: process.env.PASSWORD
        });
        token = response.data.token;
        console.log("Login realizado com sucesso, token:", token ? token.substring(0, 20) + "..." : "VAZIO")
        return response.data;
    } catch (error) {
        const status = error.response ? error.response.status : "sem resposta"
        const msg = error.response ? error.response.data : error.message
        console.error(`Erro ao fazer login (status ${status}):`, JSON.stringify(msg));
        throw error;
    }
}

async function sendEncerrante(data) {
    if (!token) {
        await login()
    }

    const url = `${API_URL}/encerrantes/${data.posto}`
    console.log("Enviando encerrante para:", url)

    try {
        const response = await axios.post(url, data, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
        console.log("Encerrante enviado com sucesso:", response.data)
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("Token expirado/invalido, fazendo login novamente...")
            console.log("Resposta 401:", JSON.stringify(error.response.data))
            await login()
            const retry = await axios.post(url, data, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
            console.log("Encerrante enviado com sucesso (retry):", retry.data)
        } else {
            const msg = error.response ? error.response.data : error.message
            console.error("Erro ao enviar encerrante:", JSON.stringify(msg))
        }
    }
}

module.exports = {
    sendEncerrante,
}
