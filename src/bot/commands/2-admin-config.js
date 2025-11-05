const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Define as configurações de autenticação.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('cargo')
        .setDescription('Define o cargo que os membros verificados receberão.')
        .addRoleOption(option =>
          option.setName('cargo').setDescription('O cargo de verificado').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('Define o webhook do canal de logs.')
        .addStringOption(option =>
          option.setName('webhook_url').setDescription('URL do Webhook').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('servidor')
        .setDescription('Define este servidor como o servidor principal para autenticação.')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (subcommand === 'cargo' || subcommand === 'logs') {
      const config = db.getConfig(guildId) || { verified_role_id: null, log_webhook_url: null };
      let roleId = config.verified_role_id;
      let webhookUrl = config.log_webhook_url;

      if (subcommand === 'cargo') {
        roleId = interaction.options.getRole('cargo').id;
        db.setConfig(guildId, roleId, webhookUrl);
        await interaction.reply({ content: `Cargo de verificado definido como <@&${roleId}>.`, ephemeral: true });
      } else {
        webhookUrl = interaction.options.getString('webhook_url');
        // Validação simples de URL
        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
          return interaction.reply({ content: 'URL de webhook inválida.', ephemeral: true });
        }
        db.setConfig(guildId, roleId, webhookUrl);
        await interaction.reply({ content: 'Canal de logs definido com sucesso!', ephemeral: true });
      }
    } else if (subcommand === 'servidor') {
      db.setMainGuild(guildId);
      await interaction.reply({ content: `O servidor \`${interaction.guild.name}\` foi definido como o servidor principal!`, ephemeral: true });
    }
  },
};