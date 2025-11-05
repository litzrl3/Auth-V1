const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/database.js');
const { baseUrl } = require('../../../config.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('criar-gift')
    .setDescription('Cria links de "gift card" para verificação.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(option =>
      option.setName('usos')
        .setDescription('Quantidade de membros que podem usar cada link.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('Quantidade de links (gifts) para gerar.')
        .setRequired(false) // Opcional, padrão 1
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const uses = interaction.options.getInteger('usos');
    const amount = interaction.options.getInteger('quantidade') || 1;

    if (uses <= 0 || amount <= 0) {
      return interaction.editReply({ content: 'Valores devem ser maiores que zero.' });
    }

    if (amount > 20) {
        return interaction.editReply({ content: 'Você só pode gerar no máximo 20 links por vez.' });
    }

    const generatedCodes = [];
    for (let i = 0; i < amount; i++) {
      // Gera um código aleatório simples
      const code = crypto.randomBytes(6).toString('hex');
      
      try {
        db.createGift(code, uses, interaction.user.id);
        generatedCodes.push(`${baseUrl}/redeem/${code}`);
      } catch (error) {
        console.error("Erro ao criar gift (código duplicado?):", error);
        i--; // Tenta novamente
      }
    }

    const replyMessage = `**Links de Gift Gerados (Usos: ${uses})**\n\n${generatedCodes.join('\n')}`;

    if (replyMessage.length > 2000) {
      await interaction.editReply({ content: `Muitos links gerados. Aqui estão os primeiros:\n\n${generatedCodes.slice(0, 10).join('\n')}\n\n...e mais ${generatedCodes.length - 10} outros.` });
    } else {
      await interaction.editReply({ content: replyMessage });
    }
  },
};