const { MongoClient, ServerApiVersion } = require('mongodb');
const { mongodbUri } = require('../../config.js');

const client = new MongoClient(mongodbUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

// Coleções
let usersCollection;
let configCollection; // Simplificado: 1 coleção para toda a config
let giftsCollection;
let embedConfigCollection;
let authStatesCollection; // Novo: Para o state do OAuth2

// --- FUNÇÃO DE CONEXÃO E INICIALIZAÇÃO ---
const connectDb = async () => {
  try {
    await client.connect();
    db = client.db("AuthBotDB"); 
    
    // Define as coleções
    usersCollection = db.collection("users");
    configCollection = db.collection("bot_config");
    giftsCollection = db.collection("gifts");
    embedConfigCollection = db.collection("embed_config");
    authStatesCollection = db.collection("auth_states");

    // Cria índices para garantir valores únicos
    await usersCollection.createIndex({ discordId: 1 }, { unique: true });
    await giftsCollection.createIndex({ code: 1 }, { unique: true });
    await authStatesCollection.createIndex({ state: 1 }, { unique: true });
    
    // Garante que o documento de config global exista
    await configCollection.updateOne(
        { _id: "global" },
        { $setOnInsert: { mainGuildId: null, verifiedRoleId: null, logsWebhookUrl: null } },
        { upsert: true }
    );
    // Garante que o documento de embed exista (para o ID do guild 'default')
    await embedConfigCollection.updateOne(
        { _id: "default" },
        { $setOnInsert: { title: "Verificação", description: "Clique para verificar", color: 0x5865F2, buttonLabel: "Verificar" } },
        { upsert: true }
    );

    console.log("Conectado ao MongoDB Atlas com sucesso!");
  } catch (err) {
    console.error('Erro ao conectar ou inicializar o MongoDB:', err);
    process.exit(1); 
  }
};

// --- FUNÇÕES DE ACESSO (CORRIGIDAS) ---
const dbWrapper = {
  // --- Config ---
  getBotConfig: async () => {
    // Busca o documento de config único
    return await configCollection.findOne({ _id: "global" });
  },
  saveBotConfig: async ({ mainGuildId, verifiedRoleId, logsWebhookUrl }) => {
    // Atualiza o documento de config único
    await configCollection.updateOne(
      { _id: "global" },
      { $set: { mainGuildId, verifiedRoleId, logsWebhookUrl } }
    );
  },

  // --- Users ---
  addUser: async (discordId, username, accessToken, refreshToken) => {
    await usersCollection.updateOne(
      { discordId: discordId },
      { $set: { username, accessToken, refreshToken, authDate: new Date() } },
      { upsert: true }
    );
  },
  getUser: async (discordId) => {
    return await usersCollection.findOne({ discordId: discordId });
  },
  deleteUser: async (discordId) => {
    await usersCollection.deleteOne({ discordId: discordId });
  },
  getRandomUsers: async (limit) => {
    return await usersCollection.aggregate([{ $sample: { size: limit } }]).toArray();
  },
  getTotalUsers: async () => { // Nome corrigido
    return await usersCollection.countDocuments();
  },

  // --- Gifts ---
  createGift: async (code, memberCount) => {
    await giftsCollection.insertOne({
      code: code,
      memberCount: memberCount,
      isUsed: false,
      createdAt: new Date()
    });
  },
  getGift: async (code) => {
    return await giftsCollection.findOne({ code: code });
  },
  useGift: async (code) => {
    const result = await giftsCollection.updateOne(
      { code: code, isUsed: false },
      { $set: { isUsed: true } }
    );
    return result.modifiedCount > 0;
  },

  // --- Embed Config ---
  getEmbedConfig: async () => {
    // Usamos um ID 'default' fixo, já que a config de embed é global
    return await embedConfigCollection.findOne({ _id: "default" });
  },
  saveEmbedConfig: async (embedData) => {
    await embedConfigCollection.updateOne(
      { _id: "default" },
      { $set: embedData },
      { upsert: true }
    );
  },
  
  // --- Auth State ---
  saveAuthState: async (state, userId, guildId) => {
    // O state expira em 5 minutos
    const expiration = new Date(Date.now() + 5 * 60 * 1000);
    await authStatesCollection.insertOne({
      state,
      userId,
      guildId,
      expiresAt: expiration
    });
    // (Opcional: Criar um índice TTL no MongoDB Atlas para 'expiresAt' limparia isso automaticamente)
  },
  getAuthState: async (state) => {
    const authData = await authStatesCollection.findOne({ state });
    if (authData) {
      // Deleta após o uso para segurança
      await authStatesCollection.deleteOne({ state });
    }
    // (Verifica se expirou, embora o delete-on-use seja mais seguro)
    if (authData && authData.expiresAt > new Date()) {
        return authData;
    }
    return null;
  }
};

module.exports = { dbWrapper, connectDb };
