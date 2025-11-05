const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database/database.js');
const { clientId, redirectUri, scopes } = require('../../../config.js');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
        // Verifica se este é o servidor principal
        const mainGuildId = db.getMainGuild()?.value;
        if (member.guild.id !== mainGuildId) {
            return; // Ignora se não for o servidor principal
        }

        // Verifica se o usuário já está verificado no DB
        const existingUser = db.getUser(member.id);
        if (existingUser) {
            console.log(`Membro ${member.user.tag} já verificado, adicionando cargo...`);
            const config = db.getConfig(member.guild.id);
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
                .setDescription(`Para ter acesso completo ao servidor, por favor, verifique sua conta clicando no botão abaixo.`)
                .setColor('#5865F2')
                .setThumbnail(member.guild.iconURL())
                .setTimestamp();

            const button = new ButtonBuilder()
                .setLabel('Verificar Conta')
                .setURL(oauthUrl)
                .setStyle(ButtonStyle.Link)
                .setEmoji('✅');

            const row = new ActionRowBuilder().addComponents(button);

            await member.send({ embeds: [embed], components: [row] });
            console.log(`DM de verificação enviada para ${member.user.tag}`);

        } catch (error) {
            console.error(`Não foi possível enviar DM de verificação para ${member.user.tag}.`, error.message);
            // Opcional: enviar uma mensagem em um canal de "não-verificados"
        }
	},
};