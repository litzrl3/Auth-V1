const { MongoClient } = require('mongodb');
const config = require('../../config');

let db;
let collections = {};

// Função centralizada para conectar ao DB
async function connectDb() {
    if (db) return db;

    try {
        const client = new MongoClient(config.mongodbUri);
        await client.connect();
        db = client.db(); // Usa o banco de dados padrão da URI
        console.log('MongoDB conectado com sucesso.');

        // Inicializa as coleções que o bot usa
        collections.users = db.collection('users');
        collections.config = db.collection('config');
        collections.gifts = db.collection('gifts');
        collections.authStates = db.collection('authStates');

        // Garante a configuração de expiração (TTL) para os authStates
        // Isso remove automaticamente documentos após 1 hora (3600 segundos)
        const authStates = collections.authStates;
        await authStates.dropIndexes(); // Limpa índices antigos para garantir
        await authStates.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 3600 });
        console.log('Índice TTL de 1 hora para authStates garantido.');

        // Inicializa a configuração padrão do bot se não existir
        const botConfig = await collections.config.findOne({ _id: 'botConfig' });
        if (!botConfig) {
            console.log('Nenhuma configuração encontrada. Criando configuração padrão...');
            await collections.config.insertOne({
                _id: 'botConfig',
                mainGuildId: null,
                logChannelWebhook: null,
                verifiedRoleId: null,
                embedConfig: {
                    title: 'Verificação do Servidor',
                    description: 'Clique no botão abaixo para se verificar.',
                    color: '#0099ff',
                    buttonLabel: 'Verificar-se',
                    buttonEmoji: '✅'
                }
            });
        }
        return db;
    } catch (error) {
        console.error('Falha ao conectar ao MongoDB:', error);
        process.exit(1); // Para a aplicação se não conseguir conectar ao DB
    }
}

// Wrapper do banco de dados para ser usado em outros arquivos
const dbWrapper = {
    // --- Funções de Configuração ---
    getBotConfig: async () => {
        if (!collections.config) await connectDb();
        return collections.config.findOne({ _id: 'botConfig' });
    },
    saveBotConfig: async (configData) => {
        if (!collections.config) await connectDb();
        return collections.config.updateOne(
            { _id: 'botConfig' },
            { $set: configData },
            { upsert: true }
        );
    },

    // --- Funções de Usuário ---
    getTotalUsers: async () => {
        if (!collections.users) await connectDb();
        return collections.users.countDocuments();
    },
    getUser: async (userId) => {
        if (!collections.users) await connectDb();
        return collections.users.findOne({ _id: userId });
    },
    saveUser: async (userData) => {
        if (!collections.users) await connectDb();
        return collections.users.updateOne(
            { _id: userData.id },
            {
                $set: {
                    username: userData.username,
                    accessToken: userData.accessToken,
                    refreshToken: userData.refreshToken,
                    expiresIn: userData.expiresIn,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    },
    getRandomUsers: async (count) => {
        if (!collections.users) await connectDb();
        // $sample é o método aggregate do MongoDB para pegar documentos aleatórios
        return collections.users.aggregate([{ $sample: { size: count } }]).toArray();
    },

    // --- Funções de Auth State ---
    saveAuthState: async (state, userId = '@everyone') => {
        if (!collections.authStates) await connectDb();
        return collections.authStates.insertOne({
            _id: state,
            userId: userId,
            createdAt: new Date()
        });
    },
    getAuthState: async (state) => {
        if (!collections.authStates) await connectDb();
        // O findOneAndDelete é atômico, garante que o state só seja usado uma vez
        const doc = await collections.authStates.findOneAndDelete({ _id: state });
        return doc; // Retorna o documento encontrado (ou null)
    },

    // --- Funções de Gift ---
    createGift: async (giftData) => {
        if (!collections.gifts) await connectDb();
        return collections.gifts.insertOne(giftData);
    },
    getGift: async (code) => {
        if (!collections.gifts) await connectDb();
        return collections.gifts.findOne({ _id: code });
    },
    useGift: async (code) => {
        if (!collections.gifts) await connectDb();
        // Marca o gift como usado
        return collections.gifts.updateOne(
            { _id: code },
            { $set: { used: true, usedAt: new Date() } }
        );
    }
};

module.exports = { connectDb, dbWrapper };