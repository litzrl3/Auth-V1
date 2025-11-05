const router = require('express').Router();
const axios = require('axios');
const { clientId, clientSecret, redirectUri, scopes } = require('../../../config.js');
const db = require('../../database/database.js');
const { WebhookClient, EmbedBuilder } = require('discord.js');
const botClient = require('../../bot/index.js'); // Importa o cliente do bot

// Esta é a rota de callback para onde o Discord redireciona o usuário
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Se não houver código, o usuário cancelou
  if (!code) {
    return res.redirect('/invalid-code.html?error=cancelled');
  }

  let isGift = false;
  let giftCode = null;

  // Verifica se é um resgate de gift
  if (state && state.startsWith('redeem_')) {
    giftCode = state.split('redeem_')[1];
    const gift = db.getGift(giftCode);

    if (!gift || gift.uses_remaining <= 0) {
      // Redireciona para página de código inválido
      return res.redirect('/invalid-code.html');
    }
    isGift = true;
  }

  try {
    // 1. Trocar o código por um Access Token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
      }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // 2. Obter informações do usuário
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    const user = userResponse.data; // { id, username, avatar, ... }

    // 3. Salvar usuário no banco de dados
    db.addUser(user.id, user.username, access_token, refresh_token);

    // 4. "Puxar" o membro para o servidor principal e adicionar o cargo
    const mainGuildId = db.getMainGuild()?.value;
    if (mainGuildId) {
      const config = db.getConfig(mainGuildId);
      const roleId = config?.verified_role_id;

      if (roleId) {
        try {
          // Adiciona o usuário ao servidor usando o access_token (scope 'guilds.join')
          await botClient.guilds.cache.get(mainGuildId)?.members.add(user.id, {
            accessToken: access_token,
            roles: [roleId]
          });

          // Se for um resgate de gift, usa o código
          if (isGift) {
            db.useGift(giftCode);
          }
          
          // 5. Enviar Log
          if (config.log_webhook_url) {
            const webhook = new WebhookClient({ url: config.log_webhook_url });
            const embed = new EmbedBuilder()
              .setTitle('✅ Novo Membro Verificado!')
              .setColor('#00FF00')
              .setDescription(`${user.username} (\`${user.id}\`) foi verificado com sucesso.`)
              .setThumbnail(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`)
              .addFields({ name: 'Tipo', value: isGift ? `Gift (\`${giftCode}\`)` : 'Verificação Padrão' })
              .setTimestamp();
            await webhook.send({ embeds: [embed] });
          }

        } catch (error) {
          console.error(`Erro ao adicionar membro ${user.username} ou cargo:`, error.message);
          // O usuário pode já estar no servidor, tente apenas adicionar o cargo
          try {
             const guild = await botClient.guilds.fetch(mainGuildId);
             const member = await guild.members.fetch(user.id);
             await member.roles.add(roleId);
          } catch (e) {
             console.error("Erro secundário ao tentar adicionar cargo:", e.message);
          }
        }
      }
    }

    // 6. Redirecionar para a página de sucesso
    res.redirect('/auth-success.html');

  } catch (error) {
    console.error("Erro no fluxo OAuth:", error.response?.data || error.message);
    res.status(500).send('Ocorreu um erro durante a autenticação.');
  }
});

module.exports = router;