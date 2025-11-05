const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Bot pronto! Logado como ${client.user.tag}`);
    client.user.setActivity('Verificando membros...', { type: 'WATCHING' });
  },
};