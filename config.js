require('dotenv').config();

module.exports = {
  // Bot
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,

  // Web
  port: process.env.WEB_PORT || 3000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.WEB_PORT || 3000}`,
  redirectUri: process.env.REDIRECT_URI,

  // Scopes do OAuth2
  // 'identify' - Pega informações básicas do usuário
  // 'guilds.join' - Permite que o app adicione o usuário a um servidor (puxar membro)
  scopes: ['identify', 'guilds.join'],
};