const { REST, Routes } = require('discord.js');
const { clientId, token } = require('../../config.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Alterado: Apenas lê o comando '1-admin-auth.js'
const authCommandFile = '1-admin-auth.js';
const commandPath = path.join(__dirname, 'commands', authCommandFile);

if (fs.existsSync(commandPath)) {
    const command = require(commandPath);
    commands.push(command.data.toJSON());
} else {
    console.warn(`Arquivo de comando principal ${authCommandFile} não encontrado.`);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Iniciando o registro de ${commands.length} comandos (/) ...`);

    // Limpa comandos antigos (opcional, mas recomendado na reestruturação)
    // await rest.put(Routes.applicationCommands(clientId), { body: [] });
    // console.log('Comandos antigos limpos.');

    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log(`Sucesso! Registrados ${data.length} comandos (/) globalmente.`);
  } catch (error) {
    console.error(error);
  }
})();