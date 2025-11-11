require('dotenv').config();

// Validação de variáveis de ambiente
const requiredEnvVars = [
    'MONGODB_URI',
    'BOT_TOKEN',
    'CLIENT_ID',
    'CLIENT_SECRET',
    'BASE_URL',
    'REDIRECT_URI'
];

for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        // Este erro é crítico e vai parar o bot, o que é bom.
        // O log do Render mostrará exatamente qual variável está faltando.
        throw new Error(`ERRO CRÍTICO: Variável de ambiente ${varName} não está definida.`);
    }
}

// Lê as variáveis do ambiente (ex: Render) ou do .env (local)
// Os nomes aqui (ex: MONGODB_URI) DEVEM bater com os nomes no painel do Render.
const config = {
    mongodbUri: process.env.MONGODB_URI,
    token: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    baseUrl: process.env.BASE_URL,
    redirectUri: process.env.REDIRECT_URI,
    port: process.env.PORT || 3000, // O Render fornece PORT, não WEB_PORT
    scopes: [
        'identify',
        'email', // O 'email' não é realmente usado, mas 'identify' é.
        'guilds.join'
    ]
};

// Exporta os nomes que o resto do seu app espera
module.exports = config;