require('dotenv').config();

// Verifica se todas as variáveis essenciais estão presentes
const requiredEnv = ['BOT_TOKEN', 'CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI', 'BASE_URL', 'MONGODB_URI']; // MUDADO
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`Erro: Variável de ambiente ${envVar} não está definida.`);
  }
}

module.exports = {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  baseUrl: process.env.BASE_URL,
  mongodbUri: process.env.MONGODB_URI, // MUDADO
  port: process.env.WEB_PORT || 3000,
  scopes: ['identify', 'guilds.join'],
};