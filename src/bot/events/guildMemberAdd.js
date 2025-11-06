const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { dbWrapper } = require('../../database/database.js'); // MUDADO
const { clientId, redirectUri, scopes } = require('../../../config.js');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
        // CORREÇÃO: Adicionado async/await e .value
        const mainGuildData = await dbWrapper.getMainGuild();
        const mainGuildId = mainGuildData?.value;

        if (member.guild.id !== mainGuildId) {
            return; // Ignora se não for o servidor principal
        }

        // CORREÇÃO: Adicionado async/await
        const existingUser = await dbWrapper.getUser(member.id);
        if (existingUser) {
            console.log(`Membro ${member.user.tag} já verificado, adicionando cargo...`);
            // CORREÇÃO: Adicionado async/await
            const config = await dbWrapper.getConfig(member.guild.id);
            if (config?.verified_role_id) {
                try {
                    const role = await member.guild.roles.fetch(config.verified_role_id);
                    if (role) {
                        await member.roles.add(role);
                    }
                } catch (error) {
                    console.error("Erro ao adicionar cargo para membro que re-entrou:", error);
                }
            }
            return;
        }

        // Se não estiver verificado, envia DM para verificação (Puxar Membro)
        try {
            const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;

            const embed = new EmbedBuilder()
                .setTitle(`Bem-vindo(a) ao ${member.guild.name}!`)
// ... (código existente) ...
                .setDescription(`Para ter acesso completo ao servidor, por favor, verifique sua conta clicando no botão abaixo.`)
                .setColor('#5865F2')
                .setThumbnail(member.guild.iconURL())
// ... (código existente) ...
                .setTimestamp();

            const button = new ButtonBuilder()
                .setLabel('Verificar Conta')
// ... (código existente) ...
                .setURL(oauthUrl)
                .setStyle(ButtonStyle.Link)
                .setEmoji('✅');
// ... (código existente) ...

            const row = new ActionRowBuilder().addComponents(button);

            await member.send({ embeds: [embed], components: [row] });
// ... (código existente) ...
            console.log(`DM de verificação enviada para ${member.user.tag}`);

        } catch (error) {
            console.error(`Não foi possível enviar DM de verificação para ${member.user.tag}.`, error.message);
// ... (código existente) ...
        }
	},
};