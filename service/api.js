const axios = require("axios")

const API_URL = "http://api.logistigas.com.br/api"

let token = null

async function login() {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: "maquinaJL@gmail.com",
            password: "maq6816230"
        });
        token = response.data.token;
        console.log("Login realizado com sucesso, token:", token ? token.substring(0, 20) + "..." : "VAZIO")
        return response.data;
    } catch (error) {
        const msg = error.response ? error.response.data : error.message
        console.error("Erro ao fazer login:", JSON.stringify(msg));
        throw error;
    }
}

async function sendEncerrante(data) {
    if (!token) {
        await login()
    }

    try {
        const response = await axios.post(`${API_URL}/tanques/telemed`, data, {
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
            const retry = await axios.post(`${API_URL}/tanques/telemed`, data, {
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
