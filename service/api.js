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
        console.log("Login realizado com sucesso")
        return response.data;
    } catch (error) {
        console.error("Erro ao fazer login:", error.message);
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
            console.log("Token expirado, fazendo login novamente...")
            await login()
            const retry = await axios.post(`${API_URL}/tanques/telemed`, data, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
            console.log("Encerrante enviado com sucesso (retry):", retry.data)
        } else {
            console.error("Erro ao enviar encerrante:", error.message)
        }
    }
}

module.exports = {
    sendEncerrante,
}
