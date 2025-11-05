const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/database.js');
const client = require('../index.js'); // Importa o cliente para pegar o nome/avatar

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auth')
    .setDescription('Mostra o painel de gerenciamento de autenticação.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const mainGuildId = db.getMainGuild()?.value;
    let mainGuildName = "Nenhum";
    let puxadas = 0; // Você precisaria de um DB para contar isso, por enquanto 0
    
    if (mainGuildId) {
      try {
        const guild = await client.guilds.fetch(mainGuildId);
        mainGuildName = guild.name;
      } catch (error) {
        mainGuildName = "ID Inválido";
      }
    }

    const userCount = db.getUserCount();

    // Embed principal (estilo Foto 1)
    const embed = new EmbedBuilder()
      .setTitle(`BOT AUTH - ${interaction.client.user.username}`)
      .setColor('#5865F2')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: 'Nome da Aplicação', value: interaction.client.user.username, inline: true },
        { name: 'Usuário(s) Válido(s)', value: `\`${userCount}\` usuários`, inline: true },
        { name: 'Quantidades de Puxadas', value: `\`${puxadas}\` puxadas`, inline: true },
        // Adicione mais campos se desejar, como "Expira em" (requer lógica de licença)
      )
      .setTimestamp();

    // Botões (estilo Foto 1)
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('sync_members_button')
          .setLabel('Puxar Membros (Sincronizar)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId('config_server_button')
          .setLabel('Configurar Servidores')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⚙️'),
        new ButtonBuilder()
          .setCustomId('create_gift_button')
          .setLabel('Criar Gift-Card(s)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎁')
      );
      
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('config_message_button')
                .setLabel('Configurar Mensagem Auth')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(' mesaj'), // Emoji de Lápis
            // Você pode adicionar mais botões aqui, como "Convidar" ou "Status"
        );

    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  },
};