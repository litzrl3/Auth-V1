const { 
    Events, 
    ModalBuilder, 
    // ... (imports não mudam) ...
    ChannelType
} = require('discord.js');
const { dbWrapper } = require('../../database/database.js'); // MUDADO
const { clientId, redirectUri, scopes, baseUrl } = require('../../../config.js');
const crypto = require('crypto');

// --- FUNÇÕES AUXILIARES ---

// CORREÇÃO: Adicionado async/await
async function buildPreviewEmbed(config) {
    const embed = new EmbedBuilder()
        .setTitle(config?.title || 'Verifique-se')
        .setDescription(config?.description || 'Clique no botão abaixo para se verificar e ter acesso ao servidor.')
        .setColor(config?.color || '#5865F2')
        .setFooter({ text: 'PREVIEW - Esta é uma visualização.' });
    try {
        if (config?.image_url) embed.setImage(config.image_url);
        if (config?.thumbnail_url) embed.setThumbnail(config.thumbnail_url);
    } catch(e) { console.warn("URL de imagem/thumbnail inválida no preview:", e.message); }
    return embed;
}

// CORREÇÃO: Adicionado async/await
async function sendEmbedConfigMenu(interaction) {
   const config = await dbWrapper.getEmbedConfig(interaction.guildId); // await
   const previewEmbed = await buildPreviewEmbed(config); // await
   
   const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('embed_element_select')
      .setPlaceholder('Selecione um elemento da embed para editar')
      .addOptions(
          // ... (opções não mudam) ...
          { label: 'Título', value: 'title', description: 'Muda o título da mensagem de AUTH', emoji: '🇹' },
          { label: 'Descrição', value: 'description', description: 'Muda a descrição da mensagem de AUTH', emoji: '📄' },
          { label: 'Cor (Hex)', value: 'color', description: 'Muda a cor da mensagem (Ex: #FFFFFF)', emoji: '🎨' },
          { label: 'Imagem (URL)', value: 'image_url', description: 'Muda a imagem principal (grande)', emoji: '🖼️' },
          { label: 'Thumbnail (URL)', value: 'thumbnail_url', description: 'Muda a imagem no canto (pequena)', emoji: '📌' },
          { label: 'Texto do Botão', value: 'button_text', description: 'Muda o texto do botão de verificação', emoji: '🔘' }
      );
   const buttons = new ActionRowBuilder()
      .addComponents(
          new ButtonBuilder().setCustomId('send_embed_button').setLabel('Enviar').setStyle(ButtonStyle.Success).setEmoji('▶️'),
          new ButtonBuilder().setCustomId('reset_embed_button').setLabel('Resetar').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
      );
   await interaction.reply({
      content: 'Configure a mensagem que o usuário verá ao se autenticar.',
      embeds: [previewEmbed],
      components: [new ActionRowBuilder().addComponents(selectMenu), buttons],
      ephemeral: true
   });
}
// --- FIM DAS FUNÇÕES AUXILIARES ---


module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    
    // 1. Chat Input Command (só /auth)
    if (interaction.isChatInputCommand()) {
      // ... (Lógica do /auth não muda) ...
// ... (código existente) ...
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
// ... (código existente) ...
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
// ... (código existente) ...
          await interaction.followUp({ content: 'Houve um erro ao executar este comando!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Houve um erro ao executar este comando!', ephemeral: true });
// ... (código existente) ...
        }
      }
      return;
    }

    // 2. Button Clicks
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // --- Botão: Configurar Servidor ---
      if (customId === 'config_server_button') {
        // CORREÇÃO: Adicionado async/await
        const config = await dbWrapper.getConfig(interaction.guildId) || {};
        const mainGuildData = await dbWrapper.getMainGuild();
        const mainGuildId = mainGuildData?.value || interaction.guildId;
        
        const modal = new ModalBuilder()
          .setCustomId('config_server_modal')
// ... (código existente) ...
          .setTitle('Configurar Servidores');
        
        const mainGuildInput = new TextInputBuilder()
          .setCustomId('main_guild_id_input')
// ... (código existente) ...
          .setLabel('ID do Servidor Principal (para puxar)')
          .setStyle(TextInputStyle.Short)
          .setValue(mainGuildId)
// ... (código existente) ...
          .setRequired(true);

        const roleInput = new TextInputBuilder()
// ... (código existente) ...
          .setCustomId('role_id_input')
          .setLabel('ID do Cargo de Verificado')
          .setStyle(TextInputStyle.Short)
// ... (código existente) ...
          .setValue(config.verified_role_id || '')
          .setPlaceholder('Ex: 108530... (deixe em branco para não dar cargo)')
          .setRequired(false);
// ... (código existente) ...

        const webhookInput = new TextInputBuilder()
          .setCustomId('webhook_url_input')
// ... (código existente) ...
          .setLabel('URL do Webhook de Logs')
          .setStyle(TextInputStyle.Short)
          .setValue(config.log_webhook_url || '')
// ... (código existente) ...
          .setPlaceholder('https://discord.com/api/webhooks/...')
          .setRequired(false);
        
        modal.addComponents(
// ... (código existente) ...
            new ActionRowBuilder().addComponents(mainGuildInput),
            new ActionRowBuilder().addComponents(roleInput),
            new ActionRowBuilder().addComponents(webhookInput)
// ... (código existente) ...
        );
        await interaction.showModal(modal);
      }

      // --- Botão: Configurar Mensagem ---
      if (customId === 'config_message_button') {
        await sendEmbedConfigMenu(interaction);
      }

      // --- Botão: Criar Gift (MUDADO - Foto 2) ---
      if (customId === 'create_gift_button') {
        // CORREÇÃO: Adicionado async/await
        const userCount = await dbWrapper.getUserCount();
        const modal = new ModalBuilder()
          .setCustomId('create_gift_modal_v2') // Novo ID
// ... (código existente) ...
          .setTitle('Generate Gifts Members');
        
        const membersInput = new TextInputBuilder()
          .setCustomId('member_count_input')
// ... (código existente) ...
          .setLabel('QUAL QUANTIDADE DE MEMBROS ESSE GIFT TERÁ?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Lembre-se: ${userCount} Membro(s) disponíveis.`)
// ... (código existente) ...
          .setRequired(true);

        const amountInput = new TextInputBuilder()
// ... (código existente) ...
          .setCustomId('gift_amount_input')
          .setLabel('QUANTOS GIFT(S) QUER GERAR?')
          .setStyle(TextInputStyle.Short)
// ... (código existente) ...
          .setPlaceholder('Exemplo: 3')
          .setRequired(true);

        modal.addComponents(
// ... (código existente) ...
            new ActionRowBuilder().addComponents(membersInput),
            new ActionRowBuilder().addComponents(amountInput)
        );
        await interaction.showModal(modal);
      }

      // --- Botão: Puxar Membros (MUDADO - Foto 1) ---
      if (customId === 'push_members_button') { 
        // CORREÇÃO: Adicionado async/await
        const userCount = await dbWrapper.getUserCount();
        const modal = new ModalBuilder()
          .setCustomId('push_members_modal')
// ... (código existente) ...
          .setTitle('Solicitação de Push');
        
        const guildIdInput = new TextInputBuilder()
          .setCustomId('guild_id_input')
// ... (código existente) ...
          .setLabel('QUAL ID DO SERVIDOR DESEJA PUXAR?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Qual id do servidor deseja puxar? EX: 124...')
// ... (código existente) ...
          .setRequired(true);
        
        const amountInput = new TextInputBuilder()
          .setCustomId('amount_input')
// ... (código existente) ...
          .setLabel('QUAL QUANTIDADE DESEJA PUXAR?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Usuários disponíveis: ${userCount}`)
// ... (código existente) ...
          .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(guildIdInput),
// ... (código existente) ...
            new ActionRowBuilder().addComponents(amountInput)
        );
        await interaction.showModal(modal);
      }

      // --- Botões do Menu da Embed (Não mudam) ---
      if (customId === 'send_embed_button') {
        // ... (Modal de enviar não muda) ...
// ... (código existente) ...
        const modal = new ModalBuilder().setCustomId('send_embed_channel_modal').setTitle('Enviar Mensagem de Auth');
        const channelInput = new TextInputBuilder().setCustomId('channel_id_input').setLabel('ID do Canal para enviar').setPlaceholder('Ex: 108530...').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
// ... (código existente) ...
        await interaction.showModal(modal);
      }
      if (customId === 'reset_embed_button') {
        // CORREÇÃO: Adicionado async/await
        await dbWrapper.resetEmbedConfig(interaction.guildId);
        const newEmbed = await buildPreviewEmbed(null); // await
        await interaction.update({ content: 'Configuração da embed resetada.', embeds: [newEmbed] });
      }
    }

    // 3. Modal Submissions
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      // --- Modal: Configurar Servidor ---
      if (customId === 'config_server_modal') {
        await interaction.deferReply({ ephemeral: true });
        
// ... (código existente) ...
        const roleId = interaction.fields.getTextInputValue('role_id_input') || null;
        const webhookUrl = interaction.fields.getTextInputValue('webhook_url_input') || null;
        const mainGuildId = interaction.fields.getTextInputValue('main_guild_id_input');
// ... (código existente) ...
        
        if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
            return interaction.editReply('URL de Webhook inválida.');
        }

        try {
            await interaction.client.guilds.fetch(mainGuildId);
        } catch {
            return interaction.editReply('ID do Servidor Principal inválido.');
        }

        // CORREÇÃO: Adicionado async/await
        await dbWrapper.setConfig(interaction.guildId, roleId, webhookUrl);
        await dbWrapper.setMainGuild(mainGuildId);
        
        await interaction.editReply('Configurações salvas com sucesso!');
      }

      // --- Modal: Criar Gift ---
      if (customId === 'create_gift_modal_v2') {
        await interaction.deferReply({ ephemeral: true });

        const memberCount = parseInt(interaction.fields.getTextInputValue('member_count_input'));
        const amount = parseInt(interaction.fields.getTextInputValue('gift_amount_input'));
        // CORREÇÃO: Adicionado async/await
        const userCount = await dbWrapper.getUserCount();

        if (isNaN(memberCount) || isNaN(amount) || memberCount <= 0 || amount <= 0) {
// ... (código existente) ...
            return interaction.editReply({ content: 'Valores devem ser números maiores que zero.' });
        }
        if (amount > 20) {
            return interaction.editReply({ content: 'Você só pode gerar no máximo 20 links por vez.' });
        }
        if (memberCount > userCount) {
             return interaction.editReply({ content: `Você não tem membros suficientes. (Disponíveis: ${userCount})` });
        }

        const generatedLinks = [];
        for (let i = 0; i < amount; i++) {
            const code = crypto.randomBytes(8).toString('hex');
            try {
                // CORREÇÃO: Adicionado async/await
                await dbWrapper.createGift(code, memberCount, interaction.user.id);
                generatedLinks.push(`${baseUrl}/redeem/redeem/${code} - ${memberCount} Membro(s)`);
            } catch (error) { i--; } 
        }
        
        // Envia links na DM
        try {
            const dmChannel = await interaction.user.createDM();
// ... (código existente) ...
            await dmChannel.send(`**Seus Links de Gift Gerados:**\n\n${generatedLinks.join('\n')}`);
            await interaction.editReply({ content: `Sucesso! Enviei ${amount} link(s) para sua DM.` });
        } catch (error) {
// ... (código existente) ...
            console.error("Falha ao enviar DM:", error);
            await interaction.editReply({ content: 'Falha ao enviar DM. Verifique se suas DMs estão abertas.' });
        }
      }
      
      // --- Modal: Puxar Membros ---
      if (customId === 'push_members_modal') {
          await interaction.deferReply({ ephemeral: true });

          const guildId = interaction.fields.getTextInputValue('guild_id_input');
          const amount = parseInt(interaction.fields.getTextInputValue('amount_input'));
          // CORREÇÃO: Adicionado async/await
          const userCount = await dbWrapper.getUserCount();

          if (isNaN(amount) || amount <= 0) {
// ... (código existente) ...
               return interaction.editReply({ content: 'Quantidade inválida.' });
          }
          if (amount > userCount) {
               return interaction.editReply({ content: `Você não tem membros suficientes. (Disponíveis: ${userCount})` });
          }

          let guild;
          try {
              guild = await interaction.client.guilds.fetch(guildId);
          } catch {
              return interaction.editReply({ content: 'ID do Servidor inválido ou o bot não está nele.' });
          }

          // CORREÇÃO: Adicionado async/await
          const usersToPull = await dbWrapper.getRandomUsers(amount);
          let successCount = 0;
          let failCount = 0;

          // Aviso de processamento
// ... (código existente) ...
          await interaction.editReply(`Iniciando o push de ${amount} membros para ${guild.name}. Isso pode levar um tempo...`);

          for (const user of usersToPull) {
// ... (código existente) ...
              try {
                  await guild.members.add(user.user_id, {
                      accessToken: user.access_token
// ... (código existente) ...
                  });
                  successCount++;
              } catch (error) {
// ... (código existente) ...
                  failCount++;
              }
          }
          
          await interaction.followUp({ content: `Push concluído!\n\n✅ Sucesso: ${successCount}\n❌ Falha (tokens expirados/banido): ${failCount}`, ephemeral: true });
      }

      // --- Modais de Configuração da Embed ---
      if (customId.startsWith('embed_edit_modal_')) {
        const element = customId.replace('embed_edit_modal_', ''); 
        const value = interaction.fields.getTextInputValue('element_value_input');

        if (element === 'color' && value && !/^#[0-9A-F]{6}$/i.test(value)) {
// ... (código existente) ...
            await interaction.reply({ content: 'Cor inválida. Use o formato Hex (Ex: #5865F2)', ephemeral: true });
            return;
        }

        // CORREÇÃO: Adicionado async/await
        await dbWrapper.setEmbedConfigField(interaction.guildId, element, value || null);
        const config = await dbWrapper.getEmbedConfig(interaction.guildId);
        const newEmbed = await buildPreviewEmbed(config);
        
        await interaction.update({ embeds: [newEmbed] });
      }
      
      // --- Modal: Perguntando Canal para Enviar ---
      if (customId === 'send_embed_channel_modal') {
          await interaction.deferReply({ ephemeral: true });

          const channelId = interaction.fields.getTextInputValue('channel_id_input');
// ... (código existente) ...
          const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
          
          if (!channel || channel.type !== ChannelType.GuildText) {
// ... (código existente) ...
              return interaction.editReply('Canal de texto não encontrado ou inválido.');
          }

          // CORREÇÃO: Adicionado async/await
          const config = await dbWrapper.getEmbedConfig(interaction.guildId);
          const embed = new EmbedBuilder()
            .setTitle(config?.title || 'Verifique-se')
// ... (código existente) ...
            .setDescription(config?.description || 'Clique no botão abaixo para se verificar e ter acesso ao servidor.')
            .setColor(config?.color || '#5865F2');
          
          try {
// ... (código existente) ...
            if (config?.image_url) embed.setImage(config.image_url);
            if (config?.thumbnail_url) embed.setThumbnail(config.thumbnail_url);
          } catch(e) {/* Ignora */}

          const buttonText = config?.button_text || 'Verificar';

// ... (código existente) ...
          const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;
          
          const button = new ButtonBuilder()
            .setLabel(buttonText)
// ... (código existente) ...
            .setURL(oauthUrl)
            .setStyle(ButtonStyle.Link)
            .setEmoji('✅');
// ... (código existente) ...
          const row = new ActionRowBuilder().addComponents(button);

          try {
            await channel.send({ embeds: [embed], components: [row] });
// ... (código existente) ...
            await interaction.editReply(`Mensagem de autenticação enviada para ${channel}!`);
          } catch (e) {
            console.error(e);
            await interaction.editReply('Erro ao enviar mensagem. Verifique se eu tenho permissão para falar nesse canal.');
          }
      }
    }

    // 4. String Select Menu (Dropdown do editor de Embed)
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId === 'embed_element_select') {
        const elementToEdit = interaction.values[0]; 
        // CORREÇÃO: Adicionado async/await
        const config = await dbWrapper.getEmbedConfig(interaction.guildId) || {};
        
        const modal = new ModalBuilder()
          .setCustomId(`embed_edit_modal_${elementToEdit}`)
// ... (código existente) ...
          .setTitle(`Editar: ${elementToEdit.charAt(0).toUpperCase() + elementToEdit.slice(1)}`);
          
        const input = new TextInputBuilder()
          .setCustomId('element_value_input')
// ... (código existente) ...
          .setLabel('Novo valor (deixe vazio para remover)')
          .setStyle(elementToEdit === 'description' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setValue(config[elementToEdit] || '')
// ... (código existente) ...
          .setPlaceholder(elementToEdit === 'color' ? '#5865F2' : '...')
          .setRequired(false);
          
        modal.addComponents(new ActionRowBuilder().addComponents(input));
// ... (código existente) ...
        await interaction.showModal(modal);
      }
    }
  },
};