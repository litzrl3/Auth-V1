const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('../../config'); // Vai ler o token do config.js

// Cria um novo cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Você confirmou que esta Intent está LIGADA
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Você confirmou que esta Intent está LIGADA
    ]
});

// Carrega os comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Carrega os eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// --- MUDANÇA IMPORTANTE ---
// Tenta fazer o login
client.login(config.token)
    .then(() => {
        // Não precisamos fazer nada aqui, o evento 'ready' vai cuidar disso.
    })
    .catch(err => {
        // Se o login falhar (Token Inválido, Intents Erradas),
        // vamos logar o erro e 'crashar' o processo.
        console.error("================================================");
        console.error("FALHA AO LOGAR NO DISCORD!");
        console.error("Verifique o BOT_TOKEN e as Intents no Portal do Discord.");
        console.error(err.message); // Mostra o erro exato
        console.error("================================================");
        process.exit(1); // Força o crash
    });

module.exports = client;