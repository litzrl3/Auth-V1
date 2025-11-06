const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { dbWrapper } = require('../../database/database.js'); // MUDADO

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auth')
    .setDescription('Mostra o painel de gerenciamento de autenticação.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // CORREÇÃO: Adicionado await e .value
    const mainGuildData = await dbWrapper.getMainGuild();
    const mainGuildId = mainGuildData?.value;

    let mainGuildName = "Nenhum";
    let puxadas = 0; // Você pode implementar essa lógica depois
    
    if (mainGuildId) {
      try {
        const guild = await interaction.client.guilds.fetch(mainGuildId);
        mainGuildName = guild.name;
      } catch (error) {
        mainGuildName = "ID Inválido";
      }
    }

    // CORREÇÃO: Adicionado await
    const userCount = await dbWrapper.getUserCount();

    // Embed principal
    const embed = new EmbedBuilder()
      .setTitle(`BOT AUTH - ${interaction.client.user.username}`)
      .setColor('#5865F2')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: 'Nome da Aplicação', value: interaction.client.user.username, inline: true },
        { name: 'Usuário(s) Válido(s)', value: `\`${userCount}\` usuários`, inline: true },
        { name: 'Quantidades de Puxadas', value: `\`${puxadas}\` puxadas`, inline: true },
      )
      .setTimestamp();

    // Botões
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('push_members_button') // ID ATUALIZADO
          .setLabel('Puxar Membros') // Texto ATUALIZADO
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
                .setEmoji('📝'),
        );

    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  },
};