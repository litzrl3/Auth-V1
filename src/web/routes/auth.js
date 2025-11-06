const router = require('express').Router();
const axios = require('axios'); // MUDADO: fetch não é nativo do commonjs, axios é mais simples
const { clientId, clientSecret, redirectUri, scopes } = require('../../../config.js');
const { dbWrapper } = require('../../database/database.js'); // MUDADO
const { WebhookClient, EmbedBuilder } = require('discord.js');
const botClient = require('../../bot/index.js');

// Rota de callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query; // 'state' NÃO está sendo usado, mas poderia ser para gifts

  if (!code) {
    return res.redirect('/invalid-code.html?error=cancelled');
  }

  // A lógica de gift foi movida para /redeem, então este é apenas o auth padrão
  
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

    const user = userResponse.data;

    // 3. Salvar usuário no banco de dados
    // CORREÇÃO: Adicionado async/await
    await dbWrapper.addUser(user.id, user.username, access_token, refresh_token);

    // 4. "Puxar" o membro para o servidor principal e adicionar o cargo
    // CORREÇÃO: Adicionado async/await e .value
    const mainGuildData = await dbWrapper.getMainGuild();
    const mainGuildId = mainGuildData?.value;
    
    if (mainGuildId) {
      // CORREÇÃO: Adicionado async/await
      const config = await dbWrapper.getConfig(mainGuildId);
      const roleId = config?.verified_role_id;

      // Adiciona o cargo mesmo se o usuário já estiver no servidor
      if (roleId) {
        try {
          const guild = await botClient.guilds.fetch(mainGuildId);
          const member = await guild.members.fetch(user.id).catch(() => null); // Tenta buscar

          if (member) {
            // Usuário já está no servidor, apenas adiciona o cargo
            await member.roles.add(roleId);
          } else {
            // Usuário não está no servidor, usa o 'guilds.join'
            await guild.members.add(user.id, {
              accessToken: access_token,
              roles: [roleId]
            });
          }
          
          // 5. Enviar Log
          if (config.log_webhook_url) {
            const webhook = new WebhookClient({ url: config.log_webhook_url });
            const embed = new EmbedBuilder()
              .setTitle('✅ Novo Membro Verificado!')
              .setColor('#00FF00')
              .setDescription(`${user.username} (\`${user.id}\`) foi verificado com sucesso.`)
              .setThumbnail(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`)
              .addFields({ name: 'Tipo', value: 'Verificação Padrão' })
              .setTimestamp();
            await webhook.send({ embeds: [embed] });
          }

        } catch (error) {
          console.error(`Erro ao adicionar membro ${user.username} ou cargo:`, error.message);
        }
      }
    }

    // 6. Redirecionar para a página de sucesso
    // (Ponto 2 da sua última solicitação)
    res.redirect('/auth-success.html');

  } catch (error) {
    console.error("Erro no fluxo OAuth:", error.response?.data || error.message);
    res.status(500).send('Ocorreu um erro durante a autenticação.');
  }
});

module.exports = router;