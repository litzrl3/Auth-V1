const { startBot } = require('./src/bot/index.js');
const server = require('./src/web/server.js');
const { connectDb } = require('./src/database/database.js'); // MUDADO

// Função principal assíncrona
async function main() {
  try {
    // 1. Conecta e Inicializa o Banco de Dados (MongoDB)
    await connectDb();
    
    // 2. Inicia o Bot do Discord
    startBot();
    
    // O servidor web (Express) já é iniciado em './src/web/server.js'
    // (foi 'required')
    
  } catch (error) {
    console.error("Falha ao iniciar a aplicação:", error);
    process.exit(1);
  }
}

// Inicia a aplicação
main();