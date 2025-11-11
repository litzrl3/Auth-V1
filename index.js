const { connectDb } = require('./src/database/database.js');

async function main() {
    try {
        // 1. Conecta ao Banco de Dados PRIMEIRO
        await connectDb();
        console.log("Banco de dados conectado. Iniciando o bot...");

        // 2. Inicia o Bot SEGUNDO
        // Nós apenas 'requerimos' o arquivo, pois o client.login() está dentro dele.
        require('./src/bot/index.js');

        // 3. Inicia o Servidor Web TERCEIRO
        // O servidor web (e suas rotas) depende que o bot (client) já exista.
        require('./src/web/server.js');
        
    } catch (error) {
        console.error("Falha ao iniciar a aplicação:", error);
        process.exit(1);
    }
}

main();