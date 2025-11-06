// const { startBot } = require('./src/bot/index.js'); // <--- REMOVIDO
const server = require('./src/web/server.js');         // <--- MOVIDO
const { connectDb } = require('./src/database/database.js');

// Função principal assíncrona
async function main() {
  try {
    // 1. Conecta e Inicializa o Banco de Dados (MongoDB)
    await connectDb();
    
    // 2. Inicia o Bot do Discord
    // Ao "carregar" este módulo, o código dentro dele (incluindo client.login) é executado.
    require('./src/bot/index.js');
    
    // O servidor web (Express) já é iniciado em './src/web/server.js'
    // (foi 'required' no topo e já está ouvindo a porta)
    
  } catch (error) {
    console.error("Falha ao iniciar a aplicação:", error);
    process.exit(1);
  }
}

// Inicia a aplicação
main();