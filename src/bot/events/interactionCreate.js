const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');
const db = require('../../database/database.js');
const { clientId, redirectUri, scopes } = require('../../../config.js');
const crypto = require('crypto');
const client = require('../index.js'); // Importa o cliente

// --- FUNÇÕES AUXILIARES ---

// Constrói a embed de preview
function buildPreviewEmbed(config) {
    const embed = new EmbedBuilder()
        .setTitle(config?.title || 'Verifique-se')
        .setDescription(config?.description || 'Clique no botão abaixo para se verificar e ter acesso ao servidor.')
        .setColor(config?.color || '#5865F2')
        .setFooter({ text: 'PREVIEW - Esta é uma visualização.' });
    
    try {
        if (config?.image_url) embed.setImage(config.image_url);
        if (config?.thumbnail_url) embed.setThumbnail(config.thumbnail_url);
    } catch(e) {
        console.warn("URL de imagem/thumbnail inválida no preview:", e.message);
    }
    
    return embed;
}

// Envia a mensagem de configuração da embed (Foto 2)
async function sendEmbedConfigMenu(interaction) {
   const config = db.getEmbedConfig(interaction.guildId);
   const previewEmbed = buildPreviewEmbed(config);
   
   const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('embed_element_select')
      .setPlaceholder('Selecione um elemento da embed para editar')
      .addOptions(
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

// --- LÓGICA PRINCIPAL DE INTERAÇÕES ---

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    
    // 1. Chat Input Command (só /auth)
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'Houve um erro ao executar este comando!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Houve um erro ao executar este comando!', ephemeral: true });
        }
      }
      return;
    }

    // 2. Button Clicks
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // --- Botão: Configurar Servidor ---
      if (customId === 'config_server_button') {
        const config = db.getConfig(interaction.guildId) || {};
        const mainGuildId = db.getMainGuild()?.value || interaction.guildId;
        
        const modal = new ModalBuilder()
          .setCustomId('config_server_modal')
          .setTitle('Configurar Servidores');
        
        const mainGuildInput = new TextInputBuilder()
          .setCustomId('main_guild_id_input')
          .setLabel('ID do Servidor Principal (para puxar)')
          .setStyle(TextInputStyle.Short)
          .setValue(mainGuildId)
          .setRequired(true);

        const roleInput = new TextInputBuilder()
          .setCustomId('role_id_input')
          .setLabel('ID do Cargo de Verificado')
          .setStyle(TextInputStyle.Short)
          .setValue(config.verified_role_id || '')
          .setPlaceholder('Ex: 108530... (deixe em branco para não dar cargo)')
          .setRequired(false);

        const webhookInput = new TextInputBuilder()
          .setCustomId('webhook_url_input')
          .setLabel('URL do Webhook de Logs')
          .setStyle(TextInputStyle.Short)
          .setValue(config.log_webhook_url || '')
          .setPlaceholder('https://discord.com/api/webhooks/...')
          .setRequired(false);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(mainGuildInput),
            new ActionRowBuilder().addComponents(roleInput),
            new ActionRowBuilder().addComponents(webhookInput)
        );
        await interaction.showModal(modal);
      }

      // --- Botão: Configurar Mensagem ---
      if (customId === 'config_message_button') {
        await sendEmbedConfigMenu(interaction);
      }

      // --- Botão: Criar Gift ---
      if (customId === 'create_gift_button') {
        const modal = new ModalBuilder()
          .setCustomId('create_gift_modal')
          .setTitle('Criar Gift-Cards');
        
        const usesInput = new TextInputBuilder()
          .setCustomId('uses_input')
          .setLabel('Usos por Link')
          .setStyle(TextInputStyle.Short)
          .setValue('1')
          .setRequired(true);

        const amountInput = new TextInputBuilder()
          .setCustomId('amount_input')
          .setLabel('Quantidade de Links')
          .setStyle(TextInputStyle.Short)
          .setValue('1')
          .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(usesInput),
            new ActionRowBuilder().addComponents(amountInput)
        );
        await interaction.showModal(modal);
      }

      // --- Botão: Sincronizar Membros ---
      if (customId === 'sync_members_button') {
        await interaction.deferReply({ ephemeral: true });
        
        const mainGuildId = db.getMainGuild()?.value;
        if (!mainGuildId) {
            return interaction.editReply('Erro: Servidor principal não definido. Use `/config servidor`.');
        }
        const config = db.getConfig(mainGuildId);
        if (!config?.verified_role_id) {
            return interaction.editReply('Erro: Cargo de verificado não definido para o servidor principal.');
        }

        const guild = await client.guilds.fetch(mainGuildId);
        const role = await guild.roles.fetch(config.verified_role_id);
        if (!role) {
            return interaction.editReply('Erro: Cargo de verificado não encontrado no servidor.');
        }

        const usersInDb = db.getAllUsers();
        let addedCount = 0;
        let alreadyHadCount = 0;

        await guild.members.fetch(); // Cache de todos os membros

        for (const user of usersInDb) {
            const member = guild.members.cache.get(user.user_id);
            if (member) {
                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role);
                    addedCount++;
                } else {
                    alreadyHadCount++;
                }
            }
            // Nota: Puxar membros (guild.members.add) é complexo e requer
            // atualização de tokens (refresh tokens), o que foge do escopo
            // desta implementação simplificada. Isto apenas sincroniza quem JÁ ESTÁ no server.
        }
        
        await interaction.editReply(`Sincronização concluída!\n- ${addedCount} membros receberam o cargo.\n- ${alreadyHadCount} membros já tinham o cargo.`);
      }

      // --- Botões do Menu da Embed ---
      if (customId === 'send_embed_button') {
        const modal = new ModalBuilder()
          .setCustomId('send_embed_channel_modal')
          .setTitle('Enviar Mensagem de Auth');
        
        const channelInput = new TextInputBuilder()
          .setCustomId('channel_id_input')
          .setLabel('ID do Canal para enviar')
          .setPlaceholder('Ex: 108530...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
          
        modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
        await interaction.showModal(modal);
      }

      if (customId === 'reset_embed_button') {
        db.resetEmbedConfig(interaction.guildId);
        const newEmbed = buildPreviewEmbed(null); // Constrói com padrão
        await interaction.update({ content: 'Configuração da embed resetada.', embeds: [newEmbed] });
      }
    }

    // 3. Modal Submissions
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      // --- Modal: Configurar Servidor ---
      if (customId === 'config_server_modal') {
        await interaction.deferReply({ ephemeral: true });
        
        const roleId = interaction.fields.getTextInputValue('role_id_input') || null;
        const webhookUrl = interaction.fields.getTextInputValue('webhook_url_input') || null;
        const mainGuildId = interaction.fields.getTextInputValue('main_guild_id_input');
        
        // Validação
        if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
            return interaction.editReply('URL de Webhook inválida.');
        }

        try {
            await client.guilds.fetch(mainGuildId);
        } catch {
            return interaction.editReply('ID do Servidor Principal inválido.');
        }

        db.setConfig(interaction.guildId, roleId, webhookUrl);
        db.setMainGuild(mainGuildId);
        
        await interaction.editReply('Configurações salvas com sucesso!');
      }

      // --- Modal: Criar Gift ---
      if (customId === 'create_gift_modal') {
        await interaction.deferReply({ ephemeral: true });

        const uses = parseInt(interaction.fields.getTextInputValue('uses_input'));
        const amount = parseInt(interaction.fields.getTextInputValue('amount_input'));

        if (isNaN(uses) || isNaN(amount) || uses <= 0 || amount <= 0) {
            return interaction.editReply({ content: 'Valores devem ser números maiores que zero.' });
        }
        if (amount > 20) {
            return interaction.editReply({ content: 'Você só pode gerar no máximo 20 links por vez.' });
        }

        const generatedCodes = [];
        const { baseUrl } = require('../../../config.js');
        for (let i = 0; i < amount; i++) {
            const code = crypto.randomBytes(6).toString('hex');
            try {
                db.createGift(code, uses, interaction.user.id);
                generatedCodes.push(`${baseUrl}/redeem/${code}`);
            } catch (error) { i--; } // Tenta novamente
        }
        
        const replyMessage = `**Links de Gift Gerados (Usos: ${uses})**\n\n${generatedCodes.join('\n')}`;
        await interaction.editReply({ content: replyMessage.length > 2000 ? 'Muitos links gerados, resposta cortada.' : replyMessage });
      }

      // --- Modal: Perguntando elemento da Embed (ex: Título) ---
      if (customId.startsWith('embed_edit_modal_')) {
        const element = customId.replace('embed_edit_modal_', ''); // 'title', 'description', etc.
        const value = interaction.fields.getTextInputValue('element_value_input');

        if (element === 'color' && !/^#[0-9A-F]{6}$/i.test(value)) {
            await interaction.reply({ content: 'Cor inválida. Use o formato Hex (Ex: #5865F2)', ephemeral: true });
            return;
        }

        db.setEmbedConfigField(interaction.guildId, element, value);
        
        const config = db.getEmbedConfig(interaction.guildId);
        const newEmbed = buildPreviewEmbed(config);

        // Atualiza a mensagem de menu (que está no interaction.message)
        await interaction.update({ embeds: [newEmbed] });
      }
      
      // --- Modal: Perguntando Canal para Enviar ---
      if (customId === 'send_embed_channel_modal') {
          await interaction.deferReply({ ephemeral: true });

          const channelId = interaction.fields.getTextInputValue('channel_id_input');
          const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
          
          if (!channel || channel.type !== ChannelType.GuildText) {
              return interaction.editReply('Canal de texto não encontrado ou inválido.');
          }

          const config = db.getEmbedConfig(interaction.guildId);
          // Constrói a embed final (sem o footer de preview)
          const embed = new EmbedBuilder()
            .setTitle(config?.title || 'Verifique-se')
            .setDescription(config?.description || 'Clique no botão abaixo para se verificar e ter acesso ao servidor.')
            .setColor(config?.color || '#5865F2');
          
          try {
            if (config?.image_url) embed.setImage(config.image_url);
            if (config?.thumbnail_url) embed.setThumbnail(config.thumbnail_url);
          } catch(e) {/* Ignora URLs inválidas no envio final */}

          const buttonText = config?.button_text || 'Verificar';

          const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;
          
          const button = new ButtonBuilder()
            .setLabel(buttonText)
            .setURL(oauthUrl)
            .setStyle(ButtonStyle.Link)
            .setEmoji('✅');
          const row = new ActionRowBuilder().addComponents(button);

          await channel.send({ embeds: [embed], components: [row] });
          await interaction.editReply(`Mensagem de autenticação enviada para ${channel}!`);
      }
    }

    // 4. String Select Menu (Dropdown do editor de Embed)
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId === 'embed_element_select') {
        const elementToEdit = interaction.values[0]; // 'title', 'description', etc.
        const config = db.getEmbedConfig(interaction.guildId) || {};
        
        const modal = new ModalBuilder()
          .setCustomId(`embed_edit_modal_${elementToEdit}`)
          .setTitle(`Editar: ${elementToEdit.charAt(0).toUpperCase() + elementToEdit.slice(1)}`);
          
        const input = new TextInputBuilder()
          .setCustomId('element_value_input')
          .setLabel('Novo valor')
          .setStyle(elementToEdit === 'description' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setValue(config[elementToEdit] || '')
          .setPlaceholder(elementToEdit === 'color' ? '#5865F2' : '...')
          .setRequired(false);
          
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      }
    }
  },
};