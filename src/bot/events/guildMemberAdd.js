const { Events, WebhookClient, EmbedBuilder } = require('discord.js');
const { dbWrapper } = require('../../database/database.js');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    
    // CORREÇÃO: Usamos 'member.client' para pegar o bot, em vez de 'require'
    const guild = member.client.guilds.cache.get(member.guild.id);
    if (!guild) return;

    // Busca a config do DB
    const config = await dbWrapper.getBotConfig();
    if (!config) return;

    const mainGuildId = config.mainGuildId;
    const roleId = config.verifiedRoleId;
    const webhookUrl = config.logsWebhookUrl;

    // Se este não for o servidor principal, não faz nada.
    if (guild.id !== mainGuildId) {
      return;
    }

    // Tenta encontrar o usuário no nosso banco de dados
    const user = await dbWrapper.getUser(member.id);

    if (user && roleId) {
      // Usuário está no DB e temos um cargo configurado
      try {
        const role = await guild.roles.fetch(roleId);
        if (role) {
          await member.roles.add(role);

          // Envia log, se configurado
          if (webhookUrl) {
            const webhook = new WebhookClient({ url: webhookUrl });
            const embed = new EmbedBuilder()
              .setTitle('✅ Cargo Adicionado (Auto-Join)')
              .setColor('#00FF00')
              .setDescription(`${member.user.username} (\`${member.id}\`) entrou no servidor e já estava verificado. O cargo <@&${roleId}> foi adicionado.`)
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            await webhook.send({ embeds: [embed] });
          }
        }
      } catch (error) {
        console.error(`Erro ao adicionar cargo para ${member.user.username}:`, error);
      }
    }
  },
};