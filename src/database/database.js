const { MongoClient, ServerApiVersion } = require('mongodb');
const { mongodbUri } = require('../../config.js');

// Cria um novo cliente MongoDB
const client = new MongoClient(mongodbUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

// Coleções (equivalente às tabelas)
let usersCollection;
let configCollection;
let globalConfigCollection;
let giftsCollection;
let embedConfigCollection;

// --- FUNÇÃO DE CONEXÃO E INICIALIZAÇÃO ---
const connectDb = async () => {
  try {
    await client.connect();
    db = client.db("AuthBotDB"); // Você pode nomear seu DB aqui
    
    // Define as coleções
    usersCollection = db.collection("users");
    configCollection = db.collection("config");
    globalConfigCollection = db.collection("global_config");
    giftsCollection = db.collection("gifts");
    embedConfigCollection = db.collection("embed_config");

    // Cria índices para garantir valores únicos onde necessário
    await usersCollection.createIndex({ user_id: 1 }, { unique: true });
    await configCollection.createIndex({ guild_id: 1 }, { unique: true });
    await globalConfigCollection.createIndex({ key: 1 }, { unique: true });
    await giftsCollection.createIndex({ code: 1 }, { unique: true });
    await embedConfigCollection.createIndex({ guild_id: 1 }, { unique: true });

    console.log("Conectado ao MongoDB Atlas com sucesso!");
  } catch (err) {
    console.error('Erro ao conectar ou inicializar o MongoDB:', err);
    process.exit(1); // Encerra a aplicação se o DB falhar
  }
};

// --- FUNÇÕES DE ACESSO (REESCRITAS PARA MONGODB) ---
// Usamos _id para o ID do documento do Mongo, e campos como user_id para o ID do Discord.

const dbWrapper = {
  // Config
  setConfig: async (guildId, roleId, webhookUrl) => {
    await configCollection.updateOne(
      { guild_id: guildId },
      { $set: { verified_role_id: roleId, log_webhook_url: webhookUrl } },
      { upsert: true } // Cria o documento se não existir
    );
  },
  getConfig: async (guildId) => {
    return await configCollection.findOne({ guild_id: guildId });
  },
  setMainGuild: async (guildId) => {
    await globalConfigCollection.updateOne(
      { key: 'main_guild_id' },
      { $set: { value: guildId } },
      { upsert: true }
    );
  },
  getMainGuild: async () => {
    return await globalConfigCollection.findOne({ key: 'main_guild_id' });
  },

  // Users
  addUser: async (userId, username, accessToken, refreshToken) => {
    await usersCollection.updateOne(
      { user_id: userId },
      { $set: { username, access_token: accessToken, refresh_token: refreshToken, auth_date: new Date() } },
      { upsert: true }
    );
  },
  getUser: async (userId) => {
    return await usersCollection.findOne({ user_id: userId });
  },
  getAllUsers: async () => {
    return await usersCollection.find().toArray();
  },
  getRandomUsers: async (limit) => {
    // $sample é o método aggregate do Mongo para pegar aleatórios
    return await usersCollection.aggregate([{ $sample: { size: limit } }]).toArray();
  },
  getUserCount: async () => {
    return await usersCollection.countDocuments();
  },

  // Gifts
  createGift: async (code, memberCount, createdBy) => {
    await giftsCollection.insertOne({
      code: code,
      member_count: memberCount,
      created_by: createdBy,
      is_used: false,
      created_at: new Date()
    });
  },
  getGift: async (code) => {
    return await giftsCollection.findOne({ code: code });
  },
  useGift: async (code) => {
    const result = await giftsCollection.updateOne(
      { code: code, is_used: false },
      { $set: { is_used: true } }
    );
    return result.modifiedCount > 0; // Retorna true se 1 documento foi modificado
  },
  getGiftCount: async () => {
    return await giftsCollection.countDocuments();
  },

  // Embed Config
  getEmbedConfig: async (guildId) => {
    return await embedConfigCollection.findOne({ guild_id: guildId });
  },
  setEmbedConfigField: async (guildId, field, value) => {
    // $set com colchetes permite usar uma variável como nome da chave
    await embedConfigCollection.updateOne(
      { guild_id: guildId },
      { $set: { [field]: value } },
      { upsert: true }
    );
  },
  resetEmbedConfig: async (guildId) => {
     await embedConfigCollection.deleteOne({ guild_id: guildId });
  }
};

module.exports = { dbWrapper, connectDb };