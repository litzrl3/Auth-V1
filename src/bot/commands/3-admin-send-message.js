const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { clientId, redirectUri, scopes } = require('../../../config.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enviar-mensagem')
    .setDescription('Envia a mensagem de verificação com o botão de autenticação.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal para enviar a mensagem')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option => option.setName('titulo').setDescription('Título da embed').setRequired(true))
    .addStringOption(option => option.setName('descricao').setDescription('Descrição da embed (use \\n para nova linha)').setRequired(true))
    .addStringOption(option => option.setName('texto_botao').setDescription('Texto do botão de verificação').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.options.getChannel('canal');
    const title = interaction.options.getString('titulo');
    const description = interaction.options.getString('descricao').replace(/\\n/g, '\n');
    const buttonText = interaction.options.getString('texto_botao');

    // Constrói a URL de autorização OAuth2
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor('#5865F2')
      .setTimestamp();

    const button = new ButtonBuilder()
      .setLabel(buttonText)
      .setURL(oauthUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji('✅');

    const row = new ActionRowBuilder().addComponents(button);

    try {
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `Mensagem de verificação enviada para ${channel}!`, ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Erro ao enviar mensagem. Verifique minhas permissões no canal.', ephemeral: true });
    }
  },
};