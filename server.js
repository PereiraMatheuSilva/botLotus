require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Verifica se as variáveis de ambiente existem
if (!process.env.TOKEN || !process.env.TABLE_ID) {
    console.error("Erro: As variáveis de ambiente TOKEN ou TABLE_ID não estão definidas.");
    process.exit(1);
}

// Definição dos headers comuns
const commonHeaders = {
    'accept': 'application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'access-control-allow-origin': '*',
    'authorization': `Bearer ${process.env.TOKEN}`,
    'content-type': 'application/json',
    'origin': 'https://app.lotusmais.com.br',
    'referer': 'https://app.lotusmais.com.br/',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'x-request-id': '8972eb1d-b6e9-4223-899b-03ab082ce1ea'
};

// Função para verificar o status da simulação
const checkSimulationStatus = async (id) => {
    try {
        const response = await axios.get(
            `https://backoffice-prod-dycyrhjbkq-rj.a.run.app/v1/fgts/simulation/${id}`,
            { headers: commonHeaders }
        );

        // Se o status ainda for "PENDING", aguarde 3 segundos e tente novamente
        if (response.data.status === "PENDING") {
            console.log("Simulação ainda em processamento, tentando novamente em 3 segundos...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            return checkSimulationStatus(id);
        }

        return response.data;

    } catch (error) {
        console.error("Erro ao verificar status da simulação:", error.response?.data || error.message);
        throw error;
    }
};

// Rota para simular FGTS
app.get('/simular/:cpf', async (req, res) => {
    try {
        const { cpf } = req.params;

        const payload = {
            cpf,
            interestRate: 0.018,
            numberOfPeriods: 10,
            reservationAmount: 50,
            tableId: process.env.TABLE_ID,
            hasInsurance: false
        };

        const response = await axios.post(
            'https://backoffice-prod-dycyrhjbkq-rj.a.run.app/v1/fgts/create-simulation',
            payload,
            { headers: commonHeaders }
        );

        const simulationId = response.data.id;

        // Verifica o status até que ele mude de "PENDING"
        const finalResult = await checkSimulationStatus(simulationId);

        res.json(finalResult);

    } catch (error) {
        console.error("Erro ao buscar simulação:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data || "Erro interno no servidor"
        });
    }
});

// Rota raiz para teste
app.get('/', (req, res) => {
    res.json({ mensagem: 'Servidor rodando corretamente!' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
